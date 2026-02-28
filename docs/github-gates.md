# GitHub Gates and Branch Protection

This repo uses automated gates so agentic and human contributors can only merge safe changes.

## Required Status Checks

Set these checks as required on `main`:

- `ci / lint`
- `ci / typecheck`
- `ci / test`
- `ci / build`
- `security / dependency-review`
- `security / codeql`

Keep this check non-required (advisory while stabilizing):

- `e2e / playwright`

## Branch Ruleset for `main`

Create a ruleset (Repository Settings -> Rules -> Rulesets) with:

1. Target branch: `main`
2. Require a pull request before merging
3. Require branches to be up to date before merging
4. Require status checks to pass (the list above)
5. Block force pushes
6. Block branch deletion
7. Restrict direct pushes (no one, including bots)
8. No required reviewers
9. Allow auto-merge
10. Enable merge queue
11. Disable bypass for administrators

## Agent Permissions

For bot/app identities used by coding agents:

1. Allow creating/updating branches and pull requests
2. Do not allow direct push to `main`
3. Do not allow bypassing rulesets
4. Scope tokens to least privilege (`contents: read` by default; write only when needed)

## Local Contributor Gate

Use the local gate before opening or marking a PR ready:

```bash
pnpm ci:gate
```

Lefthook also runs:

- `pre-commit`: Biome write check on staged files
- `pre-push`: typecheck and tests
