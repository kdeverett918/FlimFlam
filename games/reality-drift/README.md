# Reality Drift

Trivia with lies. Some questions are real, some are "drift" (fabricated). Players answer and can call drift.

## Phases

- `generating-questions`: AI pre-generates question batch
- `answering`: players pick an answer
- `drift-check`: players decide real vs drift
- `results`: reveal real/drift and correct answer
- `final-scores`: end of game

## Inputs

- `player:vote` during `answering` (`targetIndex`: number)
- `player:vote` during `drift-check` (`targetIndex`: 0 = real, 1 = drift)

## Scoring

- Correct answer on real question: +100
- Correct drift call on drift question: +200
- Drift called on real question: -150

