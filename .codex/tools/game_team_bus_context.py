#!/usr/bin/env python3
# ruff: noqa: S110
"""Zero-config runtime context for game development team bus."""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_ACTIVE_EPIC_FILE = ".active_epic"
_RUN_METADATA_FILE = "run.json"
_SKILL_SLUG = "game-dev-dept-orchestrator"


@dataclass(frozen=True)
class RuntimeContext:
    repo_root: Path
    outputs_root: Path
    epic_slug: str
    run_id: str
    run_dir: Path
    bus_dir: Path
    db_path: Path
    events_path: Path


def _utcnow_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_epic_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9._-]+", "-", str(value or "").strip().lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def _is_game_workspace(candidate: Path) -> bool:
    codex_dir = candidate / ".codex"
    return (
        (codex_dir / "agents").exists()
        and (
            (codex_dir / "skills" / _SKILL_SLUG).exists()
            or (codex_dir / "tools" / "game_team_bus.py").exists()
        )
    )


def find_repo_root(start: Path | None = None) -> Path:
    here = (start or Path.cwd()).resolve()
    for candidate in [here, *here.parents]:
        if _is_game_workspace(candidate):
            return candidate

    anchored = Path(__file__).resolve().parents[2]
    if _is_game_workspace(anchored):
        return anchored

    for candidate in [here, *here.parents]:
        if (candidate / ".git").exists():
            return candidate
    raise RuntimeError(f"could not find workspace root from {here} (missing game .codex and .git)")


def outputs_root(repo_root: Path) -> Path:
    return repo_root / "outputs" / "game-dev"


def active_epic_path(repo_root: Path) -> Path:
    return outputs_root(repo_root) / _ACTIVE_EPIC_FILE


def read_active_epic(repo_root: Path) -> str | None:
    marker = active_epic_path(repo_root)
    if not marker.exists():
        return None
    value = marker.read_text(encoding="utf-8").strip()
    slug = normalize_epic_slug(value)
    return slug or None


def set_active_epic(epic_slug: str, repo_root: Path | None = None) -> Path:
    root = repo_root or find_repo_root()
    slug = normalize_epic_slug(epic_slug)
    if not slug:
        raise RuntimeError("epic slug cannot be empty")
    base = outputs_root(root)
    base.mkdir(parents=True, exist_ok=True)
    marker = active_epic_path(root)
    marker.write_text(slug + "\n", encoding="utf-8")
    return marker


def infer_epic_from_path(path: Path) -> str | None:
    parts = list(path.resolve().parts)
    for idx in range(len(parts) - 2):
        if parts[idx] == "outputs" and parts[idx + 1] == "game-dev":
            candidate = normalize_epic_slug(parts[idx + 2])
            if candidate and candidate != _ACTIVE_EPIC_FILE:
                return candidate
    return None


def infer_single_epic(outputs_dir: Path) -> str | None:
    if not outputs_dir.exists():
        return None
    candidates = sorted(
        d.name
        for d in outputs_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".") and normalize_epic_slug(d.name)
    )
    if len(candidates) == 1:
        return normalize_epic_slug(candidates[0])
    return None


def _resolve_epic_slug(repo_root: Path, explicit_epic_slug: str | None = None) -> str:
    if explicit_epic_slug:
        slug = normalize_epic_slug(explicit_epic_slug)
        if not slug:
            raise RuntimeError("explicit epic slug is invalid")
        set_active_epic(slug, repo_root=repo_root)
        return slug

    active = read_active_epic(repo_root)
    if active:
        return active

    inferred = infer_epic_from_path(Path.cwd())
    if inferred:
        set_active_epic(inferred, repo_root=repo_root)
        return inferred

    only_epic = infer_single_epic(outputs_root(repo_root))
    if only_epic:
        set_active_epic(only_epic, repo_root=repo_root)
        return only_epic

    raise RuntimeError(
        "no active epic found; run `python3 .codex/tools/game_team_bus.py set-active --epic-slug <epic_slug>` once"
    )


def _run_metadata_path(repo_root: Path, epic_slug: str) -> Path:
    return outputs_root(repo_root) / epic_slug / _RUN_METADATA_FILE


def load_or_create_run_metadata(repo_root: Path, epic_slug: str) -> dict[str, Any]:
    slug = normalize_epic_slug(epic_slug)
    if not slug:
        raise RuntimeError("epic slug cannot be empty")

    metadata_path = _run_metadata_path(repo_root, slug)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)

    if metadata_path.exists():
        try:
            raw = json.loads(metadata_path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                run_id = str(raw.get("run_id") or "").strip()
                if run_id:
                    version_raw = raw.get("version", 1)
                    try:
                        version = int(version_raw)
                    except Exception:
                        version = 1
                    return {
                        "run_id": run_id,
                        "epic_slug": slug,
                        "created_at": str(raw.get("created_at") or _utcnow_iso()),
                        "version": version,
                    }
        except Exception:
            pass

    payload = {
        "run_id": str(uuid.uuid4()),
        "epic_slug": slug,
        "created_at": _utcnow_iso(),
        "version": 1,
    }
    metadata_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return payload


def resolve_runtime_context(explicit_epic_slug: str | None = None) -> RuntimeContext:
    repo_root = find_repo_root()
    out_root = outputs_root(repo_root)
    out_root.mkdir(parents=True, exist_ok=True)

    epic_slug = _resolve_epic_slug(repo_root, explicit_epic_slug=explicit_epic_slug)
    run_meta = load_or_create_run_metadata(repo_root, epic_slug)
    run_id = str(run_meta["run_id"])

    run_dir = out_root / epic_slug
    bus_dir = run_dir / "team-bus"
    bus_dir.mkdir(parents=True, exist_ok=True)

    return RuntimeContext(
        repo_root=repo_root,
        outputs_root=out_root,
        epic_slug=epic_slug,
        run_id=run_id,
        run_dir=run_dir,
        bus_dir=bus_dir,
        db_path=bus_dir / "game_team_bus.sqlite3",
        events_path=bus_dir / "events.jsonl",
    )
