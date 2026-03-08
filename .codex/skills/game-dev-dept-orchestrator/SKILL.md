---
name: "game-dev-dept-orchestrator"
description: "Run the shared game-development studio workflow using the checked-in role configs and team-bus tooling."
---

# Game Dev Department Orchestrator

Use this skill for game epics and cross-discipline game work that needs concept, implementation, test, review, and polish phases.

## Workflow

1. Read `AGENTS.md` for the studio contract and phase model.
2. Set the active epic and bootstrap the bus:
   - `python3 .codex/tools/game_team_bus.py set-active --epic-slug '<epic_slug>'`
   - `python3 .codex/tools/game_team_bus.py init`
   - `python3 .codex/tools/game_team_bus_relay.py --poll-seconds 1`
3. Route epic execution to the `director` role.
4. Keep artifacts under `outputs/game-dev/<epic_slug>/`.
5. Use `.codex/agents/*.toml` for the role-specific instructions.

## Hard Rules

- Do not run the full studio pipeline from the fallback/default role.
- Spawn specialist roles by their actual role names.
- Treat `51-verification-contracts.md` as the merge contract.
- Run the polish gate before ship.

## References

- `AGENTS.md`
- `.codex/tools/game_team_bus.py`
- `.codex/team_bus_config.json`
- `references/50-error-recovery.md`
