# Bluff Engine

Fibbage-style bluffing game. AI generates a question and the real answer, players submit fakes and vote for the truth.

## Phases

- `generating-prompt`: AI generates question/answer
- `answer-input`: players submit fake answers
- `voting`: players vote on the real answer
- `results`: reveal and scoring
- `final-scores`: end of game

## Inputs

- `player:submit` during `answer-input` (`content`: string)
- `player:vote` during `voting` (`targetIndex`: number)

## Scoring

- Fool a player (they voted for your fake): +100
- Correctly vote real answer: +200
- Voted for a fake answer: -50

