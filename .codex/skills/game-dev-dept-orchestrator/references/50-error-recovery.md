# Error Recovery

Use this guide when the orchestration pipeline stalls or drifts.

## Common Failures

1. Wrong role spawned
   - Symptom: thread shows `[default]` instead of the intended specialized role.
   - Action: respawn with the correct role and restate ownership.

2. Director doing IC work
   - Symptom: the director starts reading code, writing code, or running tests directly.
   - Action: stop, spawn the appropriate specialist, and return the work to the phase flow.

3. Bus routing degraded
   - Symptom: relay delivery fails or only JSONL fallback is used.
   - Action:
     - `python3 .codex/tools/game_team_bus.py agents`
     - `python3 .codex/tools/game_team_bus.py alerts`
     - `python3 .codex/tools/game_team_bus.py dead-letters --limit 100`
     - re-register the affected thread ids

4. Missing active epic
   - Symptom: tooling errors with "no active epic found".
   - Action:
     - `python3 .codex/tools/game_team_bus.py set-active --epic-slug '<epic_slug>'`
     - `python3 .codex/tools/game_team_bus.py init`

5. Phase artifact missing
   - Symptom: a later phase depends on an artifact that does not exist.
   - Action: return to the owner of that phase and require the artifact before proceeding.

## Recovery Principles

- Re-establish the active epic first.
- Prefer respawning the correct role over improvising from the wrong one.
- Do not merge while verification contracts or polish gates are missing.
- Record recovery notes under `outputs/game-dev/<epic_slug>/` if ship confidence changed.
