# Release Command

Create a new release with built extension and GitHub release.

## Instructions

1. Run `git status` to ensure working directory is clean (no uncommitted changes)
   - If there are uncommitted changes, stop and ask user to commit first

2. Run `bun run build` to create production build

3. Ask user to test the build locally:
   - Load `dist/` folder in Chrome as unpacked extension
   - Verify it works correctly on their n8n instance
   - Wait for user confirmation before proceeding

4. Determine version number:
   - Check current version in `package.json`
   - Check `CHANGELOG.md` for what's in `[Unreleased]`
   - Ask user for new version (patch/minor/major) or specific version

5. Update version in `package.json`

6. Update `CHANGELOG.md`:
   - Change `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`
   - Add new empty `## [Unreleased]` section above it with empty categories

7. Commit the version bump:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "release: vX.Y.Z"
   ```

8. Create git tag:
   ```bash
   git tag vX.Y.Z
   ```

9. Push commit and tag:
   ```bash
   git push && git push --tags
   ```

10. Create GitHub release with the built extension:
    - Create a zip of the `dist/` folder
    - Use `gh release create` with the changelog section as release notes
    ```bash
    cd dist && zip -r ../n8n-xtend-vX.Y.Z.zip . && cd ..
    gh release create vX.Y.Z n8n-xtend-vX.Y.Z.zip --title "vX.Y.Z" --notes "$(changelog notes)"
    ```

11. Clean up the zip file after upload

## Rules
- NEVER release with uncommitted changes
- NEVER skip the local testing step
- NEVER skip user confirmation
- Always use semantic versioning (MAJOR.MINOR.PATCH)
- The CI/CD pipeline will also build on tag push, but we attach our tested build

## Version Guidelines
- **patch** (1.0.0 → 1.0.1): Bug fixes, minor changes
- **minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **major** (1.0.0 → 2.0.0): Breaking changes

## Optional Arguments
$ARGUMENTS

If version provided (e.g., `1.2.0` or `patch`), use it directly.
