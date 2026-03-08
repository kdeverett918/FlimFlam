#!/usr/bin/env python3
# ruff: noqa: S110,S608,T201
"""Zero-config mailbox + task bus for game development studio agents."""

from __future__ import annotations

import argparse
import copy
import json
import re
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from game_team_bus_context import (  # noqa: E402
    RuntimeContext,
    resolve_runtime_context,
    set_active_epic,
)

_CONFIG_PATH = Path(".codex") / "team_bus_config.json"
_THREAD_ID_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"),
    re.compile(r"^thd_[A-Za-z0-9_-]{8,}$"),
    re.compile(r"^thread_[A-Za-z0-9_-]{8,}$"),
)

_DEFAULT_CONFIG: dict[str, Any] = {
    "relay": {
        "director_role": "director",
        "create_director_copy": True,
        "message_type": "relay.dispatch",
        "default_max_attempts": 3,
        "base_backoff_seconds": 5,
        "max_backoff_seconds": 120,
        "retry_on_degraded_transport": True,
        "send_input_command": [
            "python3",
            ".codex/tools/game_team_bus_send_input.py",
            "--transport",
            "auto",
            "--agent-id",
            "{agent_id}",
            "--thread-id",
            "{thread_id}",
            "--role-map-path",
            "{role_map_path}",
            "--role",
            "{target_role}",
            "--message",
            "{message}",
            "--metadata-json",
            "{metadata_json}",
        ],
    },
    "broadcast": {
        "include_sender": False,
        "exclude_roles": ["default", "director"],
    },
    "groups": {
        "preprod_leads": [
            "engine_lead",
            "gameplay_lead",
            "art_director",
            "ux_designer",
            "qa_lead",
            "performance_lead",
            "audio_lead",
            "level_designer",
            "explorer",
        ],
        "production_core": [
            "developer",
            "tester",
            "build_watcher",
            "playtest_specialist",
        ],
        "review_gate": [
            "reviewer",
            "qa_lead",
            "polish_critic",
        ],
    },
    "sla": {
        "message_ack_seconds": 300,
        "task_stale_seconds": 900,
    },
    "role_validation": {
        "extra_roles": ["director"],
    },
    "message_schemas": {
        "task-handoff": {
            "required": ["task_id"],
            "properties": {
                "task_id": {"type": "string"},
                "stage": {"type": "string"},
                "artifact_paths": {"type": "array"},
            },
        },
        "inline-review": {
            "required": ["task_id", "result"],
            "properties": {
                "task_id": {"type": "string"},
                "result": {"type": "string", "enum": ["pass", "fail"]},
                "requested_fixes": {"type": "array"},
            },
        },
        "review-verdict": {
            "required": ["phase", "verdict"],
            "properties": {
                "phase": {"type": "string"},
                "verdict": {"type": "string", "enum": ["MERGE", "FIX", "BLOCK"]},
                "task_ids": {"type": "array"},
            },
        },
        "task-plan-ready": {
            "required": ["phase", "task_count"],
            "properties": {
                "phase": {"type": "string"},
                "task_count": {"type": "integer"},
            },
        },
    },
}

_MESSAGE_STATES = {"queued", "acked", "relayed", "done", "error", "dead_letter"}
_TASK_STATES = {"pending", "claimed", "done", "blocked"}
_PRIORITY_TO_INT = {"low": 0, "normal": 1, "high": 2}
_INT_TO_PRIORITY = {v: k for k, v in _PRIORITY_TO_INT.items()}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _utcnow_iso() -> str:
    return _utcnow().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _iso_after_hours(hours: int) -> str:
    return (_utcnow() + timedelta(hours=hours)).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def _parse_iso(value: str) -> datetime:
    text = str(value or "").strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return int(default)


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _parse_json_array(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if isinstance(parsed, list):
        return [str(item) for item in parsed]
    return []


def _parse_json_object(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw)
    except Exception:
        return {}
    if isinstance(parsed, dict):
        return parsed
    return {}


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_team_bus_config(repo_root: Path) -> dict[str, Any]:
    path = repo_root / _CONFIG_PATH
    if not path.exists():
        return copy.deepcopy(_DEFAULT_CONFIG)
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict):
            return _deep_merge(_DEFAULT_CONFIG, parsed)
    except Exception:
        pass
    return copy.deepcopy(_DEFAULT_CONFIG)


def discover_allowed_roles(repo_root: Path, config: dict[str, Any]) -> list[str]:
    roles: set[str] = set()
    agents_dir = repo_root / ".codex" / "agents"
    if agents_dir.exists():
        for file in agents_dir.glob("*.toml"):
            if file.stem:
                roles.add(file.stem)
    extra = config.get("role_validation", {}).get("extra_roles", [])
    if isinstance(extra, list):
        roles.update(str(r).strip() for r in extra if str(r).strip())
    return sorted(roles)


def _validate_role(role: str, allowed_roles: list[str], field_name: str) -> str:
    value = str(role or "").strip()
    if not value:
        raise RuntimeError(f"{field_name} cannot be empty")
    if allowed_roles and value not in allowed_roles:
        raise RuntimeError(
            f"invalid {field_name} `{value}`; allowed roles: {', '.join(sorted(allowed_roles))}"
        )
    return value


def _normalize_thread_id(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    for pattern in _THREAD_ID_PATTERNS:
        if pattern.match(text):
            return text
    return ""


def _parse_payload_arg(payload_arg: str) -> dict[str, Any]:
    raw = str(payload_arg or "").strip()
    if not raw:
        return {}
    text = raw
    if raw.startswith("@"):
        path = Path(raw[1:]).expanduser()
        if not path.exists():
            raise RuntimeError(f"payload file not found: {path}")
        text = path.read_text(encoding="utf-8")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid --payload-json: {exc}") from exc
    if not isinstance(parsed, dict):
        raise RuntimeError("--payload-json must decode to a JSON object")
    return parsed


def _value_matches_type(value: Any, expected_type: str) -> bool:
    expected = str(expected_type or "").strip().lower()
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return (isinstance(value, int) and not isinstance(value, bool)) or isinstance(value, float)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "null":
        return value is None
    return True


def _validate_payload_schema(
    message_type: str,
    payload: dict[str, Any],
    config: dict[str, Any],
) -> None:
    schemas = config.get("message_schemas", {})
    if not isinstance(schemas, dict):
        return
    schema = schemas.get(message_type)
    if not isinstance(schema, dict):
        return

    required = schema.get("required", [])
    if isinstance(required, list):
        missing = [key for key in required if key not in payload]
        if missing:
            raise RuntimeError(
                f"payload missing required fields for `{message_type}`: {', '.join(missing)}"
            )

    properties = schema.get("properties", {})
    if isinstance(properties, dict):
        for key, rules in properties.items():
            if key not in payload:
                continue
            if not isinstance(rules, dict):
                continue
            if "type" in rules and not _value_matches_type(payload[key], str(rules.get("type"))):
                raise RuntimeError(
                    f"payload field `{key}` must be `{rules.get('type')}` for `{message_type}`"
                )
            enum_values = rules.get("enum")
            if isinstance(enum_values, list) and payload[key] not in enum_values:
                raise RuntimeError(
                    f"payload field `{key}` must be one of {enum_values} for `{message_type}`"
                )

    additional = schema.get("additionalProperties", True)
    if additional is False and isinstance(properties, dict):
        unknown = [key for key in payload if key not in properties]
        if unknown:
            raise RuntimeError(
                f"payload has unsupported fields for `{message_type}`: {', '.join(unknown)}"
            )


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def _ensure_table_columns(conn: sqlite3.Connection, table: str, column_defs: list[str]) -> None:
    existing = {str(row["name"]) for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    for coldef in column_defs:
        colname = coldef.split()[0]
        if colname not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {coldef}")


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            from_role TEXT NOT NULL,
            to_role TEXT NOT NULL,
            message_type TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 1,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            payload_json TEXT NOT NULL DEFAULT '{}',
            artifact_paths_json TEXT NOT NULL DEFAULT '[]',
            dedupe_key TEXT,
            status TEXT NOT NULL DEFAULT 'queued',
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            acked_at TEXT,
            note TEXT,
            delivery_attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL DEFAULT 3,
            next_attempt_at TEXT,
            last_error TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_run_dedupe
            ON messages (run_id, dedupe_key)
            WHERE dedupe_key IS NOT NULL AND dedupe_key != '';
        CREATE INDEX IF NOT EXISTS idx_messages_inbox
            ON messages (run_id, to_role, status, created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_expiry
            ON messages (run_id, expires_at);
        CREATE INDEX IF NOT EXISTS idx_messages_next_attempt
            ON messages (run_id, to_role, status, next_attempt_at);

        CREATE TABLE IF NOT EXISTS tasks (
            run_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            owner_role TEXT,
            state TEXT NOT NULL DEFAULT 'pending',
            priority INTEGER NOT NULL DEFAULT 1,
            depends_on_json TEXT NOT NULL DEFAULT '[]',
            claim_token TEXT,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (run_id, task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_state
            ON tasks (run_id, state, priority, updated_at);

        CREATE TABLE IF NOT EXISTS dead_letter_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            from_role TEXT NOT NULL,
            to_role TEXT NOT NULL,
            message_type TEXT NOT NULL,
            priority INTEGER NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            artifact_paths_json TEXT NOT NULL,
            dedupe_key TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            acked_at TEXT,
            note TEXT,
            delivery_attempts INTEGER NOT NULL,
            max_attempts INTEGER NOT NULL,
            next_attempt_at TEXT,
            last_error TEXT,
            dead_lettered_at TEXT NOT NULL,
            dead_letter_reason TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_dead_letter_run
            ON dead_letter_messages (run_id, dead_lettered_at);

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_run_time
            ON events (run_id, created_at);
        """
    )

    _ensure_table_columns(
        conn,
        "messages",
        [
            "payload_json TEXT NOT NULL DEFAULT '{}'",
            "delivery_attempts INTEGER NOT NULL DEFAULT 0",
            "max_attempts INTEGER NOT NULL DEFAULT 3",
            "next_attempt_at TEXT",
            "last_error TEXT",
        ],
    )
    _ensure_table_columns(conn, "tasks", ["priority INTEGER NOT NULL DEFAULT 1"])

    conn.execute("UPDATE messages SET payload_json='{}' WHERE payload_json IS NULL OR payload_json=''")
    conn.execute(
        "UPDATE messages SET next_attempt_at = created_at WHERE next_attempt_at IS NULL OR next_attempt_at=''"
    )
    conn.execute(
        "UPDATE messages SET delivery_attempts = 0 WHERE delivery_attempts IS NULL OR delivery_attempts < 0"
    )
    conn.execute(
        "UPDATE messages SET max_attempts = 3 WHERE max_attempts IS NULL OR max_attempts < 1"
    )
    conn.execute("UPDATE tasks SET priority = 1 WHERE priority IS NULL OR priority < 0")


def _append_event_log(ctx: RuntimeContext, event_type: str, payload: dict[str, Any]) -> None:
    entry = {
        "created_at": _utcnow_iso(),
        "event_type": event_type,
        "run_id": ctx.run_id,
        "payload": payload,
    }
    with ctx.events_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False, sort_keys=True) + "\n")


def _prune_jsonl_file(path: Path, cutoff: datetime) -> int:
    if not path.exists():
        return 0

    kept: list[str] = []
    removed = 0
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except Exception:
            kept.append(raw_line)
            continue
        created_at = str(parsed.get("created_at") or "").strip()
        if not created_at:
            kept.append(raw_line)
            continue
        try:
            created_dt = _parse_iso(created_at)
        except Exception:
            kept.append(raw_line)
            continue
        if created_dt < cutoff:
            removed += 1
            continue
        kept.append(raw_line)

    next_text = "".join(f"{line}\n" for line in kept)
    path.write_text(next_text, encoding="utf-8")
    return removed


def _record_event(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    event_type: str,
    entity_type: str,
    entity_id: str,
    payload: dict[str, Any],
) -> None:
    created_at = _utcnow_iso()
    conn.execute(
        """
        INSERT INTO events (run_id, event_type, entity_type, entity_id, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (ctx.run_id, event_type, entity_type, entity_id, _json_text(payload), created_at),
    )
    _append_event_log(ctx, event_type, payload)


def _move_to_dead_letter(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    row: sqlite3.Row,
    reason: str,
) -> None:
    now = _utcnow_iso()
    conn.execute(
        """
        INSERT INTO dead_letter_messages (
            run_id, message_id, from_role, to_role, message_type, priority,
            subject, body, payload_json, artifact_paths_json, dedupe_key, status,
            created_at, expires_at, updated_at, acked_at, note, delivery_attempts,
            max_attempts, next_attempt_at, last_error, dead_lettered_at, dead_letter_reason
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        """,
        (
            str(row["run_id"]),
            str(row["id"]),
            str(row["from_role"]),
            str(row["to_role"]),
            str(row["message_type"]),
            _safe_int(row["priority"], 1),
            str(row["subject"]),
            str(row["body"]),
            str(row["payload_json"] or "{}"),
            str(row["artifact_paths_json"] or "[]"),
            str(row["dedupe_key"] or ""),
            "dead_letter",
            str(row["created_at"]),
            str(row["expires_at"]),
            now,
            str(row["acked_at"] or ""),
            str(row["note"] or ""),
            _safe_int(row["delivery_attempts"], 0),
            _safe_int(row["max_attempts"], 3),
            str(row["next_attempt_at"] or ""),
            str(row["last_error"] or ""),
            now,
            reason,
        ),
    )
    conn.execute(
        """
        UPDATE messages
        SET status = 'dead_letter', updated_at = ?, note = COALESCE(?, note)
        WHERE run_id = ? AND id = ?
        """,
        (now, reason, ctx.run_id, str(row["id"])),
    )
    _record_event(
        conn,
        ctx,
        event_type="message.dead_letter",
        entity_type="message",
        entity_id=str(row["id"]),
        payload={"reason": reason},
    )


def open_bus(explicit_epic_slug: str | None) -> tuple[RuntimeContext, sqlite3.Connection]:
    ctx = resolve_runtime_context(explicit_epic_slug=explicit_epic_slug)
    conn = _connect(ctx.db_path)
    _init_schema(conn)
    conn.commit()
    return ctx, conn


def _print_json(payload: dict[str, Any] | list[dict[str, Any]]) -> int:
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def cmd_set_active(args: argparse.Namespace) -> int:
    marker = set_active_epic(args.epic_slug)
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    with _connect(ctx.db_path) as conn:
        _init_schema(conn)
    return _print_json(
        {
            "ok": True,
            "active_epic_path": str(marker),
            "epic_slug": ctx.epic_slug,
            "run_id": ctx.run_id,
            "bus_dir": str(ctx.bus_dir),
        }
    )


def cmd_context(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    return _print_json(
        {
            "ok": True,
            "repo_root": str(ctx.repo_root),
            "epic_slug": ctx.epic_slug,
            "run_id": ctx.run_id,
            "run_dir": str(ctx.run_dir),
            "bus_dir": str(ctx.bus_dir),
            "db_path": str(ctx.db_path),
            "events_path": str(ctx.events_path),
            "allowed_roles": allowed_roles,
            "groups": config.get("groups", {}),
        }
    )


def cmd_init(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    registry_path = _agent_registry_path(ctx)
    cleared_agent_registry = False
    if not bool(args.keep_agent_registry):
        _write_agent_registry(registry_path, {})
        cleared_agent_registry = True
    with conn:
        _record_event(
            conn,
            ctx,
            event_type="bus.init",
            entity_type="bus",
            entity_id=ctx.run_id,
            payload={
                "epic_slug": ctx.epic_slug,
                "run_id": ctx.run_id,
                "agent_registry_cleared": cleared_agent_registry,
            },
        )
    conn.close()
    return _print_json(
        {
            "ok": True,
            "epic_slug": ctx.epic_slug,
            "run_id": ctx.run_id,
            "db_path": str(ctx.db_path),
            "agent_registry_path": str(registry_path),
            "agent_registry_cleared": cleared_agent_registry,
        }
    )


def _insert_message(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    from_role: str,
    to_role: str,
    message_type: str,
    priority: str,
    subject: str,
    body: str,
    payload: dict[str, Any],
    artifact_paths: list[str],
    dedupe_key: str,
    ttl_hours: int,
    max_attempts: int,
    status: str = "queued",
    next_attempt_at: str | None = None,
) -> dict[str, Any]:
    now = _utcnow_iso()
    dedupe = dedupe_key.strip()
    if dedupe:
        row = conn.execute(
            "SELECT id, status FROM messages WHERE run_id = ? AND dedupe_key = ?",
            (ctx.run_id, dedupe),
        ).fetchone()
        if row:
            message_id = str(row["id"])
            payload_out = {
                "ok": True,
                "deduped": True,
                "message_id": message_id,
                "status": str(row["status"]),
                "to_role": to_role,
            }
            _record_event(
                conn,
                ctx,
                event_type="message.deduped",
                entity_type="message",
                entity_id=message_id,
                payload=payload_out,
            )
            return payload_out

    message_id = str(uuid.uuid4())
    record = {
        "id": message_id,
        "run_id": ctx.run_id,
        "from_role": from_role.strip(),
        "to_role": to_role.strip(),
        "message_type": message_type.strip(),
        "priority": _PRIORITY_TO_INT[priority],
        "subject": subject.strip(),
        "body": body.strip(),
        "payload_json": _json_text(payload),
        "artifact_paths_json": _json_text(artifact_paths),
        "dedupe_key": dedupe or None,
        "status": status,
        "created_at": now,
        "expires_at": _iso_after_hours(ttl_hours),
        "updated_at": now,
        "delivery_attempts": 0,
        "max_attempts": max(1, int(max_attempts)),
        "next_attempt_at": next_attempt_at or now,
        "last_error": None,
    }
    conn.execute(
        """
        INSERT INTO messages (
            id, run_id, from_role, to_role, message_type, priority, subject, body, payload_json,
            artifact_paths_json, dedupe_key, status, created_at, expires_at, updated_at,
            delivery_attempts, max_attempts, next_attempt_at, last_error
        ) VALUES (
            :id, :run_id, :from_role, :to_role, :message_type, :priority, :subject, :body, :payload_json,
            :artifact_paths_json, :dedupe_key, :status, :created_at, :expires_at, :updated_at,
            :delivery_attempts, :max_attempts, :next_attempt_at, :last_error
        )
        """,
        record,
    )
    payload_out = {
        "ok": True,
        "deduped": False,
        "message_id": message_id,
        "status": record["status"],
        "to_role": record["to_role"],
    }
    _record_event(
        conn,
        ctx,
        event_type="message.published",
        entity_type="message",
        entity_id=message_id,
        payload={
            "from_role": record["from_role"],
            "to_role": record["to_role"],
            "message_type": record["message_type"],
            "subject": record["subject"],
            "priority": priority,
            "dedupe_key": dedupe,
        },
    )
    return payload_out


def _resolve_recipient_roles(
    args: argparse.Namespace,
    *,
    config: dict[str, Any],
    allowed_roles: list[str],
    from_role: str,
) -> list[str]:
    selected_count = int(bool(args.to_role)) + int(bool(args.to_group)) + int(bool(args.broadcast))
    if selected_count != 1:
        raise RuntimeError("exactly one of --to-role, --to-group, or --broadcast is required")

    recipients: list[str] = []
    if args.to_role:
        recipients = [str(args.to_role).strip()]
    elif args.to_group:
        groups = config.get("groups", {})
        if not isinstance(groups, dict) or args.to_group not in groups:
            raise RuntimeError(f"unknown group `{args.to_group}`")
        raw_group = groups.get(args.to_group)
        if not isinstance(raw_group, list):
            raise RuntimeError(f"group `{args.to_group}` must be a list")
        recipients = [str(role).strip() for role in raw_group if str(role).strip()]
    else:
        recipients = list(allowed_roles)
        broadcast_cfg = config.get("broadcast", {})
        include_sender = bool(broadcast_cfg.get("include_sender", False))
        excludes = {
            str(role).strip()
            for role in broadcast_cfg.get("exclude_roles", [])
            if str(role).strip()
        }
        if not include_sender:
            excludes.add(from_role)
        recipients = [role for role in recipients if role not in excludes]

    deduped: list[str] = []
    seen: set[str] = set()
    for role in recipients:
        if role in seen:
            continue
        seen.add(role)
        deduped.append(role)

    for role in deduped:
        _validate_role(role, allowed_roles, "recipient role")
    if not deduped:
        raise RuntimeError("no recipients resolved")
    return deduped


def cmd_publish(args: argparse.Namespace) -> int:
    ttl_hours = max(1, int(args.ttl_hours))
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    from_role = _validate_role(args.from_role, allowed_roles, "--from-role")
    recipients = _resolve_recipient_roles(
        args,
        config=config,
        allowed_roles=allowed_roles,
        from_role=from_role,
    )

    payload = _parse_payload_arg(args.payload_json or "")
    _validate_payload_schema(args.message_type, payload, config)
    artifact_paths = [str(Path(p)) for p in (args.artifact_path or [])]
    relay_cfg = config.get("relay", {})
    relay_enabled = bool(relay_cfg.get("create_director_copy", True) and not args.no_relay_copy)
    director_role = str(relay_cfg.get("director_role") or "director")
    relay_type = str(relay_cfg.get("message_type") or "relay.dispatch")
    relay_default_attempts = max(1, _safe_int(relay_cfg.get("default_max_attempts"), 3))
    requested_attempts = _safe_int(args.max_attempts, 0)
    effective_max_attempts = relay_default_attempts if requested_attempts <= 0 else max(1, requested_attempts)

    published: list[dict[str, Any]] = []
    relay_copies: list[dict[str, Any]] = []
    with conn:
        for recipient in recipients:
            dedupe_key = str(args.dedupe_key or "").strip()
            scoped_dedupe = f"{dedupe_key}::{recipient}" if dedupe_key else ""
            created = _insert_message(
                conn,
                ctx,
                from_role=from_role,
                to_role=recipient,
                message_type=args.message_type,
                priority=args.priority,
                subject=args.subject,
                body=args.body,
                payload=payload,
                artifact_paths=artifact_paths,
                dedupe_key=scoped_dedupe,
                ttl_hours=ttl_hours,
                max_attempts=effective_max_attempts,
            )
            published.append(
                {
                    "message_id": created["message_id"],
                    "to_role": recipient,
                    "deduped": bool(created["deduped"]),
                }
            )
            if bool(created["deduped"]):
                continue

            if relay_enabled and recipient != director_role:
                relay_payload = {
                    "target_role": recipient,
                    "source_message_id": created["message_id"],
                    "source_message_type": args.message_type,
                    "source_subject": args.subject,
                    "source_body": args.body,
                    "source_payload": payload,
                    "artifact_paths": artifact_paths,
                }
                relay_created = _insert_message(
                    conn,
                    ctx,
                    from_role=from_role,
                    to_role=director_role,
                    message_type=relay_type,
                    priority=args.priority,
                    subject=f"relay:{args.subject}",
                    body=args.body,
                    payload=relay_payload,
                    artifact_paths=artifact_paths,
                    dedupe_key=f"relay::{created['message_id']}",
                    ttl_hours=ttl_hours,
                    max_attempts=effective_max_attempts,
                )
                relay_copies.append(
                    {
                        "relay_message_id": relay_created["message_id"],
                        "target_role": recipient,
                        "source_message_id": created["message_id"],
                        "deduped": bool(relay_created["deduped"]),
                    }
                )

    conn.close()
    return _print_json(
        {
            "ok": True,
            "from_role": from_role,
            "message_type": args.message_type,
            "recipient_count": len(recipients),
            "published": published,
            "relay_copies": relay_copies,
        }
    )


def _query_inbox_rows(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    role: str,
    status_filter: str,
    include_expired: bool,
    limit: int,
    message_type: str,
) -> list[sqlite3.Row]:
    statuses: list[str] = []
    if status_filter.strip().lower() != "all":
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]
        for status in statuses:
            if status not in _MESSAGE_STATES:
                raise RuntimeError(f"invalid status `{status}`")

    query = ["SELECT * FROM messages WHERE run_id = ? AND to_role = ?"]
    params: list[Any] = [ctx.run_id, role]
    if statuses:
        placeholders = ",".join("?" for _ in statuses)
        query.append(f"AND status IN ({placeholders})")
        params.extend(statuses)
    if not include_expired:
        query.append("AND expires_at > ?")
        params.append(_utcnow_iso())
    if message_type:
        query.append("AND message_type = ?")
        params.append(message_type)
    query.append("ORDER BY priority DESC, created_at ASC LIMIT ?")
    params.append(max(1, int(limit)))
    return conn.execute("\n".join(query), params).fetchall()


def _message_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "run_id": str(row["run_id"]),
        "from_role": str(row["from_role"]),
        "to_role": str(row["to_role"]),
        "message_type": str(row["message_type"]),
        "priority": _INT_TO_PRIORITY.get(_safe_int(row["priority"], 1), "normal"),
        "subject": str(row["subject"]),
        "body": str(row["body"]),
        "payload": _parse_json_object(str(row["payload_json"] or "{}")),
        "artifact_paths": _parse_json_array(str(row["artifact_paths_json"])),
        "dedupe_key": str(row["dedupe_key"] or ""),
        "status": str(row["status"]),
        "created_at": str(row["created_at"]),
        "expires_at": str(row["expires_at"]),
        "updated_at": str(row["updated_at"]),
        "acked_at": str(row["acked_at"] or ""),
        "note": str(row["note"] or ""),
        "delivery_attempts": _safe_int(row["delivery_attempts"], 0),
        "max_attempts": _safe_int(row["max_attempts"], 3),
        "next_attempt_at": str(row["next_attempt_at"] or ""),
        "last_error": str(row["last_error"] or ""),
    }


def cmd_inbox(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")
    rows = _query_inbox_rows(
        conn,
        ctx,
        role=role,
        status_filter=args.status,
        include_expired=bool(args.include_expired),
        limit=max(1, int(args.limit)),
        message_type=str(args.message_type or "").strip(),
    )
    conn.close()
    return _print_json([_message_row_to_dict(row) for row in rows])


def cmd_ack(args: argparse.Namespace) -> int:
    status = str(args.status or "").strip()
    if status not in _MESSAGE_STATES:
        raise RuntimeError(f"invalid status `{status}`")
    ctx, conn = open_bus(args.epic_slug)
    now = _utcnow_iso()
    with conn:
        row = conn.execute(
            "SELECT id FROM messages WHERE run_id = ? AND id = ?",
            (ctx.run_id, args.message_id),
        ).fetchone()
        if not row:
            raise RuntimeError(f"message not found: {args.message_id}")

        conn.execute(
            """
            UPDATE messages
            SET status = ?, updated_at = ?, acked_at = ?, note = COALESCE(?, note)
            WHERE run_id = ? AND id = ?
            """,
            (status, now, now, (args.note or "").strip() or None, ctx.run_id, args.message_id),
        )
        _record_event(
            conn,
            ctx,
            event_type="message.acked",
            entity_type="message",
            entity_id=args.message_id,
            payload={"status": status, "note": args.note or ""},
        )
    conn.close()
    return _print_json({"ok": True, "message_id": args.message_id, "status": status})


def _upsert_task(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    task_id: str,
    owner_role: str,
    state: str,
    priority: int,
    depends_on: list[str],
    note: str,
) -> dict[str, Any]:
    now = _utcnow_iso()
    task_key = task_id.strip()
    if not task_key:
        raise RuntimeError("task_id cannot be empty")
    if state not in _TASK_STATES:
        raise RuntimeError(f"invalid task state `{state}`")
    task_priority = max(0, int(priority))

    existing = conn.execute(
        "SELECT created_at FROM tasks WHERE run_id = ? AND task_id = ?",
        (ctx.run_id, task_key),
    ).fetchone()
    created_at = str(existing["created_at"]) if existing else now

    conn.execute(
        """
        INSERT INTO tasks (
            run_id, task_id, owner_role, state, priority, depends_on_json, claim_token, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(run_id, task_id) DO UPDATE SET
            owner_role = excluded.owner_role,
            state = excluded.state,
            priority = excluded.priority,
            depends_on_json = excluded.depends_on_json,
            note = excluded.note,
            updated_at = excluded.updated_at
        """,
        (
            ctx.run_id,
            task_key,
            owner_role.strip() or None,
            state,
            task_priority,
            _json_text(depends_on),
            note.strip() or None,
            created_at,
            now,
        ),
    )
    return {
        "ok": True,
        "task_id": task_key,
        "state": state,
        "owner_role": owner_role.strip(),
        "priority": task_priority,
        "depends_on": depends_on,
    }


def cmd_upsert_task(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    owner_role = str(args.owner_role or "").strip()
    if owner_role:
        owner_role = _validate_role(owner_role, allowed_roles, "--owner-role")
    depends_on = [d.strip() for d in (args.depends_on or []) if d.strip()]

    with conn:
        payload = _upsert_task(
            conn,
            ctx,
            task_id=args.task_id,
            owner_role=owner_role,
            state=str(args.state or "pending"),
            priority=_safe_int(args.priority, 1),
            depends_on=depends_on,
            note=args.note or "",
        )
        _record_event(
            conn,
            ctx,
            event_type="task.upserted",
            entity_type="task",
            entity_id=args.task_id.strip(),
            payload=payload,
        )
    conn.close()
    return _print_json(payload)


def _task_blocking_dependencies(conn: sqlite3.Connection, ctx: RuntimeContext, row: sqlite3.Row) -> list[str]:
    depends_on = _parse_json_array(str(row["depends_on_json"] or "[]"))
    if not depends_on:
        return []
    placeholders = ",".join("?" for _ in depends_on)
    dep_rows = conn.execute(
        f"""
        SELECT task_id, state FROM tasks
        WHERE run_id = ? AND task_id IN ({placeholders})
        """,
        [ctx.run_id, *depends_on],
    ).fetchall()
    states = {str(dep["task_id"]): str(dep["state"]) for dep in dep_rows}
    return [dep for dep in depends_on if states.get(dep) != "done"]


def _claim_task(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    task_id: str,
    role: str,
    create_if_missing: bool,
) -> dict[str, Any]:
    now = _utcnow_iso()
    task_key = task_id.strip()
    role_name = role.strip()
    if not task_key or not role_name:
        raise RuntimeError("task_id and role are required")

    conn.execute("BEGIN IMMEDIATE")
    try:
        row = conn.execute(
            "SELECT * FROM tasks WHERE run_id = ? AND task_id = ?",
            (ctx.run_id, task_key),
        ).fetchone()
        if row is None and create_if_missing:
            conn.execute(
                """
                INSERT INTO tasks (
                    run_id, task_id, owner_role, state, priority, depends_on_json, claim_token, note, created_at, updated_at
                ) VALUES (?, ?, NULL, 'pending', 1, '[]', NULL, NULL, ?, ?)
                """,
                (ctx.run_id, task_key, now, now),
            )
            row = conn.execute(
                "SELECT * FROM tasks WHERE run_id = ? AND task_id = ?",
                (ctx.run_id, task_key),
            ).fetchone()

        if row is None:
            conn.execute("COMMIT")
            return {"ok": False, "claimed": False, "task_id": task_key, "reason": "missing"}

        state = str(row["state"])
        if state not in {"pending", "claimed"}:
            conn.execute("COMMIT")
            return {
                "ok": True,
                "claimed": False,
                "task_id": task_key,
                "reason": f"state={state}",
            }

        blocking = _task_blocking_dependencies(conn, ctx, row)
        if blocking:
            conn.execute("COMMIT")
            return {
                "ok": True,
                "claimed": False,
                "task_id": task_key,
                "reason": "blocked",
                "blocking": blocking,
            }

        owner = str(row["owner_role"] or "").strip()
        if state == "claimed" and owner and owner != role_name:
            conn.execute("COMMIT")
            return {
                "ok": True,
                "claimed": False,
                "task_id": task_key,
                "reason": f"owned-by:{owner}",
            }

        token = str(uuid.uuid4())
        conn.execute(
            """
            UPDATE tasks
            SET owner_role = ?, state = 'claimed', claim_token = ?, updated_at = ?
            WHERE run_id = ? AND task_id = ?
            """,
            (role_name, token, now, ctx.run_id, task_key),
        )
        conn.execute("COMMIT")
        return {
            "ok": True,
            "claimed": True,
            "task_id": task_key,
            "owner_role": role_name,
            "claim_token": token,
        }
    except Exception:
        conn.execute("ROLLBACK")
        raise


def _claim_next_task(conn: sqlite3.Connection, ctx: RuntimeContext, role: str) -> dict[str, Any]:
    now = _utcnow_iso()
    role_name = role.strip()
    if not role_name:
        raise RuntimeError("role is required")

    conn.execute("BEGIN IMMEDIATE")
    try:
        candidates = conn.execute(
            """
            SELECT * FROM tasks
            WHERE run_id = ? AND state = 'pending'
            ORDER BY priority DESC, created_at ASC
            """,
            (ctx.run_id,),
        ).fetchall()
        for row in candidates:
            blocking = _task_blocking_dependencies(conn, ctx, row)
            if blocking:
                continue
            task_id = str(row["task_id"])
            token = str(uuid.uuid4())
            cursor = conn.execute(
                """
                UPDATE tasks
                SET owner_role = ?, state = 'claimed', claim_token = ?, updated_at = ?
                WHERE run_id = ? AND task_id = ? AND state = 'pending'
                """,
                (role_name, token, now, ctx.run_id, task_id),
            )
            if int(cursor.rowcount or 0) <= 0:
                continue
            conn.execute("COMMIT")
            return {
                "ok": True,
                "claimed": True,
                "task_id": task_id,
                "owner_role": role_name,
                "claim_token": token,
                "priority": _safe_int(row["priority"], 1),
            }
        conn.execute("COMMIT")
        return {"ok": True, "claimed": False, "reason": "none-available"}
    except Exception:
        conn.execute("ROLLBACK")
        raise


def cmd_claim_task(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")
    payload = _claim_task(
        conn,
        ctx,
        task_id=args.task_id,
        role=role,
        create_if_missing=bool(args.create_if_missing),
    )
    with conn:
        _record_event(
            conn,
            ctx,
            event_type="task.claimed" if payload.get("claimed") else "task.claim-rejected",
            entity_type="task",
            entity_id=args.task_id.strip(),
            payload=payload,
        )
    conn.close()
    return _print_json(payload)


def cmd_claim_next(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")
    payload = _claim_next_task(conn, ctx, role)
    with conn:
        _record_event(
            conn,
            ctx,
            event_type="task.claim-next" if payload.get("claimed") else "task.claim-next-empty",
            entity_type="task",
            entity_id=str(payload.get("task_id") or "none"),
            payload=payload,
        )
    conn.close()
    return _print_json(payload)


def cmd_complete_task(args: argparse.Namespace) -> int:
    state = str(args.state or "").strip().lower()
    if state not in {"done", "blocked"}:
        raise RuntimeError("--state must be done or blocked")
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")
    now = _utcnow_iso()
    with conn:
        row = conn.execute(
            "SELECT owner_role, state FROM tasks WHERE run_id = ? AND task_id = ?",
            (ctx.run_id, args.task_id),
        ).fetchone()
        if not row:
            raise RuntimeError(f"task not found: {args.task_id}")
        owner = str(row["owner_role"] or "").strip()
        if owner and owner != role:
            raise RuntimeError(f"task `{args.task_id}` owned by `{owner}`; `{role}` cannot complete it")

        conn.execute(
            """
            UPDATE tasks
            SET state = ?, note = COALESCE(?, note), updated_at = ?
            WHERE run_id = ? AND task_id = ?
            """,
            (state, (args.note or "").strip() or None, now, ctx.run_id, args.task_id),
        )
        payload = {"ok": True, "task_id": args.task_id, "state": state, "role": role}
        _record_event(
            conn,
            ctx,
            event_type="task.completed" if state == "done" else "task.blocked",
            entity_type="task",
            entity_id=args.task_id,
            payload=payload,
        )
    conn.close()
    return _print_json(payload)


def _compute_message_role_stats(rows: list[sqlite3.Row], now: datetime) -> dict[str, Any]:
    by_role: dict[str, dict[str, Any]] = {}
    for row in rows:
        role = str(row["to_role"])
        slot = by_role.setdefault(
            role,
            {
                "queued_count": 0,
                "oldest_age_seconds": 0,
                "oldest_created_at": "",
            },
        )
        slot["queued_count"] += 1
        age = int(max((now - _parse_iso(str(row["created_at"]))).total_seconds(), 0))
        if age > int(slot["oldest_age_seconds"]):
            slot["oldest_age_seconds"] = age
            slot["oldest_created_at"] = str(row["created_at"])
    return by_role


def _compute_task_role_stats(rows: list[sqlite3.Row], now: datetime) -> dict[str, Any]:
    by_role: dict[str, dict[str, Any]] = {}
    for row in rows:
        role = str(row["owner_role"] or "unowned")
        slot = by_role.setdefault(
            role,
            {
                "active_count": 0,
                "oldest_age_seconds": 0,
                "oldest_updated_at": "",
            },
        )
        slot["active_count"] += 1
        age = int(max((now - _parse_iso(str(row["updated_at"]))).total_seconds(), 0))
        if age > int(slot["oldest_age_seconds"]):
            slot["oldest_age_seconds"] = age
            slot["oldest_updated_at"] = str(row["updated_at"])
    return by_role


def _build_alerts(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    message_ack_seconds: int,
    task_stale_seconds: int,
) -> dict[str, Any]:
    now = _utcnow()
    now_iso = _utcnow_iso()
    msg_rows = conn.execute(
        """
        SELECT * FROM messages
        WHERE run_id = ? AND status = 'queued' AND expires_at > ?
        """,
        (ctx.run_id, now_iso),
    ).fetchall()
    task_rows = conn.execute(
        """
        SELECT * FROM tasks
        WHERE run_id = ? AND state IN ('pending', 'claimed')
        """,
        (ctx.run_id,),
    ).fetchall()

    stale_messages: list[dict[str, Any]] = []
    for row in msg_rows:
        age = int(max((now - _parse_iso(str(row["created_at"]))).total_seconds(), 0))
        if age >= message_ack_seconds:
            stale_messages.append(
                {
                    "message_id": str(row["id"]),
                    "to_role": str(row["to_role"]),
                    "age_seconds": age,
                    "created_at": str(row["created_at"]),
                    "subject": str(row["subject"]),
                }
            )

    stale_tasks: list[dict[str, Any]] = []
    for row in task_rows:
        age = int(max((now - _parse_iso(str(row["updated_at"]))).total_seconds(), 0))
        if age >= task_stale_seconds:
            stale_tasks.append(
                {
                    "task_id": str(row["task_id"]),
                    "state": str(row["state"]),
                    "owner_role": str(row["owner_role"] or "unowned"),
                    "age_seconds": age,
                    "updated_at": str(row["updated_at"]),
                }
            )

    stale_messages_by_role: dict[str, dict[str, Any]] = {}
    for item in stale_messages:
        role = str(item["to_role"])
        slot = stale_messages_by_role.setdefault(
            role,
            {"count": 0, "oldest_age_seconds": 0},
        )
        slot["count"] += 1
        age = _safe_int(item.get("age_seconds"), 0)
        if age > _safe_int(slot["oldest_age_seconds"], 0):
            slot["oldest_age_seconds"] = age

    stale_tasks_by_role: dict[str, dict[str, Any]] = {}
    for item in stale_tasks:
        role = str(item["owner_role"])
        slot = stale_tasks_by_role.setdefault(
            role,
            {"count": 0, "oldest_age_seconds": 0},
        )
        slot["count"] += 1
        age = _safe_int(item.get("age_seconds"), 0)
        if age > _safe_int(slot["oldest_age_seconds"], 0):
            slot["oldest_age_seconds"] = age

    return {
        "ok": True,
        "epic_slug": ctx.epic_slug,
        "run_id": ctx.run_id,
        "thresholds": {
            "message_ack_seconds": message_ack_seconds,
            "task_stale_seconds": task_stale_seconds,
        },
        "stale_messages": stale_messages,
        "stale_messages_by_role": stale_messages_by_role,
        "stale_tasks": stale_tasks,
        "stale_tasks_by_role": stale_tasks_by_role,
    }


def cmd_stats(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    now = _utcnow()
    now_iso = _utcnow_iso()
    msg_rows = conn.execute(
        """
        SELECT * FROM messages
        WHERE run_id = ? AND status = 'queued' AND expires_at > ?
        ORDER BY created_at ASC
        """,
        (ctx.run_id, now_iso),
    ).fetchall()
    task_rows = conn.execute(
        """
        SELECT * FROM tasks
        WHERE run_id = ? AND state IN ('pending', 'claimed')
        ORDER BY updated_at ASC
        """,
        (ctx.run_id,),
    ).fetchall()
    dead_rows = conn.execute(
        "SELECT COUNT(*) AS n FROM dead_letter_messages WHERE run_id = ?",
        (ctx.run_id,),
    ).fetchone()
    conn.close()

    if args.by_role:
        return _print_json(
            {
                "ok": True,
                "epic_slug": ctx.epic_slug,
                "run_id": ctx.run_id,
                "messages_by_role": _compute_message_role_stats(msg_rows, now),
                "tasks_by_role": _compute_task_role_stats(task_rows, now),
                "dead_letter_count": int((dead_rows or {"n": 0})["n"]),
            }
        )

    msg_status_rows = {}
    task_state_rows = {}
    for row in msg_rows:
        key = str(row["status"])
        msg_status_rows[key] = msg_status_rows.get(key, 0) + 1
    for row in task_rows:
        key = str(row["state"])
        task_state_rows[key] = task_state_rows.get(key, 0) + 1
    return _print_json(
        {
            "ok": True,
            "epic_slug": ctx.epic_slug,
            "run_id": ctx.run_id,
            "queue_depth": len(msg_rows),
            "active_task_count": len(task_rows),
            "messages_by_status": msg_status_rows,
            "tasks_by_state": task_state_rows,
            "dead_letter_count": int((dead_rows or {"n": 0})["n"]),
        }
    )


def cmd_alerts(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    message_ack_seconds = max(
        1,
        int(
            args.message_ack_seconds
            if args.message_ack_seconds is not None
            else _safe_int(config.get("sla", {}).get("message_ack_seconds"), 300)
        ),
    )
    task_stale_seconds = max(
        1,
        int(
            args.task_stale_seconds
            if args.task_stale_seconds is not None
            else _safe_int(config.get("sla", {}).get("task_stale_seconds"), 900)
        ),
    )
    with conn:
        payload = _build_alerts(
            conn,
            ctx,
            message_ack_seconds=message_ack_seconds,
            task_stale_seconds=task_stale_seconds,
        )
        if payload["stale_messages"] or payload["stale_tasks"]:
            _record_event(
                conn,
                ctx,
                event_type="sla.alert",
                entity_type="bus",
                entity_id=ctx.run_id,
                payload={
                    "stale_message_count": len(payload["stale_messages"]),
                    "stale_task_count": len(payload["stale_tasks"]),
                },
            )
    conn.close()
    return _print_json(payload)


def cmd_metrics(args: argparse.Namespace) -> int:
    proxy = argparse.Namespace(epic_slug=args.epic_slug, by_role=False)
    return cmd_stats(proxy)


def cmd_dead_letters(args: argparse.Namespace) -> int:
    ctx, conn = open_bus(args.epic_slug)
    rows = conn.execute(
        """
        SELECT * FROM dead_letter_messages
        WHERE run_id = ?
        ORDER BY dead_lettered_at DESC
        LIMIT ?
        """,
        (ctx.run_id, max(1, int(args.limit))),
    ).fetchall()
    conn.close()
    out = []
    for row in rows:
        out.append(
            {
                "message_id": str(row["message_id"]),
                "to_role": str(row["to_role"]),
                "from_role": str(row["from_role"]),
                "message_type": str(row["message_type"]),
                "delivery_attempts": _safe_int(row["delivery_attempts"], 0),
                "max_attempts": _safe_int(row["max_attempts"], 0),
                "last_error": str(row["last_error"] or ""),
                "dead_letter_reason": str(row["dead_letter_reason"] or ""),
                "dead_lettered_at": str(row["dead_lettered_at"]),
            }
        )
    return _print_json({"ok": True, "items": out})


def cmd_gc(args: argparse.Namespace) -> int:
    retention_hours = max(1, int(args.retention_hours))
    cutoff_dt = (_utcnow() - timedelta(hours=retention_hours)).replace(microsecond=0)
    cutoff = cutoff_dt.isoformat().replace("+00:00", "Z")
    ctx, conn = open_bus(args.epic_slug)
    now = _utcnow_iso()
    with conn:
        expired = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE run_id = ? AND expires_at <= ?",
            (ctx.run_id, now),
        ).fetchone()
        conn.execute("DELETE FROM messages WHERE run_id = ? AND expires_at <= ?", (ctx.run_id, now))

        old_events = conn.execute(
            "SELECT COUNT(*) AS n FROM events WHERE run_id = ? AND created_at < ?",
            (ctx.run_id, cutoff),
        ).fetchone()
        conn.execute("DELETE FROM events WHERE run_id = ? AND created_at < ?", (ctx.run_id, cutoff))

        old_dead = conn.execute(
            "SELECT COUNT(*) AS n FROM dead_letter_messages WHERE run_id = ? AND dead_lettered_at < ?",
            (ctx.run_id, cutoff),
        ).fetchone()
        conn.execute(
            "DELETE FROM dead_letter_messages WHERE run_id = ? AND dead_lettered_at < ?",
            (ctx.run_id, cutoff),
        )
        pruned_event_log_lines = _prune_jsonl_file(ctx.events_path, cutoff_dt)
        pruned_delivery_log_lines = _prune_jsonl_file(ctx.bus_dir / "deliveries.jsonl", cutoff_dt)
        payload = {
            "ok": True,
            "expired_messages_deleted": int((expired or {"n": 0})["n"]),
            "old_events_deleted": int((old_events or {"n": 0})["n"]),
            "old_dead_letters_deleted": int((old_dead or {"n": 0})["n"]),
            "event_log_lines_deleted": pruned_event_log_lines,
            "delivery_log_lines_deleted": pruned_delivery_log_lines,
            "retention_hours": retention_hours,
        }
        _record_event(conn, ctx, "bus.gc", "bus", ctx.run_id, payload)
    conn.close()
    return _print_json(payload)


def cmd_groups(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    groups = config.get("groups", {})
    return _print_json({"ok": True, "groups": groups if isinstance(groups, dict) else {}})


def _agent_registry_path(ctx: RuntimeContext) -> Path:
    return ctx.bus_dir / "agent_registry.json"


def _load_agent_registry(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}
    raw_roles = parsed.get("roles") if isinstance(parsed.get("roles"), dict) else parsed
    if not isinstance(raw_roles, dict):
        return {}
    out: dict[str, dict[str, str]] = {}
    for raw_role, raw_value in raw_roles.items():
        role = str(raw_role).strip()
        if not role:
            continue
        if isinstance(raw_value, str):
            out[role] = {"agent_id": raw_value.strip(), "thread_id": ""}
            continue
        if isinstance(raw_value, dict):
            out[role] = {
                "agent_id": str(raw_value.get("agent_id") or raw_value.get("agentId") or "").strip(),
                "thread_id": _normalize_thread_id(
                    raw_value.get("thread_id") or raw_value.get("threadId") or ""
                ),
            }
    return out


def _write_agent_registry(path: Path, roles: dict[str, dict[str, str]]) -> None:
    normalized_roles: dict[str, dict[str, str]] = {}
    for raw_role, raw_route in roles.items():
        role = str(raw_role or "").strip()
        if not role:
            continue
        route = raw_route if isinstance(raw_route, dict) else {}
        normalized_roles[role] = {
            "agent_id": str(route.get("agent_id") or "").strip(),
            "thread_id": _normalize_thread_id(route.get("thread_id") or ""),
        }
    payload = {"roles": normalized_roles}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def cmd_register_agent(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")

    registry_path = _agent_registry_path(ctx)
    roles = _load_agent_registry(registry_path)
    if bool(args.clear):
        existed = role in roles
        roles.pop(role, None)
        _write_agent_registry(registry_path, roles)
        return _print_json(
            {
                "ok": True,
                "cleared": True,
                "role": role,
                "existed": existed,
                "registry_path": str(registry_path),
            }
        )

    agent_id = str(args.agent_id or "").strip()
    raw_thread_id = str(args.thread_id or "").strip()
    thread_id = _normalize_thread_id(raw_thread_id)
    if raw_thread_id and not thread_id:
        raise RuntimeError(
            "--thread-id must be a valid Codex thread id (UUID-like or thd_/thread_ token)"
        )
    if not agent_id and not thread_id:
        raise RuntimeError("provide --agent-id and/or --thread-id, or use --clear")
    current = roles.get(role, {"agent_id": "", "thread_id": ""})
    if agent_id:
        current["agent_id"] = agent_id
    if thread_id:
        current["thread_id"] = thread_id
    roles[role] = current
    _write_agent_registry(registry_path, roles)
    return _print_json(
        {
            "ok": True,
            "role": role,
            "entry": current,
            "registry_path": str(registry_path),
        }
    )


def cmd_agents(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    registry_path = _agent_registry_path(ctx)
    roles = _load_agent_registry(registry_path)

    if str(args.role or "").strip():
        role = _validate_role(args.role, allowed_roles, "--role")
        return _print_json(
            {
                "ok": True,
                "role": role,
                "entry": roles.get(role, {"agent_id": "", "thread_id": ""}),
                "registry_path": str(registry_path),
            }
        )

    return _print_json({"ok": True, "roles": roles, "registry_path": str(registry_path)})


def cmd_transport_preflight(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")

    registry_path = (
        Path(args.role_map_path).expanduser()
        if str(args.role_map_path or "").strip()
        else _agent_registry_path(ctx)
    )
    routes = _load_agent_registry(registry_path)
    route = routes.get(role, {"agent_id": "", "thread_id": ""})
    agent_id = str(args.agent_id or "").strip() or str(route.get("agent_id") or "").strip()
    thread_id = _normalize_thread_id(args.thread_id or "") or _normalize_thread_id(
        route.get("thread_id") or ""
    )
    if not thread_id:
        raise RuntimeError(
            f"no valid thread_id mapping for role `{role}`; run register-agent --role {role} --thread-id <thread_id>"
        )

    text = str(args.message or "").strip()
    if not text:
        text = f"[preflight] team-bus codex-thread transport check ({ctx.epic_slug})"
    metadata = {
        "preflight": True,
        "role": role,
        "run_id": ctx.run_id,
        "created_at": _utcnow_iso(),
    }

    command = [
        sys.executable,
        ".codex/tools/game_team_bus_send_input.py",
        "--epic-slug",
        ctx.epic_slug,
        "--transport",
        "codex-thread",
        "--role",
        role,
        "--thread-id",
        thread_id,
        "--role-map-path",
        str(registry_path),
        "--message",
        text,
        "--metadata-json",
        json.dumps(metadata, ensure_ascii=False, sort_keys=True),
        "--app-server-timeout-seconds",
        str(max(1, int(args.timeout_seconds))),
    ]
    if agent_id:
        command.extend(["--agent-id", agent_id])

    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        cwd=str(ctx.repo_root),
    )
    stdout = str(completed.stdout or "").strip()
    stderr = str(completed.stderr or "").strip()
    if completed.returncode != 0:
        detail = stderr or stdout or f"exit={completed.returncode}"
        raise RuntimeError(f"transport preflight failed for role `{role}`: {detail}")

    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"transport preflight returned invalid JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("transport preflight returned non-object JSON")
    if str(payload.get("transport") or "").strip().lower() != "codex-thread":
        raise RuntimeError(f"transport preflight did not use codex-thread: {payload}")
    if not bool(payload.get("ok")):
        raise RuntimeError(f"transport preflight returned degraded status: {payload}")

    return _print_json(
        {
            "ok": True,
            "role": role,
            "thread_id": thread_id,
            "agent_id": agent_id,
            "registry_path": str(registry_path),
            "result": payload,
        }
    )


def cmd_watch(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    config = load_team_bus_config(ctx.repo_root)
    allowed_roles = discover_allowed_roles(ctx.repo_root, config)
    role = _validate_role(args.role, allowed_roles, "--role")
    auto_ack_status = str(args.auto_ack_status or "").strip()
    if auto_ack_status and auto_ack_status not in _MESSAGE_STATES:
        raise RuntimeError(f"invalid --auto-ack-status `{auto_ack_status}`")
    auto_ack_note = str(args.auto_ack_note or "").strip()
    iterations = int(args.iterations)
    if iterations < 0:
        raise RuntimeError("--iterations must be >= 0")
    seen: set[str] = set()
    loop_count = 0
    while True:
        conn = _connect(ctx.db_path)
        _init_schema(conn)
        rows = _query_inbox_rows(
            conn,
            ctx,
            role=role,
            status_filter=args.status,
            include_expired=bool(args.include_expired),
            limit=max(1, int(args.limit)),
            message_type=str(args.message_type or "").strip(),
        )
        fresh = []
        fresh_ids: list[str] = []
        for row in rows:
            mid = str(row["id"])
            if mid in seen:
                continue
            seen.add(mid)
            fresh.append(_message_row_to_dict(row))
            fresh_ids.append(mid)
        auto_acked: list[str] = []
        if auto_ack_status and fresh_ids:
            now = _utcnow_iso()
            with conn:
                for mid in fresh_ids:
                    conn.execute(
                        """
                        UPDATE messages
                        SET status = ?, updated_at = ?, acked_at = ?, note = COALESCE(?, note)
                        WHERE run_id = ? AND id = ?
                        """,
                        (auto_ack_status, now, now, auto_ack_note or None, ctx.run_id, mid),
                    )
                    _record_event(
                        conn,
                        ctx,
                        event_type="message.acked",
                        entity_type="message",
                        entity_id=mid,
                        payload={"status": auto_ack_status, "note": auto_ack_note},
                    )
                    auto_acked.append(mid)
        conn.close()
        print(
            json.dumps(
                {
                    "iteration": loop_count + 1,
                    "new_messages": fresh,
                    "auto_ack_status": auto_ack_status,
                    "auto_acked": auto_acked,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        loop_count += 1
        if iterations and loop_count >= iterations:
            return 0
        time.sleep(max(0.05, float(args.poll_seconds)))


def _read_last_lines(path: Path, lines: int) -> list[str]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as fh:
        content = fh.readlines()
    if lines <= 0:
        return content
    return content[-lines:]


def cmd_tail(args: argparse.Namespace) -> int:
    ctx = resolve_runtime_context(explicit_epic_slug=args.epic_slug)
    iterations = int(args.iterations)
    if iterations < 0:
        raise RuntimeError("--iterations must be >= 0")
    lines = _read_last_lines(ctx.events_path, max(0, int(args.lines)))
    for line in lines:
        print(line.rstrip("\n"))
    if not args.follow:
        return 0

    loop_count = 0
    with ctx.events_path.open("a+", encoding="utf-8") as fh:
        fh.seek(0, 2)
        while True:
            line = fh.readline()
            if line:
                print(line.rstrip("\n"))
                continue
            time.sleep(max(0.05, float(args.poll_seconds)))
            loop_count += 1
            if iterations and loop_count >= iterations:
                return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Zero-config game studio mailbox and task bus.")
    sub = parser.add_subparsers(dest="command", required=True)

    set_active = sub.add_parser("set-active", help="Set active epic slug for this workspace.")
    set_active.add_argument("--epic-slug", required=True)
    set_active.set_defaults(func=cmd_set_active)

    context_cmd = sub.add_parser("context", help="Show resolved team bus context.")
    context_cmd.add_argument("--epic-slug", default="")
    context_cmd.set_defaults(func=cmd_context)

    init = sub.add_parser("init", help="Initialize bus schema and emit init event.")
    init.add_argument("--epic-slug", default="")
    init.add_argument(
        "--keep-agent-registry",
        action="store_true",
        help="Keep existing agent thread mappings instead of resetting at epic init.",
    )
    init.set_defaults(func=cmd_init)

    groups = sub.add_parser("groups", help="List configured recipient groups.")
    groups.add_argument("--epic-slug", default="")
    groups.set_defaults(func=cmd_groups)

    register_agent = sub.add_parser(
        "register-agent",
        help="Register or clear role routing metadata (agent_id/thread_id) for live transport.",
    )
    register_agent.add_argument("--epic-slug", default="")
    register_agent.add_argument("--role", required=True)
    register_agent.add_argument("--agent-id", default="")
    register_agent.add_argument("--thread-id", default="")
    register_agent.add_argument("--clear", action="store_true")
    register_agent.set_defaults(func=cmd_register_agent)

    agents = sub.add_parser("agents", help="List registered role routing metadata.")
    agents.add_argument("--epic-slug", default="")
    agents.add_argument("--role", default="")
    agents.set_defaults(func=cmd_agents)

    transport_preflight = sub.add_parser(
        "transport-preflight",
        help="Verify live codex-thread transport for a role by sending a preflight ping.",
    )
    transport_preflight.add_argument("--epic-slug", default="")
    transport_preflight.add_argument("--role", required=True)
    transport_preflight.add_argument("--thread-id", default="")
    transport_preflight.add_argument("--agent-id", default="")
    transport_preflight.add_argument("--role-map-path", default="")
    transport_preflight.add_argument("--timeout-seconds", type=int, default=20)
    transport_preflight.add_argument("--message", default="")
    transport_preflight.set_defaults(func=cmd_transport_preflight)

    publish = sub.add_parser("publish", help="Publish message(s) into mailbox.")
    publish.add_argument("--epic-slug", default="")
    publish.add_argument("--from-role", required=True)
    destination = publish.add_mutually_exclusive_group(required=False)
    destination.add_argument("--to-role")
    destination.add_argument("--to-group")
    destination.add_argument("--broadcast", action="store_true")
    publish.add_argument("--type", dest="message_type", required=True)
    publish.add_argument("--priority", choices=sorted(_PRIORITY_TO_INT), default="normal")
    publish.add_argument("--subject", required=True)
    publish.add_argument("--body", required=True)
    publish.add_argument("--payload-json", default="")
    publish.add_argument("--artifact-path", action="append", default=[])
    publish.add_argument("--dedupe-key", default="")
    publish.add_argument("--ttl-hours", type=int, default=48)
    publish.add_argument("--max-attempts", type=int, default=0)
    publish.add_argument("--no-relay-copy", action="store_true")
    publish.set_defaults(func=cmd_publish)

    inbox = sub.add_parser("inbox", help="Read inbox messages for a role.")
    inbox.add_argument("--epic-slug", default="")
    inbox.add_argument("--role", required=True)
    inbox.add_argument("--status", default="queued")
    inbox.add_argument("--limit", type=int, default=50)
    inbox.add_argument("--message-type", default="")
    inbox.add_argument("--include-expired", action="store_true")
    inbox.set_defaults(func=cmd_inbox)

    ack = sub.add_parser("ack", help="Acknowledge/update message status.")
    ack.add_argument("--epic-slug", default="")
    ack.add_argument("--message-id", required=True)
    ack.add_argument("--status", required=True)
    ack.add_argument("--note", default="")
    ack.set_defaults(func=cmd_ack)

    upsert_task = sub.add_parser("upsert-task", help="Create or update a task row.")
    upsert_task.add_argument("--epic-slug", default="")
    upsert_task.add_argument("--task-id", required=True)
    upsert_task.add_argument("--owner-role", default="")
    upsert_task.add_argument("--state", default="pending")
    upsert_task.add_argument("--priority", type=int, default=1)
    upsert_task.add_argument("--depends-on", action="append", default=[])
    upsert_task.add_argument("--note", default="")
    upsert_task.set_defaults(func=cmd_upsert_task)

    claim_task = sub.add_parser("claim-task", help="Claim a task if unblocked.")
    claim_task.add_argument("--epic-slug", default="")
    claim_task.add_argument("--task-id", required=True)
    claim_task.add_argument("--role", required=True)
    claim_task.add_argument("--create-if-missing", action="store_true")
    claim_task.set_defaults(func=cmd_claim_task)

    claim_next = sub.add_parser(
        "claim-next", help="Claim highest-priority unblocked pending task atomically."
    )
    claim_next.add_argument("--epic-slug", default="")
    claim_next.add_argument("--role", required=True)
    claim_next.set_defaults(func=cmd_claim_next)

    complete_task = sub.add_parser("complete-task", help="Complete or block a claimed task.")
    complete_task.add_argument("--epic-slug", default="")
    complete_task.add_argument("--task-id", required=True)
    complete_task.add_argument("--role", required=True)
    complete_task.add_argument("--state", default="done")
    complete_task.add_argument("--note", default="")
    complete_task.set_defaults(func=cmd_complete_task)

    metrics = sub.add_parser("metrics", help="Compatibility alias for global stats.")
    metrics.add_argument("--epic-slug", default="")
    metrics.set_defaults(func=cmd_metrics)

    stats = sub.add_parser("stats", help="Queue/task metrics.")
    stats.add_argument("--epic-slug", default="")
    stats.add_argument("--by-role", action="store_true")
    stats.set_defaults(func=cmd_stats)

    alerts = sub.add_parser("alerts", help="Check ack/task stale SLA breaches.")
    alerts.add_argument("--epic-slug", default="")
    alerts.add_argument("--message-ack-seconds", type=int, default=None)
    alerts.add_argument("--task-stale-seconds", type=int, default=None)
    alerts.set_defaults(func=cmd_alerts)

    dead_letters = sub.add_parser("dead-letters", help="List dead-letter messages.")
    dead_letters.add_argument("--epic-slug", default="")
    dead_letters.add_argument("--limit", type=int, default=100)
    dead_letters.set_defaults(func=cmd_dead_letters)

    watch = sub.add_parser("watch", help="Poll role inbox and print new messages.")
    watch.add_argument("--epic-slug", default="")
    watch.add_argument("--role", required=True)
    watch.add_argument("--status", default="queued")
    watch.add_argument("--limit", type=int, default=50)
    watch.add_argument("--message-type", default="")
    watch.add_argument("--include-expired", action="store_true")
    watch.add_argument("--auto-ack-status", default="")
    watch.add_argument("--auto-ack-note", default="")
    watch.add_argument("--poll-seconds", type=float, default=1.0)
    watch.add_argument("--iterations", type=int, default=0)
    watch.set_defaults(func=cmd_watch)

    tail = sub.add_parser("tail", help="Print bus events jsonl tail.")
    tail.add_argument("--epic-slug", default="")
    tail.add_argument("--lines", type=int, default=20)
    tail.add_argument("--follow", action="store_true")
    tail.add_argument("--poll-seconds", type=float, default=1.0)
    tail.add_argument("--iterations", type=int, default=0)
    tail.set_defaults(func=cmd_tail)

    gc = sub.add_parser("gc", help="Delete expired messages and old telemetry.")
    gc.add_argument("--epic-slug", default="")
    gc.add_argument("--retention-hours", type=int, default=168)
    gc.set_defaults(func=cmd_gc)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if hasattr(args, "epic_slug") and isinstance(args.epic_slug, str):
        args.epic_slug = args.epic_slug.strip() or None
    try:
        return int(args.func(args))
    except RuntimeError as exc:
        print(f"[game-team-bus] {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
