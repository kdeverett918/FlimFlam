#!/usr/bin/env python3
# ruff: noqa: S603,S607,T201
"""Delivery adapter for relay forwarding (live Codex thread or JSONL fallback)."""

from __future__ import annotations

import argparse
import json
import os
import queue
import re
import shlex
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from game_team_bus_context import resolve_runtime_context  # noqa: E402

_THREAD_ID_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"),
    re.compile(r"^thd_[A-Za-z0-9_-]{8,}$"),
    re.compile(r"^thread_[A-Za-z0-9_-]{8,}$"),
)


def _utcnow_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_route_entry(value: Any) -> dict[str, str]:
    if isinstance(value, str):
        agent_id = value.strip()
        return {"agent_id": agent_id, "thread_id": ""}
    if not isinstance(value, dict):
        return {"agent_id": "", "thread_id": ""}
    agent_id = str(value.get("agent_id") or value.get("agentId") or "").strip()
    thread_id = _normalize_thread_id(value.get("thread_id") or value.get("threadId") or "")
    return {"agent_id": agent_id, "thread_id": thread_id}


def _normalize_thread_id(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    for pattern in _THREAD_ID_PATTERNS:
        if pattern.match(text):
            return text
    return ""


def _resolve_codex_command_token(token: str) -> list[str]:
    token_clean = str(token or "").strip()
    if not token_clean:
        return []

    candidates: list[str] = []
    direct = shutil.which(token_clean)
    if direct:
        candidates.append(direct)

    token_lower = token_clean.lower()
    if token_lower in {"codex", "codex.exe", "codex.cmd"}:
        for alt in ("codex", "codex.cmd", "codex.exe"):
            hit = shutil.which(alt)
            if hit:
                candidates.append(hit)
        appdata = os.environ.get("APPDATA")
        if appdata:
            npm_codex_cmd = Path(appdata) / "npm" / "codex.cmd"
            if npm_codex_cmd.exists():
                candidates.append(str(npm_codex_cmd))
            npm_codex_ps1 = Path(appdata) / "npm" / "codex.ps1"
            if npm_codex_ps1.exists():
                candidates.append(str(npm_codex_ps1))

    out: list[str] = []
    seen: set[str] = set()
    for raw in candidates:
        key = str(raw).strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(str(raw))
    return out


def _resolve_app_server_commands(app_server_command: str) -> list[list[str]]:
    base = shlex.split(str(app_server_command or "").strip())
    if not base:
        return []

    commands: list[list[str]] = [base]
    first = str(base[0]).strip()
    token_replacements = _resolve_codex_command_token(first)
    for replacement in token_replacements:
        if replacement == first:
            continue
        commands.append([replacement, *base[1:]])

    out: list[list[str]] = []
    seen: set[tuple[str, ...]] = set()
    for command in commands:
        key = tuple(str(tok).strip().lower() for tok in command)
        if key in seen:
            continue
        seen.add(key)
        out.append(command)
    return out


def _load_role_map(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}
    raw_roles = parsed.get("roles") if isinstance(parsed.get("roles"), dict) else parsed
    if isinstance(raw_roles, dict):
        out: dict[str, dict[str, str]] = {}
        for raw_role, raw_value in raw_roles.items():
            role = str(raw_role).strip()
            if not role:
                continue
            out[role] = _normalize_route_entry(raw_value)
        return out
    return {}


def _parse_metadata(raw: str) -> dict[str, Any]:
    text = str(raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid --metadata-json: {exc}") from exc
    if not isinstance(parsed, dict):
        raise RuntimeError("--metadata-json must decode to a JSON object")
    return parsed


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Relay send_input adapter (live Codex thread transport with JSONL fallback)."
    )
    parser.add_argument("--epic-slug", default="")
    parser.add_argument("--agent-id", default="")
    parser.add_argument("--thread-id", default="")
    parser.add_argument("--role", required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--metadata-json", default="{}")
    parser.add_argument("--role-map-path", default="")
    parser.add_argument("--log-path", default="")
    parser.add_argument("--transport", choices=["auto", "codex-thread", "jsonl"], default="auto")
    parser.add_argument(
        "--app-server-command",
        default="codex app-server --listen stdio://",
        help="Command used for Codex thread delivery transport.",
    )
    parser.add_argument("--app-server-timeout-seconds", type=int, default=20)
    parser.add_argument(
        "--fallback-jsonl-on-error",
        action="store_true",
        help="Allow JSONL fallback even when --transport codex-thread is set.",
    )
    parser.add_argument(
        "--fail-on-degraded",
        action="store_true",
        help="Exit non-zero when codex-thread delivery degrades to JSONL fallback.",
    )
    parser.add_argument("--fail-if-no-agent-id", action="store_true")
    return parser


def _jsonl_log(
    *,
    log_path: Path,
    role: str,
    agent_id: str,
    thread_id: str,
    message: str,
    metadata: dict[str, Any],
) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "created_at": _utcnow_iso(),
        "role": role,
        "agent_id": agent_id,
        "thread_id": thread_id,
        "message_preview": (message[:160] + "…") if len(message) > 160 else message,
        "message_length": len(message),
        "metadata_keys": sorted(str(key) for key in metadata),
    }
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


class _AppServerClient:
    def __init__(self, *, command: list[str], timeout_seconds: int) -> None:
        self._command = command
        self._timeout_seconds = max(1, int(timeout_seconds))
        self._proc: subprocess.Popen[str] | None = None
        self._stdout_queue: queue.Queue[str | None] = queue.Queue()
        self._reader_thread: threading.Thread | None = None

    def __enter__(self) -> _AppServerClient:
        self._proc = subprocess.Popen(
            self._command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self._reader_thread.start()
        self.request(
            "initialize",
            {
                "clientInfo": {"name": "game-team-bus-relay", "version": "1.0"},
                "capabilities": {"experimentalApi": True},
            },
        )
        self.notify("initialized")
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        proc = self._proc
        if proc is None:
            return
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=2)
        if self._reader_thread is not None:
            self._reader_thread.join(timeout=1)

    def _send(self, payload: dict[str, Any]) -> None:
        if self._proc is None or self._proc.stdin is None:
            raise RuntimeError("app-server process not started")
        self._proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self._proc.stdin.flush()

    def _reader_loop(self) -> None:
        if self._proc is None or self._proc.stdout is None:
            return
        for line in self._proc.stdout:
            self._stdout_queue.put(line)
        self._stdout_queue.put(None)

    def _read_line(self, timeout_seconds: int) -> str:
        if self._proc is None:
            raise RuntimeError("app-server process not started")
        deadline = time.time() + max(1, int(timeout_seconds))
        while time.time() < deadline:
            if self._proc.poll() is not None:
                stderr = ""
                if self._proc.stderr is not None:
                    stderr = (self._proc.stderr.read() or "").strip()
                raise RuntimeError(f"app-server exited early: rc={self._proc.returncode}, stderr={stderr}")
            remaining = max(0.01, deadline - time.time())
            try:
                line = self._stdout_queue.get(timeout=remaining)
            except queue.Empty:
                continue
            if line is None:
                stderr = ""
                if self._proc.stderr is not None:
                    stderr = (self._proc.stderr.read() or "").strip()
                raise RuntimeError(
                    f"app-server closed stdout: rc={self._proc.returncode}, stderr={stderr}"
                )
            return line
        raise RuntimeError("timeout waiting for app-server response")

    def request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        req_id = str(uuid.uuid4())
        self._send({"id": req_id, "method": method, "params": params})
        while True:
            raw = self._read_line(self._timeout_seconds).strip()
            if not raw:
                continue
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if str(parsed.get("id") or "") != req_id:
                continue
            if "error" in parsed:
                raise RuntimeError(f"{method} failed: {parsed.get('error')}")
            result = parsed.get("result")
            if not isinstance(result, dict):
                return {}
            return result

    def notify(self, method: str, params: dict[str, Any] | None = None) -> None:
        payload: dict[str, Any] = {"method": method}
        if params:
            payload["params"] = params
        self._send(payload)


def _deliver_codex_thread(
    *,
    thread_id: str,
    message: str,
    app_server_command: str,
    timeout_seconds: int,
) -> tuple[bool, str]:
    commands = _resolve_app_server_commands(app_server_command)
    if not commands:
        return False, "empty --app-server-command"

    details: list[str] = []
    for command in commands:
        try:
            with _AppServerClient(command=command, timeout_seconds=timeout_seconds) as client:
                try:
                    client.request("thread/read", {"threadId": thread_id, "includeTurns": False})
                except RuntimeError:
                    pass
                # thread/read can succeed before the thread is fully loaded.
                client.request("thread/resume", {"threadId": thread_id})
                client.request(
                    "turn/start",
                    {
                        "threadId": thread_id,
                        "input": [{"type": "text", "text": message}],
                    },
                )
            return True, f"turn/start accepted via {command[0]}"
        except FileNotFoundError as exc:
            details.append(f"{command[0]}: {exc}")
            continue
        except RuntimeError as exc:
            text = str(exc)
            if "WinError 2" in text or "No such file or directory" in text:
                details.append(f"{command[0]}: {text}")
                continue
            return False, text
        except Exception as exc:
            text = str(exc)
            if "WinError 2" in text or "No such file or directory" in text:
                details.append(f"{command[0]}: {text}")
                continue
            return False, text

    if details:
        return False, "; ".join(details)
    return False, "unknown app-server launch failure"


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    ctx = resolve_runtime_context(explicit_epic_slug=(args.epic_slug.strip() or None))
    metadata = _parse_metadata(args.metadata_json)
    if bool(metadata.get("force_fail")):
        print("[game-team-bus-send-input] forced failure requested by metadata", file=sys.stderr)
        return 2

    role = str(args.role or "").strip()
    if not role:
        raise RuntimeError("--role cannot be empty")

    role_map_path = (
        Path(args.role_map_path).expanduser()
        if str(args.role_map_path or "").strip()
        else ctx.bus_dir / "agent_registry.json"
    )
    role_map = _load_role_map(role_map_path)
    route = role_map.get(role, {"agent_id": "", "thread_id": ""})
    agent_id = str(args.agent_id or "").strip() or str(route.get("agent_id") or "").strip()
    thread_id = _normalize_thread_id(args.thread_id or "") or _normalize_thread_id(
        route.get("thread_id") or ""
    )
    if args.fail_if_no_agent_id and not agent_id:
        print(f"[game-team-bus-send-input] no agent mapping for role `{role}`", file=sys.stderr)
        return 2

    log_path = (
        Path(args.log_path).expanduser()
        if str(args.log_path or "").strip()
        else ctx.bus_dir / "deliveries.jsonl"
    )
    transport = str(args.transport or "auto").strip().lower()
    message = str(args.message)
    fallback_allowed = bool(transport == "auto" or args.fallback_jsonl_on_error)
    delivery_note = ""
    delivered_transport = "jsonl"
    degraded = False
    fallback_reason = ""

    if transport in {"auto", "codex-thread"} and thread_id:
        try:
            ok, detail = _deliver_codex_thread(
                thread_id=thread_id,
                message=message,
                app_server_command=str(args.app_server_command or "").strip(),
                timeout_seconds=max(1, int(args.app_server_timeout_seconds)),
            )
        except Exception as exc:
            ok, detail = False, str(exc)
        if ok:
            delivered_transport = "codex-thread"
            delivery_note = detail
        elif not fallback_allowed:
            print(f"[game-team-bus-send-input] {detail}", file=sys.stderr)
            return 2
        else:
            delivery_note = f"codex-thread failed, fallback jsonl: {detail}"
            degraded = True
            fallback_reason = str(detail)
            metadata = {
                **metadata,
                "fallback_from": "codex-thread",
                "fallback_reason": detail,
            }
            _jsonl_log(
                log_path=log_path,
                role=role,
                agent_id=agent_id,
                thread_id=thread_id,
                message=message,
                metadata=metadata,
            )
    elif transport == "codex-thread":
        reason = f"no thread_id found for role `{role}`"
        if not fallback_allowed:
            print(f"[game-team-bus-send-input] {reason}", file=sys.stderr)
            return 2
        delivery_note = f"{reason}; fallback jsonl"
        degraded = True
        fallback_reason = reason
        metadata = {
            **metadata,
            "fallback_from": "codex-thread",
            "fallback_reason": reason,
        }
        _jsonl_log(
            log_path=log_path,
            role=role,
            agent_id=agent_id,
            thread_id=thread_id,
            message=message,
            metadata=metadata,
        )
    else:
        if transport == "auto" and not thread_id:
            delivery_note = "no thread_id mapping found; using jsonl"
        _jsonl_log(
            log_path=log_path,
            role=role,
            agent_id=agent_id,
            thread_id=thread_id,
            message=message,
            metadata=metadata,
        )

    if degraded and args.fail_on_degraded:
        print(f"[game-team-bus-send-input] degraded delivery: {delivery_note}", file=sys.stderr)
        return 3

    print(
        json.dumps(
            {
                "ok": not degraded,
                "degraded": degraded,
                "requested_transport": transport,
                "transport": delivered_transport,
                "role": role,
                "agent_id": agent_id,
                "thread_id": thread_id,
                "delivery_log": str(log_path),
                "note": delivery_note,
                "fallback_reason": fallback_reason,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
