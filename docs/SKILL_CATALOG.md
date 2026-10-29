# Public Skill Hub: provenance, security and publishing

Agent Commons now maintains a **metadata-only public catalog** in [`catalog/skills.json`](../catalog/skills.json), with categories and a JSON Schema. The generated [skill index](skills/README.md) links to the original authors, pinned upstream Git commits and license texts.

## Two separate inventories

- **Public:** `agent-commons catalog list`, `catalog search <term>` and `catalog info <id>` read the bundled, curated metadata entirely offline. No network access and no third-party skill files are bundled.
- **Private local inventory:** `agent-commons catalog` and `catalog --json` read your local `~/.agents/skills` and Vercel-style lockfiles. This is *never* published or included in public catalog builds.

**Recommended starting point for a large local library:**

```bash
node dist/cli/index.js catalog review
node dist/cli/index.js catalog review --json
```

The review reports missing sources, missing author-declared licenses, unpinned refs and duplicate upstream skill paths. It suggests a category based on the directory name, but it does **not** verify license rights, repository publicity or code safety. A detected duplicate is not deleted or automatically merged.

You may redirect private local inventory to a file on your own computer for manual review:

```bash
node dist/cli/index.js catalog --json > skill-catalog-private.json
```

**Do not commit that file.** It can contain names and URLs of private projects, even though credential-bearing URLs are filtered.

## Scope of verification

The public catalog currently includes **89 metadata-only references**, checked against public upstream SKILL.md files, pinned commits and applicable license texts on 2026-10-29.

New contributions must provide:

1. Canonical, public repository URL and original author.
2. An exact repository-relative `SKILL.md` path and immutable commit ref.
3. A link to the applicable upstream license, checked at that commit.
4. Description, category, tags and any visible dependencies.
5. A review date and explicit security-review limitation.

Missing origin, private repository, unknown license, ambiguous author or unsafe links? **Exclude the entry until manually resolved.** Do not infer or invent metadata.

## Updating the index

```bash
npm ci
npm run catalog:generate
npm test
```

The generator reads the validated public metadata, overwrites **only** `docs/skills/README.md` and produces stable Markdown. The CI tests verify that the committed document matches the manifest.

No automatic upstream updates or external network calls are performed. Propose changes through a PR, inspect the diff, then review before merging. Never publish a raw local inventory directly.

## Installation and updates

`catalog install` and `catalog update` currently fail closed with clear messages. A future release may integrate the existing [Vercel Skills manager](https://github.com/vercel-labs/skills) with explicit user confirmation, pinned revisions, safe destination handling and rollback. **No third-party code executes during catalog browsing or tests.** Users who choose to install upstream skills should review the upstream repository themselves.

Agent Commons is a synchronizer, not a replacement for the original author's package manager.

## Security and licensing

An open-source repository or license notice does not make its scripts trustworthy. Attribution is mandatory, and a public catalog entry does not grant extra rights to redistribute the underlying files. Always review scripts for unexpected execution, prompt injection, credential access, network actions and file operations before adding skills to an AI agent.

## Community contributions

The public catalog accepts pinned skills from GitHub, GitLab and Codeberg, including nested directories and repository-level LICENSE files. The schema validates URL structure and commit pins, **not** whether a license actually applies. Submit [a Skill Hub proposal](../.github/ISSUE_TEMPLATE/submit_skill.yml) or a PR containing metadata and links to upstream evidence. An actual reviewer must confirm the source, author, license and content before merging. Avoid attaching personal/local review reports to public issues.
