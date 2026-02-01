# Commit Command

Create a git commit following conventional commit standards and project pipeline.

## Instructions

1. Run `git status` to see all changes (never use -uall flag)
2. Run `git diff --staged` and `git diff` to understand all changes
3. Run `git log --oneline -5` to see recent commit style

4. Update `CHANGELOG.md` with the changes being committed:
   - Add entry under `## [Unreleased]` section
   - Use appropriate category: Added, Changed, Fixed, Removed
   - Keep descriptions concise and user-focused

5. Analyze all changes and create a commit message following Conventional Commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `refactor:` - Code refactoring
   - `docs:` - Documentation changes
   - `style:` - Formatting, no code change
   - `test:` - Adding/updating tests
   - `chore:` - Maintenance tasks
   - `perf:` - Performance improvements

6. Stage appropriate files including CHANGELOG.md (prefer specific files over `git add -A`)

7. Create the commit using this exact format with HEREDOC:
```bash
git commit -m "$(cat <<'EOF'
<type>: <short description>

<optional body with more details>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

8. Run `git status` to verify the commit succeeded

## Rules
- NEVER use --no-verify (must run Husky hooks)
- NEVER amend previous commits unless explicitly requested
- Keep commit message under 72 characters for the subject line
- Use imperative mood ("add feature" not "added feature")
- The main author will be the git config user (TBLgGamin)
- Always add Claude as Co-Author

## Optional Arguments
$ARGUMENTS

If arguments are provided, use them as guidance for what to commit or the commit message.
