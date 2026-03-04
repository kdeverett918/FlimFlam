# T10 Retest Lane: Survey Smash E2E Stability

Date: 2026-03-03 (America/Los_Angeles)
Epic: `10of10-tier2-4-polish`
Status: **COMPLETED (GREEN)**

## Commands Executed

1. `pnpm playwright test tests/e2e/survey-smash-polish.spec.ts tests/e2e/survey-smash-premium-board.spec.ts --reporter=line --retries=0`
   - Result: **PASS** (`6 passed`)
   - Log: `outputs/game-dev/10of10-tier2-4-polish/logs/96-survey-fixes-targeted.log`

2. Validation in full combined contract lane:
   - `pnpm playwright test tests/e2e/host-submission-progress.spec.ts tests/e2e/lucky-letters-polish.spec.ts tests/e2e/brain-board-polish.spec.ts tests/e2e/survey-smash-polish.spec.ts tests/e2e/survey-smash-premium-board.spec.ts --reporter=line --retries=0`
   - Final result: **PASS** (`12 passed`)
   - Log: `outputs/game-dev/10of10-tier2-4-polish/logs/96-tier2-4-subset-final2.log`

## Fixes Verified

- Round-result who-said-what lane stabilized against phase-transition race conditions.
- Premium-board reduced-motion reveal lane stabilized against occasional overshoot to final scores.
- Survey Smash phase driver now also recognizes reveal-board markers for deterministic phase acquisition.

## Contract Integrity

- Verification contracts were not weakened.
- Assertions still require:
  - sequential reveal behavior,
  - strike motion behavior (default + reduced motion),
  - round-result visibility behavior,
  - premium board marker consistency.

## Residual Risk

- No failing assertions remain in the final combined no-retry contract run.
- Runtime logs still contain non-blocking `seat reservation expired` transport noise.
