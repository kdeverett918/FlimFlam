#!/usr/bin/env python3
# ruff: noqa: B904,S603,T201
"""Director relay worker for near-real-time team-bus delivery."""

from __future__ import annotations

import argparse
import json
import re
import shlex
import sqlite3
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

import game_team_bus as team_bus  # noqa: E402
from game_team_bus_context import RuntimeContext  # noqa: E402

_THREAD_ID_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"),
    re.compile(r"^thd_[A-Za-z0-9_-]{8,}$"),
    re.compile(r"^thread_[A-Za-z0-9_-]{8,}$"),
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _utcnow_iso() -> str:
    return _utcnow().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return int(default)


def _parse_json_object(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(str(raw or "").strip() or "{}")
    except Exception:
        return {}
    if isinstance(parsed, dict):
        return parsed
    return {}


def _log_event(ctx: RuntimeContext, event_type: str, payload: dict[str, Any]) -> None:
    entry = {
        "created_at": _utcnow_iso(),
        "event_type": event_type,
        "run_id": ctx.run_id,
        "payload": payload,
    }
    with ctx.events_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False, sort_keys=True) + "\n")


def _record_event(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
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
        (ctx.run_id, event_type, entity_type, entity_id, json.dumps(payload, sort_keys=True), created_at),
    )
    _log_event(ctx, event_type, payload)


class _FormatValues(dict[str, str]):
    def __missing__(self, key: str) -> str:
        return ""


def _normalize_thread_id(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    for pattern in _THREAD_ID_PATTERNS:
        if pattern.match(text):
            return text
    return ""


def _normalize_route_entry(value: Any) -> dict[str, str]:
    if isinstance(value, str):
        return {"agent_id": value.strip(), "thread_id": ""}
    if not isinstance(value, dict):
        return {"agent_id": "", "thread_id": ""}
    return {
        "agent_id": str(value.get("agent_id") or value.get("agentId") or "").strip(),
        "thread_id": _normalize_thread_id(value.get("thread_id") or value.get("threadId") or ""),
    }


def _load_role_map(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}
    raw_roles: Any = parsed.get("roles", parsed)
    if not isinstance(raw_roles, dict):
        return {}
    out: dict[str, dict[str, str]] = {}
    for raw_role, raw_value in raw_roles.items():
        role = str(raw_role).strip()
        if not role:
            continue
        out[role] = _normalize_route_entry(raw_value)
    return out


def _resolve_agent_id(
    payload: dict[str, Any], role_map: dict[str, dict[str, str]], target_role: str
) -> str:
    explicit = str(payload.get("target_agent_id") or "").strip()
    if explicit:
        return explicit
    route = role_map.get(target_role, {})
    return str(route.get("agent_id") or "").strip()


def _resolve_thread_id(
    payload: dict[str, Any], role_map: dict[str, dict[str, str]], target_role: str
) -> str:
    explicit = _normalize_thread_id(payload.get("target_thread_id") or "")
    if explicit:
        return explicit
    route = role_map.get(target_role, {})
    return _normalize_thread_id(route.get("thread_id") or "")


def _is_stale_thread_failure(reason: str) -> bool:
    text = str(reason or "").strip().lower()
    if not text:
        return False
    markers = (
        "thread not found",
        "unknown thread",
        "thread/read failed",
        "thread/resume failed",
        "invalid thread",
    )
    return any(marker in text for marker in markers)


def _clear_stale_thread_route(
    *,
    role_map_path: Path,
    role_map: dict[str, dict[str, str]],
    target_role: str,
    requested_thread_id: str,
) -> bool:
    route = role_map.get(target_role)
    if not route:
        return False
    current_thread_id = _normalize_thread_id(route.get("thread_id") or "")
    if not current_thread_id:
        return False
    if requested_thread_id and requested_thread_id != current_thread_id:
        return False

    updated_route = {
        "agent_id": str(route.get("agent_id") or "").strip(),
        "thread_id": "",
    }
    role_map[target_role] = updated_route

    payload: dict[str, Any]
    if role_map_path.exists():
        try:
            parsed = json.loads(role_map_path.read_text(encoding="utf-8"))
            payload = parsed if isinstance(parsed, dict) else {}
        except Exception:
            payload = {}
    else:
        payload = {}

    raw_roles: dict[str, Any]
    raw_roles_candidate = payload.get("roles")
    if isinstance(raw_roles_candidate, dict):
        raw_roles = raw_roles_candidate
    elif isinstance(payload, dict):
        raw_roles = payload
    else:
        payload = {}
        raw_roles = payload

    existing_entry = raw_roles.get(target_role)
    if isinstance(existing_entry, str):
        raw_roles[target_role] = {"agent_id": existing_entry.strip(), "thread_id": ""}
    elif isinstance(existing_entry, dict):
        existing_entry["thread_id"] = ""
        if "threadId" in existing_entry:
            existing_entry["threadId"] = ""
        if "agent_id" not in existing_entry:
            existing_entry["agent_id"] = str(updated_route["agent_id"])
    else:
        raw_roles[target_role] = updated_route

    if isinstance(raw_roles_candidate, dict):
        payload["roles"] = raw_roles
    elif raw_roles is not payload:
        payload = {"roles": raw_roles}

    role_map_path.parent.mkdir(parents=True, exist_ok=True)
    role_map_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return True


def _build_command(template: list[str], values: dict[str, str]) -> list[str]:
    fmt = _FormatValues(values)
    out: list[str] = []
    for token in template:
        out.append(str(token).format_map(fmt))
    return out


def _load_due_relay_messages(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    director_role: str,
    message_type: str,
    limit: int,
) -> list[sqlite3.Row]:
    now_iso = _utcnow_iso()
    return conn.execute(
        """
        SELECT *
        FROM messages
        WHERE run_id = ?
          AND to_role = ?
          AND (
                status = 'queued'
             OR (status = 'acked' AND (acked_at IS NULL OR acked_at = ''))
          )
          AND message_type = ?
          AND expires_at > ?
          AND (next_attempt_at IS NULL OR next_attempt_at = '' OR next_attempt_at <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
        """,
        (ctx.run_id, director_role, message_type, now_iso, now_iso, max(1, int(limit))),
    ).fetchall()


def _claim_for_delivery(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    message_id: str,
    lease_seconds: int,
) -> bool:
    now_dt = _utcnow()
    now = now_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    lease_until = (
        (now_dt + timedelta(seconds=max(1, int(lease_seconds))))
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    cursor = conn.execute(
        """
        UPDATE messages
        SET status = 'acked', updated_at = ?, next_attempt_at = ?
        WHERE run_id = ?
          AND id = ?
          AND (
                status = 'queued'
             OR (status = 'acked' AND (acked_at IS NULL OR acked_at = ''))
          )
          AND expires_at > ?
          AND (next_attempt_at IS NULL OR next_attempt_at = '' OR next_attempt_at <= ?)
        """,
        (now, lease_until, ctx.run_id, message_id, now, now),
    )
    return int(cursor.rowcount or 0) > 0


def _update_source_status(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    source_message_id: str,
    status: str,
    note: str,
) -> None:
    if not source_message_id:
        return
    now = _utcnow_iso()
    conn.execute(
        """
        UPDATE messages
        SET status = ?, updated_at = ?, acked_at = ?, note = COALESCE(?, note)
        WHERE run_id = ? AND id = ? AND status != 'dead_letter'
        """,
        (status, now, now, note, ctx.run_id, source_message_id),
    )


def _parse_send_input_stdout(stdout: str) -> dict[str, Any] | None:
    text = str(stdout or "").strip()
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except Exception:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _should_mark_source_relayed(send_input_result: dict[str, Any] | None) -> bool:
    if not send_input_result:
        return False
    transport = str(send_input_result.get("transport") or "").strip().lower()
    # Only hide queued messages when we can confirm a live Codex thread delivery happened.
    return transport == "codex-thread"


def _extract_degraded_reason(send_input_result: dict[str, Any] | None) -> str:
    if not send_input_result:
        return "send_input returned no JSON payload"
    reason = str(send_input_result.get("fallback_reason") or "").strip()
    if reason:
        return reason
    note = str(send_input_result.get("note") or "").strip()
    if note:
        return note
    requested = str(send_input_result.get("requested_transport") or "").strip().lower()
    transport = str(send_input_result.get("transport") or "").strip().lower()
    return f"requested_transport={requested or 'unknown'}, transport={transport or 'unknown'}"


def _render_forward_message(payload: dict[str, Any], relay_row: sqlite3.Row) -> str:
    source_type = str(payload.get("source_message_type") or "").strip()
    source_subject = str(payload.get("source_subject") or "").strip()
    source_body = str(payload.get("source_body") or "").strip()
    relay_body = str(relay_row["body"] or "").strip()
    body = source_body or relay_body
    if source_type or source_subject:
        return f"[{source_type}] {source_subject}\n{body}".strip()
    return body


def _run_send_input(command: list[str], timeout_seconds: int, cwd: Path) -> tuple[bool, str]:
    effective_command = list(command)
    try:
        completed = subprocess.run(
            effective_command,
            check=False,
            capture_output=True,
            text=True,
            timeout=max(1, int(timeout_seconds)),
            cwd=str(cwd),
        )
    except FileNotFoundError as exc:
        # Standalone portability: `python3` may not exist on Windows (but this relay is
        # itself running under some Python). Retry using the current interpreter.
        if effective_command and effective_command[0] in {"python3", "python"}:
            effective_command = [sys.executable, *effective_command[1:]]
            try:
                completed = subprocess.run(
                    effective_command,
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=max(1, int(timeout_seconds)),
                    cwd=str(cwd),
                )
            except Exception as exc2:
                return False, str(exc2)
        else:
            return False, str(exc)
    except subprocess.TimeoutExpired as exc:
        return False, f"timeout: {exc}"
    except Exception as exc:
        return False, str(exc)

    stdout = str(completed.stdout or "").strip()
    stderr = str(completed.stderr or "").strip()
    if completed.returncode != 0:
        detail = stderr or stdout or f"exit={completed.returncode}"
        return False, detail
    return True, stdout or "ok"


def _compute_backoff_seconds(*, attempts: int, base_backoff_seconds: int, max_backoff_seconds: int) -> int:
    exp = max(0, attempts - 1)
    delay = int(max(1, base_backoff_seconds) * (2**exp))
    return max(1, min(delay, max(1, max_backoff_seconds)))


def _schedule_retry_or_dead_letter(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    relay_row: sqlite3.Row,
    failure_reason: str,
    source_message_id: str,
    base_backoff_seconds: int,
    max_backoff_seconds: int,
) -> dict[str, Any]:
    now = _utcnow_iso()
    attempts = _safe_int(relay_row["delivery_attempts"], 0) + 1
    max_attempts = max(1, _safe_int(relay_row["max_attempts"], 3))
    message_id = str(relay_row["id"])
    reason = str(failure_reason or "").strip()[:4000] or "unknown relay failure"

    conn.execute(
        """
        UPDATE messages
        SET delivery_attempts = ?, last_error = ?, updated_at = ?
        WHERE run_id = ? AND id = ?
        """,
        (attempts, reason, now, ctx.run_id, message_id),
    )

    if attempts >= max_attempts:
        conn.execute(
            """
            UPDATE messages
            SET status = 'error', next_attempt_at = ?, updated_at = ?, note = COALESCE(?, note)
            WHERE run_id = ? AND id = ?
            """,
            (now, now, reason, ctx.run_id, message_id),
        )
        refreshed = conn.execute(
            "SELECT * FROM messages WHERE run_id = ? AND id = ?",
            (ctx.run_id, message_id),
        ).fetchone()
        if refreshed is None:
            raise RuntimeError(f"message missing during dead-letter handoff: {message_id}")
        team_bus._move_to_dead_letter(  # noqa: SLF001
            conn,
            ctx,
            refreshed,
            reason=f"relay delivery failed after {attempts} attempts: {reason}",
        )
        _record_event(
            conn,
            ctx,
            event_type="relay.dead_letter",
            entity_type="message",
            entity_id=message_id,
            payload={"attempts": attempts, "reason": reason},
        )
        return {"dead_lettered": True, "attempts": attempts}

    backoff = _compute_backoff_seconds(
        attempts=attempts,
        base_backoff_seconds=base_backoff_seconds,
        max_backoff_seconds=max_backoff_seconds,
    )
    next_attempt = (_utcnow() + timedelta(seconds=backoff)).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )
    conn.execute(
        """
        UPDATE messages
        SET status = 'queued', next_attempt_at = ?, updated_at = ?, note = COALESCE(?, note)
        WHERE run_id = ? AND id = ?
        """,
        (next_attempt, now, reason, ctx.run_id, message_id),
    )
    _record_event(
        conn,
        ctx,
        event_type="relay.retry_scheduled",
        entity_type="message",
        entity_id=message_id,
        payload={"attempts": attempts, "next_attempt_at": next_attempt, "reason": reason},
    )
    return {"dead_lettered": False, "attempts": attempts, "next_attempt_at": next_attempt}


def _mark_success(
    conn: sqlite3.Connection,
    ctx: RuntimeContext,
    *,
    relay_message_id: str,
    source_message_id: str,
    note: str,
    mark_source_relayed: bool,
    delivery_transport: str,
) -> None:
    now = _utcnow_iso()
    conn.execute(
        """
        UPDATE messages
        SET status = 'relayed', updated_at = ?, acked_at = ?, note = COALESCE(?, note)
        WHERE run_id = ? AND id = ?
        """,
        (now, now, note, ctx.run_id, relay_message_id),
    )
    if mark_source_relayed:
        _update_source_status(
            conn,
            ctx,
            source_message_id=source_message_id,
            status="relayed",
            note=f"relayed via director: {relay_message_id}",
        )
    _record_event(
        conn,
        ctx,
        event_type="relay.delivered",
        entity_type="message",
        entity_id=relay_message_id,
        payload={"source_message_id": source_message_id, "transport": delivery_transport},
    )


def _process_cycle(args: argparse.Namespace) -> dict[str, Any]:
    ctx, conn = team_bus.open_bus(args.epic_slug)
    config = team_bus.load_team_bus_config(ctx.repo_root)
    relay_cfg = config.get("relay", {})
    allowed_roles = team_bus.discover_allowed_roles(ctx.repo_root, config)

    director_role = (
        str(args.director_role or "").strip() or str(relay_cfg.get("director_role") or "director")
    )
    director_role = team_bus._validate_role(director_role, allowed_roles, "--director-role")  # noqa: SLF001

    relay_type = (
        str(args.message_type or "").strip() or str(relay_cfg.get("message_type") or "relay.dispatch")
    )
    role_map_path = (
        Path(args.role_map_path).expanduser()
        if str(args.role_map_path or "").strip()
        else ctx.bus_dir / "agent_registry.json"
    )
    role_map = _load_role_map(role_map_path)
    command_template = relay_cfg.get("send_input_command", [])
    if not isinstance(command_template, list) or not command_template:
        raise RuntimeError("relay.send_input_command must be a non-empty array in .codex/team_bus_config.json")

    base_backoff_seconds = max(1, _safe_int(relay_cfg.get("base_backoff_seconds"), 5))
    max_backoff_seconds = max(1, _safe_int(relay_cfg.get("max_backoff_seconds"), 120))
    # Avoid holding a write lock during transport calls; use a simple lease so
    # relay items can be reclaimed if a worker crashes mid-delivery.
    lease_seconds = max(5, int(args.transport_timeout_seconds) + 5)

    summary = {
        "ok": True,
        "run_id": ctx.run_id,
        "epic_slug": ctx.epic_slug,
        "director_role": director_role,
        "relay_type": relay_type,
        "polled": 0,
        "claimed": 0,
        "delivered": 0,
        "degraded": 0,
        "routes_cleared": 0,
        "retried": 0,
        "dead_lettered": 0,
        "errors": [],
    }
    retry_on_degraded = bool(relay_cfg.get("retry_on_degraded_transport", False))

    rows = _load_due_relay_messages(
        conn,
        ctx,
        director_role=director_role,
        message_type=relay_type,
        limit=max(1, int(args.batch_size)),
    )
    summary["polled"] = len(rows)

    for row in rows:
        relay_message_id = str(row["id"])
        with conn:
            if not _claim_for_delivery(conn, ctx, message_id=relay_message_id, lease_seconds=lease_seconds):
                continue
        summary["claimed"] += 1

        payload = _parse_json_object(str(row["payload_json"] or "{}"))
        target_role = str(payload.get("target_role") or "").strip()
        source_message_id = str(payload.get("source_message_id") or "").strip()
        if not target_role:
            with conn:
                outcome = _schedule_retry_or_dead_letter(
                    conn,
                    ctx,
                    relay_row=row,
                    failure_reason="relay payload missing target_role",
                    source_message_id=source_message_id,
                    base_backoff_seconds=base_backoff_seconds,
                    max_backoff_seconds=max_backoff_seconds,
                )
            if bool(outcome.get("dead_lettered")):
                summary["dead_lettered"] += 1
            else:
                summary["retried"] += 1
            continue

        try:
            target_role = team_bus._validate_role(target_role, allowed_roles, "target role")  # noqa: SLF001
        except RuntimeError as exc:
            with conn:
                outcome = _schedule_retry_or_dead_letter(
                    conn,
                    ctx,
                    relay_row=row,
                    failure_reason=str(exc),
                    source_message_id=source_message_id,
                    base_backoff_seconds=base_backoff_seconds,
                    max_backoff_seconds=max_backoff_seconds,
                )
            if bool(outcome.get("dead_lettered")):
                summary["dead_lettered"] += 1
            else:
                summary["retried"] += 1
            continue

        forward_message = _render_forward_message(payload, row)
        metadata = {
            "relay_message_id": relay_message_id,
            "source_message_id": source_message_id,
            "source_message_type": str(payload.get("source_message_type") or ""),
            "source_subject": str(payload.get("source_subject") or ""),
            "target_role": target_role,
        }
        metadata_json = json.dumps(metadata, ensure_ascii=False, sort_keys=True)
        values = {
            "agent_id": _resolve_agent_id(payload, role_map, target_role),
            "thread_id": _resolve_thread_id(payload, role_map, target_role),
            "target_role": target_role,
            "message": forward_message,
            "metadata_json": metadata_json,
            "run_id": ctx.run_id,
            "epic_slug": ctx.epic_slug,
            "relay_message_id": relay_message_id,
            "role_map_path": str(role_map_path),
        }
        command = _build_command(command_template, values)

        ok, result = _run_send_input(
            command,
            timeout_seconds=max(1, int(args.transport_timeout_seconds)),
            cwd=ctx.repo_root,
        )
        if ok:
            send_input_result = _parse_send_input_stdout(result)
            mark_source_relayed = _should_mark_source_relayed(send_input_result)
            requested_thread_id = str(values.get("thread_id") or "").strip()
            degraded_delivery = bool(requested_thread_id and not mark_source_relayed)
            degraded_reason = _extract_degraded_reason(send_input_result)
            if degraded_delivery:
                cleared_stale_route = False
                if _is_stale_thread_failure(degraded_reason):
                    try:
                        cleared_stale_route = _clear_stale_thread_route(
                            role_map_path=role_map_path,
                            role_map=role_map,
                            target_role=target_role,
                            requested_thread_id=requested_thread_id,
                        )
                    except Exception as exc:
                        summary["errors"].append(
                            {
                                "message_id": relay_message_id,
                                "target_role": target_role,
                                "error": f"failed to clear stale route: {exc}",
                            }
                        )
                _log_event(
                    ctx,
                    "relay.degraded",
                    {
                        "relay_message_id": relay_message_id,
                        "source_message_id": source_message_id,
                        "target_role": target_role,
                        "reason": degraded_reason,
                        "route_cleared": cleared_stale_route,
                    },
                )
                if cleared_stale_route:
                    summary["routes_cleared"] += 1
                    with conn:
                        _record_event(
                            conn,
                            ctx,
                            event_type="relay.route_cleared",
                            entity_type="role",
                            entity_id=target_role,
                            payload={
                                "thread_id": requested_thread_id,
                                "reason": degraded_reason,
                                "role_map_path": str(role_map_path),
                            },
                        )
                summary["degraded"] += 1
                summary["errors"].append(
                    {
                        "message_id": relay_message_id,
                        "target_role": target_role,
                        "error": f"degraded transport: {degraded_reason}",
                        "command": command[0] if command else "",
                    }
                )
                should_retry_degraded = retry_on_degraded and not cleared_stale_route
                if should_retry_degraded:
                    with conn:
                        outcome = _schedule_retry_or_dead_letter(
                            conn,
                            ctx,
                            relay_row=row,
                            failure_reason=f"degraded transport: {degraded_reason}",
                            source_message_id=source_message_id,
                            base_backoff_seconds=base_backoff_seconds,
                            max_backoff_seconds=max_backoff_seconds,
                        )
                    if bool(outcome.get("dead_lettered")):
                        summary["dead_lettered"] += 1
                    else:
                        summary["retried"] += 1
                    continue
            with conn:
                _mark_success(
                    conn,
                    ctx,
                    relay_message_id=relay_message_id,
                    source_message_id=source_message_id,
                    note=f"relay ok: {result[:300]}",
                    mark_source_relayed=mark_source_relayed,
                    delivery_transport=str(
                        (send_input_result or {}).get("transport") or "unknown"
                    ).strip(),
                )
            summary["delivered"] += 1
            continue

        with conn:
            outcome = _schedule_retry_or_dead_letter(
                conn,
                ctx,
                relay_row=row,
                failure_reason=result,
                source_message_id=source_message_id,
                base_backoff_seconds=base_backoff_seconds,
                max_backoff_seconds=max_backoff_seconds,
            )
        summary["errors"].append(
            {
                "message_id": relay_message_id,
                "target_role": target_role,
                "error": result,
                "command": shlex.join(command),
            }
        )
        if bool(outcome.get("dead_lettered")):
            summary["dead_lettered"] += 1
        else:
            summary["retried"] += 1

    if summary["errors"] or summary["degraded"] > 0:
        summary["ok"] = False

    conn.close()
    return summary


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Continuously relay director queue messages using configured send_input command."
    )
    parser.add_argument("--epic-slug", default="")
    parser.add_argument("--director-role", default="")
    parser.add_argument("--message-type", default="")
    parser.add_argument("--role-map-path", default="")
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--poll-seconds", type=float, default=1.0)
    parser.add_argument("--iterations", type=int, default=0)
    parser.add_argument("--transport-timeout-seconds", type=int, default=30)
    parser.add_argument("--quiet", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.iterations < 0:
        raise RuntimeError("--iterations must be >= 0")

    count = 0
    while True:
        summary = _process_cycle(args)
        count += 1
        if not args.quiet or summary["polled"] > 0 or summary["delivered"] > 0:
            print(json.dumps(summary, ensure_ascii=False, sort_keys=True))

        if args.iterations and count >= args.iterations:
            return 0
        time.sleep(max(0.05, float(args.poll_seconds)))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"[game-team-bus-relay] {exc}", file=sys.stderr)
        raise SystemExit(2)
