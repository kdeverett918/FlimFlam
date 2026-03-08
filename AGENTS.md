# Agent Guidelines (Game Development Studio)

This repository uses a shared Codex multi-agent studio with **20 specialized roles** deployed via `$game-dev-dept-orchestrator`.

## Multi-agent game development department (Codex)

### Org chart (20 roles + default, max_depth = 3)

- **Director** (depth 0): `director` — orchestrates feature phases, NEVER codes or designs
- **Domain Leads** (depth 1): `concept_lead` (classify/scope), `engine_lead` (rendering/physics/build), `gameplay_lead` (mechanics/loops/balance/AI), `art_director` (visual design/color/lighting/animation/VFX), `ux_designer` (HUD/menus/accessibility/interaction), `qa_lead` (test strategy/verification contracts), `performance_lead` (frame budget/memory/profiling), `audio_lead` (SFX/music/spatial/mixing), `level_designer` (layout/pacing/wayfinding/encounters)
- **Planning/Review** (depth 2): `technical_architect` (ADRs/system design), `sprint_lead` (task breakdown), `reviewer` (contract verification), `polish_critic` (8-dimension quality scoring)
- **ICs** (depth 3): `explorer` (code mapping), `developer` (implementation), `tester` (testing), `build_watcher` (CI monitor), `playtest_specialist` (player experience), `docs_curator` (documentation)

### 9-phase pipeline

Use `$game-dev-dept-orchestrator` for game features. The skill runs:
0. **CONCEPT** — `concept_lead` classifies and scopes the feature
1. **PRE-PRODUCTION** — Domain leads + explorer gather evidence (parallel)
2. **SYNTHESIS** — Director unifies findings into production plan
3. **ARCHITECTURE** — (conditional) `technical_architect` writes ADRs
4. **TASK BREAKDOWN** — `sprint_lead` breaks into tasks + `qa_lead` writes verification contracts
5. **PRODUCTION** — Developer+tester pairs + `playtest_specialist` for gameplay testing
6. **REVIEW** — `reviewer` + domain leads for contract verification + quality review
7. **POLISH** — `polish_critic` scores 8 dimensions until 10/10 or waiver
8. **SHIP + LEARN** — Merge PRs, record learnings, update docs

Phase-gates run after phases 1/4/5 using lightweight polish critic scoring (3 dims >= 7 to proceed).

### Setup

- Repo skill: `.codex/skills/game-dev-dept-orchestrator/SKILL.md`
- Role configs: `.codex/agents/*.toml`
- Team bus: `.codex/tools/game_team_bus.py` + `.codex/team_bus_config.json`
- Artifacts: `outputs/game-dev/<epic_slug>/`
- Start Codex inside the repo and restart after pulling changes so role files and local skills load

### Game Team Bus (cross-agent coordination)

Bootstrap once per epic:
```bash
python3 .codex/tools/game_team_bus.py set-active --epic-slug '<epic_slug>'
python3 .codex/tools/game_team_bus.py init
python3 .codex/tools/game_team_bus_relay.py --poll-seconds 1
```

Register active teammate threads for live transport (recommended):
```bash
python3 .codex/tools/game_team_bus.py register-agent --role developer --thread-id '<thread_id>'
python3 .codex/tools/game_team_bus.py register-agent --role tester --thread-id '<thread_id>'
python3 .codex/tools/game_team_bus.py agents
```

Relay transport behavior:
- If `thread_id` exists for target role, relay sends a live Codex `turn/start` to that thread.
- If no `thread_id` exists (or delivery fails), relay falls back to `deliveries.jsonl` audit.

Core operations:
- Publish handoff: `python3 .codex/tools/game_team_bus.py publish ...`
- Claim next task: `python3 .codex/tools/game_team_bus.py claim-next --role developer`
- Watch inbox: `python3 .codex/tools/game_team_bus.py watch --role tester`
- Queue health: `python3 .codex/tools/game_team_bus.py stats --by-role`
- SLA alerts: `python3 .codex/tools/game_team_bus.py alerts`
- Dead letters: `python3 .codex/tools/game_team_bus.py dead-letters --limit 100`

### Spawn discipline (common failure modes)

**Failure mode 1: `[default]` instead of specialized role.**
If you expected `art_director`/`gameplay_lead`/etc but the spawned thread shows `[default]`, it did NOT load the role config. Stop/close it and respawn using the correct role.

**Failure mode 2: Director does all the work solo.**
The director is a COORDINATOR. It NEVER writes code, creates art, designs levels, or explores the codebase. Minimum 7 distinct agent threads per epic.

**Failure mode 3: Only `explorer` agents spawned.**
An `explorer` only maps code paths. You also need concept_lead, domain leads, sprint_lead, developer+tester pairs, reviewer, and polish_critic.

### Default workflow

1. **Worktree-first**: work in isolated git worktrees
2. **Implement**: keep diffs minimal and focused
3. **Run gates**: lint, type check, tests — whatever the project uses
4. **Open PR + follow-up**: push, create PR, watch builds, fix failures
5. **Review + merge**: reviewer approves, polish_critic validates, merge when clean

### Quality bar

Hard rules for all game dev work:
- **No placeholder art or assets** — production-ready only
- **No debug code in production** — remove console.log, TODO comments, test flags
- **Game feel is non-negotiable** — every action has visual + audio + haptic feedback
- **Visual consistency** — all assets match the established art style
- **Performance within budget** — frame rate targets met on target hardware
- **Accessibility** — colorblind modes, text scaling, input remapping
- **No linear interpolation for visible motion** — always use easing curves
