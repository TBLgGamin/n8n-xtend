# Push Command

Push commits to the remote repository.

## Instructions

1. Run `git status` to check current branch and commits ahead
2. Run `git log --oneline -3` to show what will be pushed
3. Push to remote:
   - If branch has upstream: `git push`
   - If no upstream: `git push -u origin <branch-name>`

## Rules
- NEVER use `--force` unless explicitly requested by user
- NEVER push to main/master with --force
- Confirm with user before pushing if there are merge conflicts

## Optional Arguments
$ARGUMENTS

If arguments provided (e.g., branch name), use them accordingly.
