# Skill catalog: provenance and publishing policy

Agent Commons synchronizes local skills and MCP configurations. The catalog feature inventories installed skills without copying, fetching or publishing any third-party content.

## Local inventory

Run from the project after `npm ci && npm run build`:

```bash
node dist/cli/index.js catalog
node dist/cli/index.js catalog --json
```

The CLI reads physical `~/.agents/skills/<name>/SKILL.md` directories and the existing `~/.agents/.skill-lock.json` (or `skills-lock.json`) metadata. It reports a source URL when the lockfile contains a usable, non-credentialed HTTPS repository URL. Local filesystem paths and URL credentials are not exported.

A `license:` field in a skill's frontmatter is reported as **author-declared**, not legally verified. Missing source, ref or license fields remain unknown; the CLI never guesses.

## Preparing a public catalog

Before committing a catalog entry:

1. Confirm the original repository URL is public and points to the actual skill.
2. Identify its original author and canonical skill directory.
3. Inspect the repository's LICENSE and any per-file licensing terms. Attribution alone is not a redistribution grant.
4. Verify the pinned tag or commit where feasible. Review the skill and any bundled scripts for prompt injection, secrets and unintended commands.
5. Exclude private/local skills, credentials, proprietary material and uncertain origins.
6. Link to upstream wherever possible. Prefer metadata-only entries instead of vendoring third-party content.

**No automatic public export, mass download, installation, license verification or publishing is implemented yet.** Future versions may add a reviewable source manifest with explicit opt-in approvals and update checks.

## Distinguish this project from the Skills installer

The [Vercel Skills CLI](https://github.com/vercel-labs/skills) handles finding, adding and updating remote skills. Agent Commons currently focuses on *safe synchronization across agent configurations* and *local source inventory*. A future integration should reuse existing standards and lockfiles rather than implement an incompatible package manager.

## Security

Skills are instructions that can influence an agent, and may include executable scripts. Treat new versions as untrusted code. Always review upstream changes before enabling automatic updates.
