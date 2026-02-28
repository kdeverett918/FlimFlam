# World Builder

AI-heavy collaborative storytelling game. Each player receives a role and private goal, then submits actions each round.

## Phases

- `generating`: AI scenario generation
- `role-reveal`: players receive roles
- `action-input`: players submit actions
- `ai-narrating`: AI processes actions
- `narration-display`: narration shown on host
- `reveal`: role/objective reveals and bonuses
- `final-scores`: end of game

## Inputs

- `player:ready` during `role-reveal`
- `player:submit` during `action-input` (`content`: string)
- `player:use-ability` during `action-input` (`abilityId`: string)

## Scoring

- Per-round points come from AI outcomes.
- End bonuses are awarded during `reveal`.

