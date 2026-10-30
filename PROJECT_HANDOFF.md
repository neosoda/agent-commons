# Agent Commons — PROJECT_HANDOFF

> **Operational handoff, last verified: 2026-10-30.** Read this file before modifying the repository; then check live `main`, release/tag, PRs, issues and GitHub Actions **by exact commit SHA**. Historical SHA and run IDs below are a snapshot, not a promise of current status. This review used the connected GitHub repository only; it did **not** inspect the user's Windows PC, npm account or private agent configurations.

## 1. Product, distribution and safety boundaries

**Goal:** local-first multi-agent AI skills and MCP configuration management, with
a shared skill library, central MCP manifest, per-agent profiles, optional
curated public GitHub skill installer, explicit sync, backups and safe recovery.

**Architecture:** TypeScript strict, Node.js >=22, native ESM, `jsonc-parser` as
the only runtime package. Source: `src/agents` (17 known environments),
`src/sync` (skills/JSON/JSONC/TOML MCP adapters), `src/core` (link/junction
handling, safe backup/restore), `src/commands` (CLI), `src/web` (local
HTTP and framework-free Skill Hub), `src/security`, `src/test`, `scripts`.
Public catalog assets in `catalog`; end-user documentation in `README.md`.

**Published stable version:** [GitHub **v0.3.0**](https://github.com/neosoda/agent-commons/releases/tag/v0.3.0),
tag at `0b03e439194db99042d9b57065e2b8b115dfdf0d`, ZIP Windows x64 and
matching SHA-256 uploaded. [Published release record](docs/releases/v0.3.0.md).
The official ZIP's SHA-256 is
`fe39656a51a609ba96c9d70b01de4336b148299787a30ca1a75d70df42421cc9`.
Never move a published tag or silently modify a release asset.

**Runtime safety invariants:**
- UI binds **127.0.0.1 only**, has **no authentication** and must **never** be
  exposed by tunnel, proxy, port forward or LAN address. Strict Host/Origin,
  CSRF, CSP; do not expose MCP secrets or raw private filesystem errors.
- No telemetry or unattended writes. Public skill installs/updates do use
  explicit HTTPS GitHub requests; ordinary local sync/catalog browsing does not.
- Skills and MCP are only changed after explicit previews/approvals. Never
  silently overwrite unmanaged skill folders or native agent custom fields.
- Symlinks and NTFS junctions must never be traversed by destructive cleanup;
  snapshots preserve recoverable originals where possible. Do not promise
  atomic recovery in every crash/power-loss scenario.
- Private `--home` overrides and synthetic HOME used by all acceptance tests;
  **never perform automated tests against real user agents**.

## 2. Completed, verified changes

| Topic | Key PRs |
|---|---|
| Initial local Skill Hub and publishing | [#17](https://github.com/neosoda/agent-commons/pull/17), [#20](https://github.com/neosoda/agent-commons/pull/20), [#21](https://github.com/neosoda/agent-commons/pull/21), [#24](https://github.com/neosoda/agent-commons/pull/24), [#26](https://github.com/neosoda/agent-commons/pull/26) |
| Restore staging, rollback, filesystem checks, private HTTP errors | [#28](https://github.com/neosoda/agent-commons/pull/28), [#30](https://github.com/neosoda/agent-commons/pull/30), [#32](https://github.com/neosoda/agent-commons/pull/32), [#34](https://github.com/neosoda/agent-commons/pull/34) |
| Keyboard navigation, contrast, FR/EN language and dynamically translated UI messages | [#36](https://github.com/neosoda/agent-commons/pull/36), [#38](https://github.com/neosoda/agent-commons/pull/38), [#39](https://github.com/neosoda/agent-commons/pull/39), [#41](https://github.com/neosoda/agent-commons/pull/41) |
| Concurrent refreshes, preserving drafts/focus, async MCP and sync previews | [#43](https://github.com/neosoda/agent-commons/pull/43), [#45](https://github.com/neosoda/agent-commons/pull/45) |
| Distributed Windows ZIP, verified extracted portable package, v0.3.0 publication | [#47](https://github.com/neosoda/agent-commons/pull/47), [#48](https://github.com/neosoda/agent-commons/pull/48) |
| **P1 after v0.3.0:** one-time sync preview tokens tied to inspected managed input revision + dry-run plan; save profile bound to its original agent and independent draft | [#49](https://github.com/neosoda/agent-commons/pull/49), merged `ea9b3f2c64ca1c5665b8b6e326a534b1ea8471f2` |

**v0.3.0 release gates on published SHA:** six CI matrix jobs
[success](https://github.com/neosoda/agent-commons/actions/runs/41059690473),
real Chromium browser QA
[success](https://github.com/neosoda/agent-commons/actions/runs/41059690292),
ZIP and extracted-runtime Windows verification
[success](https://github.com/neosoda/agent-commons/actions/runs/41059690154).
Publishing workflow
[success](https://github.com/neosoda/agent-commons/actions/runs/41059819873)
verified the ZIP checksum and attached both official assets.

**New P1 on `main` `ea9b3f2` (NOT included in the immutable v0.3.0 ZIP):**
[CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41087377894),
[Chromium](https://github.com/neosoda/agent-commons/actions/runs/41087377881),
[Windows portable](https://github.com/neosoda/agent-commons/actions/runs/41087377883)
all `completed/success`.
- `src/web/sync-revision.ts` fingerprints managed sync inputs with `lstat`
  (no linked-target traversal), content hashes for small files, stat metadata
  for large files. This is an **optimistic concurrency check**, not an
  OS-level cross-process lock; no guarantee against all TOCTOU/power failures.
- `src/web/server.ts` issues a **one-use 5-minute preview token** for saved
  profile sync or full skills+MCP sync, and checks the same revision and full
  dry-run report again before applying. If a config/skill/profile changes,
  the request fails closed and requires a fresh preview.
- `src/web/ui.ts` forwards tokens, binds a save/clear action to the selected
  agent at click time, and preserves unrelated unsaved profile drafts.
- HTTP unit tests exercise stale/duplicated tokens, changed central MCP,
  profiles and skills; actual Chromium tests cover a delayed agent save while
  switching the selected agent.

## 3. Current P2 cleanup and release qualification

**On branch `chore/post-release-security-docs-handoff-20261030`, pending merge:**
- Remove `.github/workflows/release-v0.3.0.yml`, a **one-time workflow that
  already published v0.3.0** and unnecessarily runs on subsequent main pushes.
  Keep `release-assets.yml` for future manually published releases.
- Fix `SECURITY.md` support policy to reflect v0.3.x, no telemetry vs
  user-requested GitHub network fetches, local UI security and actual
  filesystem/rollback limits.
- Update `README.md` and `docs/releases/v0.3.0.md` to reflect the
  **actually published** release instead of future plans.
- Add standalone `scripts/check-published-windows.ps1` to test the
  **downloaded** ZIP on an independent Windows machine (SHA, extraction into
  spaced path, embedded runtime version, local UI/API in synthetic HOME).
- Add [physical Windows / screen-reader acceptance checklist](docs/qa/RELEASE_ACCEPTANCE.md).
- Simplify this handoff, remove obsolete instructions such as republishing
  npm v0.2.0 or claiming the v0.3.0 release still needs creation.
- Update [#18](https://github.com/neosoda/agent-commons/issues/18) to reflect
  existing *limited* MCP editor and track only advanced editing scope.

**Remaining external/manual work — not passed by CI:**
- Physically download the v0.3.0 public ZIP and test on a separate Windows
  machine, including SmartScreen, first start/stop, browser and synthetic
  backup/restore.
- NVDA on Windows and VoiceOver on macOS through the test checklist.
- Windows executable signing if reputation and enterprise distribution require it.
- First authorized publication of `@neosoda/agent-commons` to npm:
  scope owner/2FA/Trusted Publisher needed. `publish.yml` is gated by
  `NPM_PUBLISH_ENABLED=true` and must not be enabled before owner bootstrap.
- Future optional editor feature: update existing MCP command/URL/env references
  without ever exposing existing secrets in the browser.

**Decision:** current software can be publicly downloaded through GitHub.
After the P1/P2 cleanup, any patch incorporating post-v0.3.0 fixes must
receive a **new tag**, preferably `v0.3.1`; do not claim the existing
v0.3.0 ZIP includes #49.

## 4. Quality gates for every future PR / release

1. Verify live branch SHA, pending PRs/CI, GitHub releases and user worktree
   status if a local checkout is accessible. Do not overwrite uncommitted work.
2. Run `npm ci`, `npm run typecheck`, `npm test`,
   `npm audit --audit-level=high`, `npm pack --dry-run`.
3. On **exact PR head SHA** require **6 successful matrix jobs** (Windows,
   Ubuntu, macOS × Node 22/24), successful real Chromium browser QA, and
   successful Windows portable packaging/extraction tests.
4. Squash merge only after the gate, verify all three on the resulting `main`
   SHA, ensure no open PR remains unexpectedly.
5. Update handoff with actual SHA/run evidence, and never advertise an
   unreleased version or npm package.
6. Publish a new release only from the validated commit with its matching
   archive/checksum. A GitHub `GITHUB_TOKEN`-created release does not
   automatically trigger `release.published`; attach assets in the
   creating workflow or publish manually.

## 5. Next-session resumption prompt

> Reprends https://github.com/neosoda/agent-commons. Lis
> `PROJECT_HANDOFF.md` puis vérifie les HEAD SHA/runs sur GitHub en direct.
> Release publique v0.3.0 tag `0b03e43`, ZIP+SHA publiés ; ne pas
> retagger. La PR #49 a fusionné en `ea9b3f2` avec CI 6/6,
> Chromium et portable Windows verts : aperçu → apply lié à un ticket
> unique et à la révision des inputs, sauvegarde de profils protégée
> contre le changement d'agent. Vérifie puis fusionne la PR sur
> `chore/post-release-security-docs-handoff-20261030` après les
> neuf contrôles, revalide `main`, et confirme que le workflow
> `release-v0.3.0.yml` est retiré. Le ZIP public v0.3.0 ne contient
> PAS ces nouveaux correctifs : préparer si souhaité v0.3.1 avec
> nouvelles validations et tag/ZIP, sans effacer v0.3.0. Tests
> physiques Windows et NVDA/VoiceOver non réalisés ; npm non
> publié (scope/2FA/Trusted Publisher propriétaire). Aucun agent
> réel ni secret dans les essais ; UI uniquement 127.0.0.1.
