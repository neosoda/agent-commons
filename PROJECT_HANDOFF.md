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

**Published stable version:** [GitHub **v0.3.1**](https://github.com/neosoda/agent-commons/releases/tag/v0.3.1),
tag at `9c1735aed0226dfa0eff4165753368c2daf2aa02`, ZIP Windows x64 and
matching SHA-256 uploaded. Historical [v0.3.0](https://github.com/neosoda/agent-commons/releases/tag/v0.3.0) remains unchanged. [Published release record](docs/releases/v0.3.0.md).
The current v0.3.1 ZIP's SHA-256 is
`9f78bd4ee06f913e2f0b1d1492718282b498b08e03735cfd49bde01e9b345c7d`.
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

**P1 code merged at `ea9b3f2` and now included in published v0.3.1 (but NOT the historical v0.3.0 ZIP):**
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

**Completed via [PR #50](https://github.com/neosoda/agent-commons/pull/50), merged `b63de5682c7fd291a34f9a626fab772a2af5a5b8`:**
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
P1 and P2 are included in the **published v0.3.1** ZIP. Never move the historical v0.3.0 tag or imply it contains #49.

## 3.1. v0.3.1 — published and verified

- **Public release:** [Agent Commons v0.3.1](https://github.com/neosoda/agent-commons/releases/tag/v0.3.1), tag `9c1735aed0226dfa0eff4165753368c2daf2aa02`, official ZIP `AgentCommons-win-x64-portable.zip` (36,417,728 bytes) and `.sha256` present.
- **ZIP SHA-256:** `9f78bd4ee06f913e2f0b1d1492718282b498b08e03735cfd49bde01e9b345c7d`, verified in release metadata and workflow publication.
- **CI on the exact released commit:** [six matrix jobs](https://github.com/neosoda/agent-commons/actions/runs/41089403176), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41089402974), [Windows ZIP packaging and smoke](https://github.com/neosoda/agent-commons/actions/runs/41089403168) all `completed/success`.
- [PR #51](https://github.com/neosoda/agent-commons/pull/51) merged for version+lock 0.3.1, patch notes and gated publisher. The **one-shot** `release-v0.3.1.yml` was removed in follow-up branch `chore/retire-v031-publisher-final-handoff-20261030` after checking actual release tag and assets.
- **Still manual:** physical Windows PC first-run/SmartScreen, actual NVDA/VoiceOver reader testing, code signing, npm owner bootstrap and Trusted Publishing. [Acceptance checklist](docs/qa/RELEASE_ACCEPTANCE.md); [standalone ZIP verifier](scripts/check-published-windows.ps1). Do not claim those physical checks passed until performed.

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

> Reprends https://github.com/neosoda/agent-commons. Lis ce fichier intégralement et contrôle `main`, PR ouvertes, releases, issues et workflows en direct. **Dernière release publique vérifiée v0.3.1**, tag SHA `9c1735a`, ZIP et `.sha256` disponibles. P1 [#49](https://github.com/neosoda/agent-commons/pull/49) : sync preview/apply jeton unique+révision filesystem+plan, erreurs fail-closed, profil async lié à l'agent initiateur. P2 [#50](https://github.com/neosoda/agent-commons/pull/50) : nettoyage workflow v0.3.0, SECURITY/README/handoff, script autonome ZIP Windows, grille NVDA, issue MCP #18 clarifiée. Patch [#51](https://github.com/neosoda/agent-commons/pull/51) v0.3.1 publié. La branche `chore/retire-v031-publisher-final-handoff-20261030` supprime son workflow one-shot et met à jour le handoff : **fusionner uniquement après CI 6/6, Chromium et portable Windows success sur SHA PR exact**, puis recontrôler main. Pas de test Windows/NVDA réel, ni signature Windows, ni npm autorisé : ces étapes externes nécessitent une machine ou le compte propriétaire. Ne pas exposer le Skill Hub (127.0.0.1 sans auth), ne pas toucher aux vrais agents/secrets, ne jamais déplacer les tags historiques. Toute future modification nécessite une nouvelle version et une validation complète.

## 6. In-progress hardening — duplicate JSONC properties (2026-10-30)

Branch `fix/mcp-jsonc-duplicate-keys-20261030` addresses ambiguous JSONC manifests before pursuing advanced MCP editing in issue #18. `JSON.parse` accepts duplicate object keys (last wins), while a path-based JSONC editor can modify a different occurrence. MCP editor now walks the parsed AST to reject duplicate keys at any nesting level, prior to preview or write, and maps this to a fixed browser-safe error. Added synthetic-HOME regression cases for repeated server names, command, env keys and root manifest fields. No existing secret or vendor field is returned to the browser. **Validation pending:** local `npm ci`, typecheck, npm test, audit and pack, followed by exact-head CI 6/6, Chromium and Windows portable; do not merge without them. No new release is published by this branch. Next: verify automated gates and then continue issue #18 advanced editing in a separate, reviewed feature PR.
