# Hot Take

Opinion slider game. Players rate statements and score based on matching the group or being uniquely different.

## Phases

- `showing-prompt`: show statement
- `voting`: players submit slider vote (-2..+2)
- `results`: spectrum + scoring
- `final-scores`: end of game

## Inputs

- `player:vote` during `voting` (`value`: number)
- `host:skip` can advance phases in development/testing

## Scoring

- Majority rounds: score based on proximity to group median
- Lone-wolf rounds: score based on uniqueness (distance from group average)

