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

The public catalog currently includes **103 metadata-only references**, checked against public upstream SKILL.md files, pinned commits and applicable license texts on 2026-10-29.

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

## Pinned GitHub installation (limited)

The `catalog install <id>` command **previews only**, by fetching a GitHub tree at the 40-character commit recorded in the curated catalog. Browsing, search and local inventory remain completely offline.

```bash
node dist/cli/index.js catalog install skill-creator
node dist/cli/index.js catalog install skill-creator --yes
```

The second command is **explicit user approval**. It retrieves only the files from the pinned skill folder, verifies their Git SHA-1 blob hashes, writes into a temporary staging folder, creates a baseline Agent Commons snapshot and atomically moves the staged skill into the central library. It refuses an existing folder or junction, archived entries, symlinks, git submodules, unsafe paths, suspicious names, truncated Git trees, over 150 files, individual files over 1 MiB and total payloads over 8 MiB. It does not execute fetched scripts, modify agent configurations, or automatically synchronize.

**Limitations:** Only public GitHub sources are supported for installation. A checked upstream license is not a code safety guarantee; users must still inspect the actual files. Snapshot creation can reject an existing environment with unsupported linked content (fail closed). The baseline snapshot does not automatically uninstall a newly added skill; rollback for a failed stage cleans up the temporary directory. There is no network request in CI tests: all GitHub responses are faked locally.

### Offline uninstall of a managed skill

```bash
node dist/cli/index.js catalog uninstall skill-creator
node dist/cli/index.js catalog uninstall skill-creator --yes
node dist/cli/index.js restore <snapshot-id>
```

The default command is an **offline preview with no writes**. It validates the install receipt, all recorded Git blob hashes, exact file/directory inventory and source provenance, and refuses unknown files, modified files, nested links/junctions, or skills currently linked to an agent. **No untracked files are ever deleted.** Only `--yes` backs up that single skill through the existing snapshot mechanism and then removes the intact physical directory. The returned snapshot ID is used for a reversible `restore`. A failed deletion attempts restoration from that snapshot.

Uninstall does not automatically unlink agent configurations: the user must first detach any links through an independently verified safe workflow.

`catalog update` and `catalog outdated` remain **disabled** pending safe updates and upstream freshness verification. Installed third-party scripts are still untrusted; no script execution is part of uninstall.

We evaluated the existing [Vercel Skills manager](https://github.com/vercel-labs/skills), which is useful for interactive installations across many agents. Agent Commons intentionally uses a narrower pinned-commit, staging-only workflow initially so it can reject unsupported transformations and avoid implicit changes outside its central library.

## Security and licensing

An open-source repository or license notice does not make its scripts trustworthy. Attribution is mandatory, and a public catalog entry does not grant extra rights to redistribute the underlying files. Always review scripts for unexpected execution, prompt injection, credential access, network actions and file operations before adding skills to an AI agent.

## Community contributions

The public catalog accepts pinned skills from GitHub, GitLab and Codeberg, including nested directories and repository-level LICENSE files. The schema validates URL structure and commit pins, **not** whether a license actually applies. Submit [a Skill Hub proposal](../.github/ISSUE_TEMPLATE/submit_skill.yml) or a PR containing metadata and links to upstream evidence. An actual reviewer must confirm the source, author, license and content before merging. Avoid attaching personal/local review reports to public issues.
