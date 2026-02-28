# Quick Draw

Drawing and guessing game. One player draws a word while everyone else races to guess it.

## Phases

- `picking-drawer`: selects next drawer and word
- `drawing`: drawer sends strokes; host mirrors canvas
- `guessing`: players submit guesses
- `word-reveal`: reveal the word and winners
- `final-scores`: end of game

## Inputs

- `player:draw-stroke` during `drawing`
- `player:submit` during `guessing` (`content`: string)

## Scoring

- Guessers: 500/400/300/200/100 by correct order
- Drawer: 100 per correct guesser

