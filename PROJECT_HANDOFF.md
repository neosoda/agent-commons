# Agent Commons — PROJECT_HANDOFF

> **Operational handoff, last verified: 2026-11-18 (section 31; v0.5.4 published and its public Windows ZIP verified).** Read this file before modifying the repository; then check live `main`, release/tag, PRs, issues and GitHub Actions **by exact commit SHA**. Historical SHA and run IDs below are a snapshot, not a promise of current status.

## 0. Extension Manager — delivered (initial implementation 2026-11-15)

**Branch:** feat/extension-manager-v05 · **PR:** https://github.com/neosoda/agent-commons/pull/76 — merged into `main` as `8a10927` (verified 2026-11-17), included in current release v0.5.4. Web management improvements are described in sections 29-31.

- Adds reviewed npm/uv managed MCP package lifecycle and a combined dashboard of packages and Skills; manual-only/unknown MCPs remain noninstallable from the UI.
- Adds scoped central MCP provisioning for Playwright, Filesystem, Fetch and Git and targeted client sync with explicit preview and consent.
- Existing native client configurations are preserved; **package uninstall DOES NOT remove native configs**, and update checks compare only to locally reviewed pinned versions. These are explicit product limitations, not hidden TODOs.
- Package installations use staging, rollback-on-failure where possible, no shell invocation, npm ignore-scripts and uv binary-only installs; receipt stored inside ~/.agents. No real user environment was modified.
- Test suite extends src/test/mcp-extension-manager.test.ts with synthetic homes and fake package managers. Validate the exact PR head SHA with CI 6/6, Chromium and Windows portable workflow before merging; inspect logs, then update handoff with final evidence.
- Follow-up backlog: live upstream update review, runtime MCP health checks, safe native unregistration and transactional batch operations.
- Reference: docs/EXTENSION_MANAGER.md.

## 1. Product, distribution and safety boundaries

**Goal:** local-first multi-agent AI skills and MCP configuration management, with
a shared skill library, central MCP manifest, per-agent profiles, optional
curated public GitHub skill installer, explicit sync, backups and safe recovery.

**Architecture:** TypeScript strict, Node.js >=22, native ESM, `jsonc-parser` as
the only runtime package. Source: `src/agents` (21 registered environments, including MCP-only LM Studio),
`src/sync` (skills/JSON/JSONC/TOML MCP adapters), `src/core` (link/junction
handling, safe backup/restore), `src/commands` (CLI), `src/web` (local
HTTP and framework-free Skill Hub), `src/security`, `src/test`, `scripts`.
Public catalog assets in `catalog`; end-user documentation in `README.md`.

**Current published stable version:** [GitHub **v0.5.4**](https://github.com/neosoda/agent-commons/releases/tag/v0.5.4), tagged exactly at `313346b5cad973f535bbfa88910ef94623242dd9`; Windows ZIP (36,562,044 bytes) plus matching SHA-256 are published. Verified ZIP SHA-256: `93d8722c8804c4e3e5aaa163e36709a2bfc60158ef898eaac0b59e314800c84e`. [Full release verification](docs/releases/v0.5.4.md).

**Previous published stable version:** [GitHub **v0.5.3**](https://github.com/neosoda/agent-commons/releases/tag/v0.5.3), tag at `6f8d59b73b6986074d9782f3049767cc618efb51`, ZIP Windows x64 and matching SHA-256 uploaded. [Published release record](docs/releases/v0.5.3.md). Historical tags and assets remain unchanged.
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

> Reprends https://github.com/neosoda/agent-commons. Lis ce fichier intégralement puis contrôle en direct le worktree, main, les PR, les releases/tags et leurs workflows par SHA exact. Dernière release publique vérifiée : **v0.5.4**, tag `313346b5cad973f535bbfa88910ef94623242dd9`, ZIP Windows et SHA-256 publiés et testés sous HOME synthétique (voir docs/releases/v0.5.4.md). PR #87 fusionnée après huit contrôles réussis, main revalidé avant publication. Le logiciel installé localement reste 0.5.4-dev.0 sur le port 4174 ; ne pas le confondre avec la release stable publique. Aucun npm publié, aucune signature Windows, aucun test NVDA/VoiceOver/SmartScreen revendiqué. Préserver les configurations et secrets réels, les aperçus/confirmations, le serveur lié à 127.0.0.1 et les tags historiques. Consulter la section finale pour le suivi documentaire et la prochaine action ; toute nouvelle fusion exige les six jobs CI, Chromium et portable Windows sur le SHA exact, puis le contrôle de main.

## 6. In-progress hardening — duplicate JSONC properties (2026-10-30)

Branch `fix/mcp-jsonc-duplicate-keys-20261030` addresses ambiguous JSONC manifests before pursuing advanced MCP editing in issue #18. `JSON.parse` accepts duplicate object keys (last wins), while a path-based JSONC editor can modify a different occurrence. MCP editor now walks the parsed AST to reject duplicate keys at any nesting level, prior to preview or write, and maps this to a fixed browser-safe error. Added synthetic-HOME regression cases for repeated server names, command, env keys and root manifest fields. No existing secret or vendor field is returned to the browser. **Validation pending:** local `npm ci`, typecheck, npm test, audit and pack, followed by exact-head CI 6/6, Chromium and Windows portable; do not merge without them. No new release is published by this branch. Next: verify automated gates and then continue issue #18 advanced editing in a separate, reviewed feature PR.


## 7. Offline context router — merged (2026-11-01)

**Merged [PR #54](https://github.com/neosoda/agent-commons/pull/54)** into
`main` at `694ae5ebfeb31dc549e3529fb0332527928603e2` (squash merge).
Added the offline, read-only `context <task>` CLI command: deterministic
keyword ranking over locally installed physical skills, optional saved-profile
allowlist, metadata-only recommendations by default, explicit `--expand` for
full SKILL.md, and an approximate output token budget. No ECC content was
copied, and no hooks, additional subagents, network activity, telemetry,
implicit agent configuration edits or automatic prompt injection were added.

**All PR-head verification passed** at `231726f2f284a3b7e03f754cf6261561d06c2045`:
- [CI matrix 6/6](https://github.com/neosoda/agent-commons/actions/runs/41306754670)
  (Windows, macOS, Linux × Node 22 and 24), including npm ci, typecheck,
  tests, audit (high) and pack dry-run.
- [Chromium browser QA](https://github.com/neosoda/agent-commons/actions/runs/41306754705).
- [Windows portable ZIP build and smoke](https://github.com/neosoda/agent-commons/actions/runs/41306754730).

**Caveats:** budget estimate is UTF-8 byte size/4, not a provider tokenizer
measurement or a guarantee of actual Claude/Codex consumption. Ranking is
keyword-based, not semantic. This command does not automatically alter agents'
active context. No new release or npm publication has been made; public stable
release remains v0.3.1. Main-branch CI for the merged SHA should also be checked.



## 8. Circular central junction remediation (2026-11-06, merged PR #56)

Investigated a reported local Windows library with self-referential NTFS
junctions under `~/.agents/skills/`, legitimate physical sources beneath
`.sources/`, and dependent broken agent links. Repository-only investigation:
no local workstation paths or skill files were accessed.

Merged in [PR #56](https://github.com/neosoda/agent-commons/pull/56): the low-level link creator rejects self/ancestor
cycles; doctor flags central circular junctions as unhealthy; sync reports
central links instead of silently ignoring them; `repair-central` defaults
to preview and only with `--yes` copies unambiguous physical `.sources`
skills into the central library, archiving old junctions for recovery. A
synthetic-HOME regression suite covers dry-run, unique/ambiguous sources,
nested link refusal, source preservation, and agent sync after recovery.

**Validation:** the exact PR head `ee708ac5ec9b1b5a87aab3029d68f8cd0f161f3e`
passed all [six CI matrix jobs](https://github.com/neosoda/agent-commons/actions/runs/42263455310),
[Chromium browser QA](https://github.com/neosoda/agent-commons/actions/runs/42263455032),
and [Windows portable packaging](https://github.com/neosoda/agent-commons/actions/runs/42263455046).
Squash-merged into `main` as `bb7b31332cddc14fbc953f08b2f6987a678dbd9e`.
**Main-branch post-merge checks were still in progress when this handoff
update was authored.** No real Windows user machine was accessed or repaired.
Never mass-delete links or treat missing/unmatched sources as recoverable.
Follow with doctor and skills-only preview on the user's machine before
applying agent sync.

## 9. Find Skills activation guidance (2026-11-08)

The Vercel Labs `find-skills` entry **already existed** in the curated
`catalog/skills.json` at pinned commit `92a9a34ac3bf88e695e468b90c7bf32f163d32c8`
(MIT, reviewed metadata dated 2026-10-29). The upstream pinned folder
contains `SKILL.md`; no duplicate catalog entry or vendor copy was needed.

This change adds `docs/FIND_SKILLS.md` and links its approval-based
installation, integrity verification and selective agent sync from `README.md`
and `AGENTS.md`. It forbids silently invoking upstream `npx skills add -g -y`
in place of the existing managed workflow. No executable code, catalog metadata,
MCP configs, local skills, or user machines were changed. A repository change
**cannot install the skill on the user's private PC**; that requires running
the documented commands locally. No published release was changed.

Validation status when authored: guidance only; GitHub PR CI and physical
Windows verification have not yet been confirmed. Before merging check the
exact PR-head CI 6/6, Chromium and Windows portable gates; after merge check
main. Next: activate locally through `catalog install find-skills` then
selective `sync --skill find-skills` for the desired installed agents.

## 10. Upstream credits and README drift protection (2026-11-08)

Added a prominent `Credits and upstream projects` section in `README.md` for
runtime/dev/test dependencies, design inspirations and all **16 upstream
repositories representing 103 reviewed skill references**. Each repository is
credited by upstream URL, maintainer, number of skill references and manifest
license; per-skill pinned commits and exact license evidence remain in
`docs/skills/README.md`. Private local skill libraries are excluded.

Extended `scripts/build-catalog.mjs` to generate the README's marked
upstream table from the validated public catalog; `catalog:check` now fails
when a manifest change leaves README credits out of date. Documentation and
build-time verification only: no third-party skill files, local agent settings
or MCP configurations modified.

**At authorship:** work on branch
`docs/complete-upstream-credits-20261108` pending PR validation. Exact-head
CI matrix 6/6, Chromium and Windows portable required before merging; verify
main branch after merge.

## 11. Documentation bilingue (2026-11-08)

French is now the default GitHub landing page in `README.md`, translated from
the complete prior English documentation including CLI, data-safety limitations,
Windows portable installation and all third-party credits. Original English
documentation is preserved as `README.en.md` (plus a language switcher in
both files). Relative links continue to resolve from the repository root.

`scripts/build-catalog.mjs` now regenerates and checks **both** README credit
sections using the curated public manifest. Future content, security and
behavior changes must be kept in sync in the two languages. `AGENTS.md`
records this requirement. No executable runtime or skill sync changes.

**At authorship:** changes are on `docs/bilingual-readme-fr-default-20261108`.
PR head CI 6/6, Chromium QA, Windows portable qualification and post-merge
main validation remain required. No local workstation was accessed.

## 12. ECC curated catalog collection (2026-11-14; PR pending)

Branch `feat/ecc-curated-skill-integration-20261114` from main `44627efec04b64aaf323d3c8666988dac4a43fc6`: **71 ECC skills** referenced at fixed [upstream](https://github.com/affaan-m/ECC) revision `d2ef2680594f9a17526a6e1a2e18b3d242c5d17b` (MIT). Every selected source contains a root `SKILL.md` and meets current file-count and file-size installer limits. `context-and-decisions` has a separate MIT license file, linked in its catalog entry. French and English README, catalog index, upstream credits and new bilingual guides updated.

This is metadata-only: no ECC code, hooks, dependencies, MCP config or private agent settings are changed. Discovery is `catalog search ecc`; preview/install/verify/sync use the existing guarded commands. **Pending:** CI against exact PR head (six matrix jobs, Chromium, Windows portable), local npm typecheck/test/audit/pack, PR merge and post-merge main CI. No tests, installations, user PC state or releases are claimed as verified. See `docs/ECC.md`.

## 13. Three new curated upstream sources (2026-11-14; PR pending)

Branch `feat/curated-skills-chief-anatomy-marketing-20261114`: seven new references (chief-of-staff, retro, to-spec, to-tickets, implement-spec, anatomy, marketing-psychology). Pinned commits: mattpocock/skills `5863806dd4e15c63174bee4e7515a4256792ecfa`, wheresryan22/anatomy `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`, coreyhaines31/marketingskills `1f837447b20bb6f0e72d87b80ece1c221c362c7d`, licenses MIT. Catalogue: 174 -> 181 entries, 17 -> 20 repositories. Chief of Staff is experimental and requires manual dependencies/host compatibility.

Anatomy uses reviewed `installPaths` for 126 source files (1,881,405 bytes), excluding generated HTML/PDF; it retains the original install limits and hash/backup/no-overwrite requirements. Source subset selection is fail-closed and tested for missing paths, symlinks and invalid selectors. French and English guides and credits updated. **Pending:** exact PR-head CI six-matrix + Chromium + Windows ZIP, then merge and verify main CI. No local agent installations or physical Windows tests are claimed.


## 14. Smart Skill Router — implementation branch (2026-11-14)

Branch `feat/smart-skill-router-20261114` extends, rather than replaces, the offline `context` router. `src/commands/smart-skill-router.ts` adds local/catalog metadata discovery, deterministic ranking, duplicate filtering, bounded manual or automatic selection, absent-skill hints, dependency inspection and explicit local-only `loadSkill`/`loadSkills`. CLI `skills route/load/deps` emits JSON for agents, with TS exports. Optional `~/.agents/skill-router.json` enforces safe defaults. No automatic prompt injection, remote fetch/install, script execution, server, new dependency, or native client hook. Existing `context` remains backward compatible.

**At authorship:** code/tests/docs added, exact-head CI and PR verification pending. Never claim merged/released or Windows/macOS QA until checked. Before merge require six CI jobs, Chromium and Windows portable checks on the exact PR SHA. No private workstation was accessed. A future dedicated MCP bridge would require separate design and client-specific validation.

## 15. Lemo-Opuscar — catalogue sélectif (2026-11-14)

Branche `feat/lemo-opuscar-catalog-20261114` (PR à ouvrir) : ajout d'une référence épinglée au commit `3a7132b996be0241c1ea0ab180d519f06e6f10b6` de [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar). Entrée `lemo-opuscar` : installation sur accord des seuls `SKILL.md` et `scripts/setup.sh` (13 223 octets). Le reste des 99 styles et la toolchain vidéo demeurent externes, non téléchargés lors du listing/routage, ni exécutés par Agent Commons. Métadonnées de licences mixtes CC BY-NC 4.0 (Markdown) et MIT (code), attribution générée FR/EN et guides `docs/LEMO_OPUSCAR*.md`.

**Important :** le `setup.sh` amont peut cloner/mettre à jour `main` et installer des dépendances lors de sa première invocation ; l'épinglage du catalogue ne couvre pas ce runtime. Usage avec accord explicite, ou clone runtime épinglé manuellement. Aucun accès à l'environnement privé, aucune exécution des scripts tiers ; aucune release créée. **À vérifier avant fusion :** `npm ci`, typecheck, tests + catalogue généré, audit high et pack dry-run, puis CI 6/6 + Chromium + Windows portable sur SHA exact de PR. Ne pas déclarer validé avant constat.


## 16. MCP Control Center v0.4.0 — implemented and merged (2026-11-14)

**Delivered:** [PR #64](https://github.com/neosoda/agent-commons/pull/64) squash-merged into `main` at `a57b2611ae77198f6066d8e893814c75ae92d75e` (2026-11-14). Verified PR head `4117d1d55f47a4b05f2ff54dd67b2203e220973c`. Other concurrent main additions (Smart Skill Router and Lemo-Opuscar catalog) were explicitly retained.

**Implemented on branch:** LM Studio native `~/.lmstudio/mcp.json` registration on Windows/Linux/macOS (MCP-only, no skills writes); selective `mcpServerFilterByAgent` merge using the existing conflict-preserving snapshot/rollback machinery; reviewed offline eight-server metadata catalog (pin known versions, mark unverified packages unavailable); custom MCP profile persistence/revisions with OSINT/Docker segregation; presets OSINT, Development and Infrastructure; read-only secure inventory and Skill Hub MCP Control Center with preview-bound sync, FR/EN labels and a synthetic regression suite.

**Security:** maintain loopback, Host/Origin, CSRF, CSP, no web-triggered process execution; never return command/env/secret values; refuse corrupt native configs; preserve unmanaged and custom client fields. Native client extras remain enabled even when excluded from a profile — these allowlists only restrict managed additions.

**Not implemented / not to claim:** automatic npm/PyPI provisioning, controlled package upgrades/uninstall, broad import of native configurations into the central manifest, live MCP process health, full version reconciliation. Catalog entries for unverified OSINT/Web Search remain disabled. No local personal agent or actual Windows PC was accessed; at implementation merge time v0.4.0 had not yet been released. It was subsequently published on GitHub; no npm publication.

**Actual controls passed on exact PR head:** CI [run 43584559727](https://github.com/neosoda/agent-commons/actions/runs/43584559727) (six OS/Node jobs, including `npm ci`, `typecheck`, `npm test`, `npm audit --audit-level=high`, `npm pack --dry-run`); Chromium [43584559756](https://github.com/neosoda/agent-commons/actions/runs/43584559756); Windows portable [43584559776](https://github.com/neosoda/agent-commons/actions/runs/43584559776).

**Post-merge `main` validation passed** at `a57b2611ae77198f6066d8e893814c75ae92d75e`: CI [43584665618](https://github.com/neosoda/agent-commons/actions/runs/43584665618) (6/6), Chromium [43584665686](https://github.com/neosoda/agent-commons/actions/runs/43584665686), Windows portable [43584665615](https://github.com/neosoda/agent-commons/actions/runs/43584665615). At that time no new release or npm publication; no actual user MCP files changed by this work. v0.4.0 was subsequently published on GitHub.

**Next work:** implement separately approved, provenance-verified package lifecycle with per-server permissions and native config reconciliation; retain deny-by-default. Existing custom-profile saves and deletes now create recoverable snapshots; the existing backup system includes persisted profile files. All tests use temporary homes.


## 17. v0.4.0 published release (2026-11-14)

- Release preparation branch: `release/v0.4.0-20261114` (PR [#67](https://github.com/neosoda/agent-commons/pull/67), squash merged at `9a952793f2f6c9a665e3f960f3610c027d961f7c`), based on the verified post-MCP-merge `main` `e17d24abcf0fd02722b34b9ee8f5284aee12af09`. Release version is `0.4.0` in both `package.json` and `package-lock.json`. No unrelated branches or users' local MCP configurations are modified.
- FR/EN README, SECURITY, CHANGELOG and MCP guides aligned with 18 registered environments (including the MCP-only LM Studio client), 182 reviewed catalog skills, and accurately limited profile semantics. Distinguish managed additions from native server deactivation; third-party MCP package installation remains unimplemented.
- Release notes: `docs/releases/v0.4.0-release-notes.md`. One-shot workflow `.github/workflows/release-v0.4.0.yml` verifies the **exact merged `main` SHA**, six matrix CI jobs, Chromium, Windows portable, and the extracted ZIP/SHA-256 before it creates the GitHub tag/release and attaches both assets. It must not silently replace any existing version.
- **Verified published:** [GitHub v0.4.0](https://github.com/neosoda/agent-commons/releases/tag/v0.4.0) at exact tag commit `9a952793f2f6c9a665e3f960f3610c027d961f7c`. ZIP 36,485,546 bytes, SHA-256 `b333ddf4ac7aecc135f23914cf6ddb2ca8aad52817033c5f27ef7aca44859522` (the same in the Windows build log and GitHub asset digest). No npm publication. GitHub token-created releases do not trigger downstream `release.published` workflows.
- **Successful exact-main validation:** CI [43585791633](https://github.com/neosoda/agent-commons/actions/runs/43585791633) (6/6), Chromium [43585791635](https://github.com/neosoda/agent-commons/actions/runs/43585791635), Windows portable [43585791647](https://github.com/neosoda/agent-commons/actions/runs/43585791647); publication workflow [43585863084](https://github.com/neosoda/agent-commons/actions/runs/43585863084) verified release SHA and archive checksum and attached both assets. [Public verification record](docs/releases/v0.4.0.md). One-shot release bridge retired in follow-up reviewed PR; ongoing release-assets workflow remains for manual releases. Physical Windows and NVDA/VoiceOver acceptance remain unverified.


## 18. Grim Prompter threat modeling (2026-11-14; PR #69)

Branch `feat/grim-prompter-threat-model-20261114`, [PR #69](https://github.com/neosoda/agent-commons/pull/69): integrate [jmanico/grim-prompter](https://github.com/jmanico/grim-prompter) pinned to `2a94457c7bc63ffbc4a44ea50ae645ab8cee26bf` (MIT, Manicode Security), using existing reviewed catalog, installer, integrity audit and opt-in skill sync. Nested source entrypoint `skills/threat-model/SKILL.md` is preserved; the installer creates a deterministic root `SKILL.md` bridge and downloads only on explicit consent. For reviewed nested libraries only, file/byte limits are bounded at 400 files/16 MiB; normal skills retain 150 files/8 MiB. Upstream ships 36 architecture workflows, 29 methods and privacy/change workflows. No MCP server, new dependency, subagent, automatic run or fix.

Commands: `catalog install threat-model` (preview), `catalog install threat-model --yes`, `catalog verify threat-model`, `sync --skill threat-model --agent codex --dry-run` then approved sync. Claude native `/threat-model`; Codex native `$threat-model`; Gemini CLI must use actual client skill discovery, no invented universal slash. `quick` is default; `deep` explicit; `change` needs a prior JSON baseline. Reports generated by agent in target repository's `threat-model/`, protected by the target repository's own Git ignore/exclude (local Agent Commons ignore cannot protect other repositories). No actual report generated by this integration work.

Docs FR/EN in `docs/GRIM_PROMPTER*.md`, catalog/README generated credit table and index updated, focused synthetic tests for install/routing/integrity/limits added. **Verified on code head `79da1b5216ef9d9bd7893722358b9d0fefc07e2a`:** [six CI matrix jobs](https://github.com/neosoda/agent-commons/actions/runs/43587046345), [Chromium QA](https://github.com/neosoda/agent-commons/actions/runs/43587046284) and [Windows portable build](https://github.com/neosoda/agent-commons/actions/runs/43587046277) all completed successfully. PR #69 was squash-merged as `77bbd9c7bed66b1367d1909526f52e9f63e4efa8`; the exact merged SHA passed CI [43587344098](https://github.com/neosoda/agent-commons/actions/runs/43587344098) (6/6), Chromium [43587344132](https://github.com/neosoda/agent-commons/actions/runs/43587344132) and Windows portable [43587344038](https://github.com/neosoda/agent-commons/actions/runs/43587344038). No real agent session or external source inspection of a target project has been performed. No release intended.


## 19. SaaS Product Demo Video v2 catalog upgrade (2026-11-14)

Current existing `saas-product-demo-video` catalog entry updated from `74f4f7150810b1bb5bf9160c4a2742c5dce69b62` to `c93c00ff44a65eea25ac1bb773a4565c68893ff9` in [noamdorr/saas-product-demo-video](https://github.com/noamdorr/saas-product-demo-video), by Noam Dorr (MIT). The upstream skill was moved/expanded and contains **92 files / 622,353 bytes** under `skills/saas-product-demo-video/` (Remotion scaffold, script templates, components, checked-render utilities, references and native SKILL.md). Root publishing/evaluation files are not selected. The existing installer can safely handle the complete pinned skill tree without any source-code changes, new services or dependencies.

Catalog listing/routing is metadata-only; `catalog install saas-product-demo-video` is preview-only; `--yes` is required for pinned downloads and checksums. Then `catalog verify saas-product-demo-video`, `sync --skill saas-product-demo-video --agent codex --dry-run`, and approved sync. Claude Code `/saas-product-demo-video`, Codex `$saas-product-demo-video`, Gemini through client-native skills. The skill's rendering dependencies, third-party code execution and remote captures always require separate explicit authorization. Never auto-run upstream `npx skills add` instructions.

Documentation FR/EN in `docs/SAAS_PRODUCT_DEMO_VIDEO*.md`; both README sections, generated skill index, and focused mock-install/routing/integrity test updated. Do not claim physical agent installation, rendering, release or merged/CI state unless verified against live GitHub. No release planned.


## 20. Unified interactive skills / MCP discovery (2026-11-14)

Interactive catalog implemented inside existing local-only Skill Hub without new backend routes, dependencies or network operations. Three category-filterable tabs (Skills / MCP / All), text search, installed/configured versus reference statuses, all pinned public skill entries plus local skill names, all curated MCP references plus centrally configured/native detected MCP names. Clickable details explain how to preview/install/sync, open the existing MCP Control Center, and offer one/two copyable usage prompts (curated for selected skills and eight MCP sources, generic otherwise).

Only sanitized existing `/api/state` and `/api/mcp-center` inventory is used; third-party code and full skill bodies never load through the catalog. Local-only items are visibly unreviewed; configured/detected MCP is not asserted running, central-installed skill is not asserted linked; no commands, environment variables, paths, auth data or secret values exposed. No automatic installation/sync/script invocation. Interface FR/EN, fallback selectable prompt if clipboard blocked. Docs `docs/INTERACTIVE_CATALOG*.md`, FR/EN README, HTTP/Chromium QA updated. Verify exact PR head and post-merge main CI, Chromium and Windows portable before claiming delivery. No release requested.


## 21. Video Engine + Remotion Superpowers (2026-11-14 — merged, CI verified)

Work branch: `feat/video-engine-remotion-superpowers-20261114`. Scope: 16 new MIT source-and-license-reviewed **pinned catalog references** (catalog 199 skills, 24 upstream repos):
- [ninjasweb/video-engine-skill](https://github.com/ninjasweb/video-engine-skill/tree/cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5) — root `video-engine` with `SKILL.md` and nine `references/` guides.
- [DojoCodingLabs/remotion-superpowers](https://github.com/DojoCodingLabs/remotion-superpowers/tree/970efd2d2f4ce2492231a31ee684c2ead883f4bc) — all fifteen `skills/<id>/` folders as **individually installable entries**, preserving `remotion-production/rules/` and `setup-guide/rules/` in their respective scope.

Existing catalog protections unchanged: GitHub commit pin, explicit install preview and `--yes` approval, Git blob verification, offline `catalog verify`, opt-in sync, read-only metadata routing and bounded `skills load`. The two READMEs (French first, English second), index/credits, changelog and local interactive example prompts are updated. Bilingual instructions live in `docs/VIDEO_SKILLS*.md`; targeted synthetic tests in `src/test/video-skills.test.ts`.

**No vendored scripts**, no new runtime dependencies, no default native agent installation, no automatic render or API calls. Dojo's five suggested third-party MCP providers (ElevenLabs, remotion-media, TwelveLabs, Pexels, Replicate) remain **documented examples only**, not reviewed catalog providers or configured MCP profiles. Its twelve official Remotion companion skills likewise require separate source vetting and user consent. Source/license validation is not a full security audit of provider packages or upstream instructions.

**Delivery verified:** [PR #72](https://github.com/neosoda/agent-commons/pull/72) squash-merged into `main` as `42eff684220be38cc180d5efc4217b3a2f1d70ba`. On exact PR head `61cbd656d0e3b6c0d60142599b31db88d60ed702`, all six Ubuntu/Windows/macOS × Node 22/24 jobs ([CI run 43593848434](https://github.com/neosoda/agent-commons/actions/runs/43593848434)), [Chromium browser QA 43593848387](https://github.com/neosoda/agent-commons/actions/runs/43593848387) and [Windows portable smoke build 43593848408](https://github.com/neosoda/agent-commons/actions/runs/43593848408) **passed**. CI includes `npm ci`, typecheck, tests, generated catalog check, `npm audit --audit-level=high` and `npm pack --dry-run` (Ubuntu Node 24). Post-merge `main` at `42eff684220be38cc180d5efc4217b3a2f1d70ba` passed all **8/8** checks again: [CI 43594014732](https://github.com/neosoda/agent-commons/actions/runs/43594014732), [Chromium 43594014770](https://github.com/neosoda/agent-commons/actions/runs/43594014770), [Windows portable 43594014768](https://github.com/neosoda/agent-commons/actions/runs/43594014768).

**Next:** optional real user installation and media production only when explicitly requested. No actual local client skill sync, paid media provider call, video render, new GitHub release or npm publication is claimed. Current stable release remains v0.4.0.


## 22. Agent Desktop optional desktop-use integration (2026-11-15)

Branch `feat/agent-desktop-skill-mcp-20261115` based on main `70a49890d14c0bcf29354d7f433265a3e81c16ee`. The Vercel Labs [agent-desktop](https://github.com/vercel-labs/agent-desktop) Apache-2.0 skill is pinned to `8ffecc1d3d088727f8d84baf4dde0224aab2e8ad`: complete `skills/agent-desktop` subtree (SKILL.md + four references, 78,663 bytes), catalog ID `agent-desktop`. It uses the existing consent/preview/hash/backup installer and optional skill sync. The native CLI binary is *not* bundled.

MCP Control Center now has a manual-only, critical-risk `agent-desktop` entry (stdio `agent-desktop mcp`) and a dedicated, opt-in `desktop-control` profile. Custom profile policy rejects any mix of fetch/web-search/osint with desktop control, preserving the previous Docker restriction. Interactive catalog grouping and example prompts were added. The README FR/EN, generated upstream credits and skills index, MCP and interactive catalog docs, CHANGELOG, AGENTS and bilingual dedicated guides are updated. Synthetic tests cover consent boundaries, non-destructive preview and selective MCP sync, private inventory redaction, and 200-skill / nine-MCP counts.

**Merged and verified:** [PR #74](https://github.com/neosoda/agent-commons/pull/74) squash-merged into `main` as `55811c092967c7468ddf7508e292784f1ba9dccc`. Exact reviewed PR head `d0683be8e53e808ce1a62b17677b6f500b7d69a1`: [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/43698545069), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/43698544949), [Windows portable build/smoke](https://github.com/neosoda/agent-commons/actions/runs/43698545012), all completed/success. The resulting exact `main` SHA also passed [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/43698700598), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/43698700586) and [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/43698700600), all completed/success. GitHub repository integration did **not** test real OS accessibility, local user permissions, live apps, or the actual PC; no native CLI was installed and no new release or npm publication was made.


## 23. shadcn Improve — source-pinned catalog integration (2026-11-15)

Feature branch `feat/shadcn-improve-skill-20261115`: reviewed MIT upstream [shadcn/improve](https://github.com/shadcn/improve), commit `cac56e1ebd3c279aa9153616cfeac7b174ab90f9` (LICENSE.md), with four skill files at `skills/improve/`. Metadata-only discovery; approved install/sync, lazy loading, FR/EN guides, generated catalog and credits, Skill Hub prompt samples, synthetic tests. Improve is a read-only adviser, writing plans only; optional isolated executor delegation does not entail a merge/push; GitHub issue publishing is explicit and security-sensitive. No user-machine installation or actual code audit was performed. **Before merge:** require six exact-PR-head CI matrix jobs, Chromium and Windows portable workflows, typecheck, tests, audit and pack; verify resulting main after a squash merge. No release/npm publication claimed.


## 24. Real Windows audit and reliability fixes (2026-11-17)

Branch `fix/windows-real-audit-20261117` from `main` `1c18385` (PR #77 merged; no open PR at start, main CI 3/3 green). First audit **run on the maintainer's actual Windows 11 PC** (standard account, Node 26.13, Claude Code 2.1.325, Codex 0.168; no uv/Docker/Gemini binary). All writes went to synthetic `--home` folders with spaces, accents and paths up to 281 characters; the real profile was only read (`doctor`, `mcp probe` handshakes). Full report: [docs/qa/WINDOWS_REAL_AUDIT_2026-11-17.md](docs/qa/WINDOWS_REAL_AUDIT_2026-11-17.md).

**Fixed:** MCP package installs from deep homes (spawn cwd > MAX_PATH); restore/catalog staging beyond MAX_PATH (`mkdtempSafe`); EPERM test failures on standard accounts; misleading UI MCP statuses; uninstall preview now lists configurations still referencing the package; PowerShell 5.1 JSON quoting (`--arg`).

**Added:** `doctor` prerequisites, MCP launch-target checks (central + native), SKILL.md frontmatter lint calibrated on Codex's real rejection, per-agent skill metadata token estimate; `mcp probe` (explicit, CLI-only handshake/tool call, Windows `.cmd` support, HTTP auth → unverified); `mcp demo-config`/`demo-server`. Docs: `docs/DIAGNOSTICS*.md`, README FR/EN rows, SECURITY, CHANGELOG, AGENTS rule 11.

**Real evidence:** Claude Code invoked a junction-served skill and called synced MCP tools (demo `echo`, managed Filesystem `read_text_file`); `claude mcp list` matched `mcp probe` exactly; Codex read a synced skill and called an MCP tool. Fresh install (clone → npm ci → pack → isolated global install → `agent-commons.cmd`) and `pre-sync` restore (byte-identical) validated twice.

**User-side findings (not repo bugs, not changed):** Codex/Gemini Config MCP `rea` points to a deleted WinGet Node 24 `node.exe`; local skill `misconception-diagnostic-designer` has invalid YAML (Codex refuses it); Claude Code's brevo MCP exposes 299 tools; ~13k tokens of skill metadata per session for 144 linked skills.

**Follow-up 2026-11-18:** PR #78 CI 8/8 green on first head. Added sanitized MCP/skill warnings to the Skill Hub diagnostics API/UI. On the real profile (maintainer-approved): repaired the corrupted `description` of local skill `misconception-diagnostic-designer` (original saved under `~/.agents/backups/manual-fix-20261118/`); Codex now loads every skill with zero errors. `rea` MCP left untouched: its `rea-agents` package no longer exists under any Node install, and reinstalling an unreviewed third-party npm package is not automatic. Version bumped to **0.5.0** with `docs/releases/v0.5.0-release-notes.md`; release to be created from the merged `main` SHA only after CI 8/8, with assets attached by `release-assets.yml`.

**Not verified:** GitHub CI on the PR head, NVDA, SmartScreen, Gemini CLI/LM Studio/OpenCode real use, Fetch/Git MCP (uv absent), Playwright MCP, Antigravity and Claude Desktop invocation. **Next:** open PR, require CI 6/6 + Chromium + Windows portable on exact head SHA before merge; then fix the two user-side findings on request.

**Release v0.5.0 published (2026-11-18):** PR #78 squash-merged as `a499a9f4f51780b838397e6786c1d2ea70e9630c` after CI 8/8 on head `8c450fca1f0b67f83b68867cb3253826e408f8ed`; GitHub release v0.5.0 created on that SHA; ZIP 36547753 bytes, SHA-256 `3fff2144c40a3bf266065e8a96eb6a6ce99a57713d05982d7d1f081b2d8a370e`. Record: [docs/releases/v0.5.0.md](docs/releases/v0.5.0.md). No npm publication. **Next:** optional `rea-agents` reinstall decision by the maintainer; NVDA/SmartScreen manual checks.

## 25. Multi-client compatibility (2026-11-18, v0.5.1)

Branch `feat/all-clients-compat-20261118`. Official docs (checked 2026-11-18) show Codex, Gemini CLI, Cursor, OpenCode and Windsurf read `~/.agents/skills` themselves. Real runs on this PC: Codex saw the 240 central skills directly (links deduplicated by realpath); Gemini CLI 0.68 printed one "Skill conflict" warning per linked skill. Registry gains `readsCentralSkills`; sync no longer links those clients and removes redundant/dangling links to central skills (pre-sync snapshot). Added Windsurf, GitHub Copilot CLI (`copilot-json`: `type`, `tools: ["*"]`) and Qwen Code; OpenCode skills dir fixed; Antigravity relabelled. Doctor: real token cost, redundant links, duplicate frontmatter names (found `design-system` declared by `design-system` and catalog `ecc-design-system`), central-linked roots accepted.

**Real client evidence (isolated homes):** Gemini CLI `skills list` + `mcp list` (connected in a trusted folder), OpenCode `debug skill` + `mcp list` (connected), Copilot CLI `skill list` + `mcp list`, Qwen Code `mcp list` (connected). Caveat: OpenCode created empty XDG folders under the real home at startup despite the HOME override; they were removed. Not run: Cursor, Windsurf, Antigravity, Kiro.

**Not applied to the real profile:** removal of the 287 redundant links in `~/.codex/skills` and `~/.gemini/skills` (needs `agent-commons sync --skills-only` with the maintainer's approval). `rea` MCP still broken (package missing).

**Release v0.5.1 published (2026-11-18):** PR #80 squash-merged as `7b9bce4`; release v0.5.1 (latest) on that SHA; ZIP 36,552,619 bytes, SHA-256 `249af29a…e3ad`, re-verified on the physical PC. Record: [docs/releases/v0.5.1.md](docs/releases/v0.5.1.md). **Next:** with the maintainer's approval, run `agent-commons sync --skills-only` on the real profile to remove the 287 redundant links; decide on reinstalling `rea-agents`.

## 26. Real-profile duplicate cleanup and v0.5.2 (2026-11-18)

Maintainer approved removing duplicate links. A plain `sync --skills-only` dry-run on the real profile would also have created 96 links in Claude Code and legacy Antigravity, so the cleanup ran as `sync --skills-only --agent codex --agent gemini-cli` (snapshot `snapshot-20261118-090754-968f5a`): 287 links removed, nothing else changed. Real Codex afterwards: 349 skills, zero load errors, skills served from `~/.agents/skills`. Code fix on `fix/dedupe-guidance-20261118`: doctor advice now names the affected agents; sync reports a central-linked skills root as `native-shared`. Remaining real-profile warnings: `rea` MCP (package missing) and duplicate name `design-system` (central `design-system` and catalog `ecc-design-system`).

**Release v0.5.2 published (2026-11-18):** PR #82 squash-merged as `dd5d75a`; release v0.5.2 (latest) on that SHA; ZIP 36,553,254 bytes, SHA-256 `f47cdfd1…58aa`, re-verified on the physical PC. Record: [docs/releases/v0.5.2.md](docs/releases/v0.5.2.md). **Next:** maintainer decisions on reinstalling `rea-agents` and on the duplicate `design-system` skill name.

## 27. Real-profile fixes and v0.5.3 (2026-11-18)

Maintainer approved fixing the last two warnings. `rea` MCP: configs backed up to `~/.agents/backups/manual-fix-20261118/`, `rea-agents@6.9.0` reinstalled globally (`--ignore-scripts`), Codex and Antigravity entries re-pointed from the deleted WinGet Node 24 path to `C:\Program Files
odejs
ode.exe` + `%APPDATA%
pm
ode_modules
ea-agents\scripts
ea.mjs`; `mcp probe` OK (255 tools) in both. Duplicate `design-system`: product fix on `fix/skill-name-alignment-20261118` (install/update align frontmatter `name` with the catalog id; receipts keep `upstreamGitBlobSha1`; new offline `catalog align-names`). Applied on the real profile (snapshot `snapshot-20261118-100318-26c465`); `ecc-design-system` verifies intact; real Codex lists one `design-system`, zero load errors; `doctor` Healthy with 0 warnings.

**Release v0.5.3 published (2026-11-18):** PR #84 squash-merged as `6f8d59b`; release v0.5.3 (latest) on that SHA; ZIP 36,556,085 bytes, SHA-256 `62b0d8c6…097b`, re-verified on the physical PC. Record: [docs/releases/v0.5.3.md](docs/releases/v0.5.3.md). Real profile: `doctor` Healthy with 0 warnings. **Next:** optional token reduction (rea exposes 255 MCP tools and brevo 299 in Claude Code; skill metadata ~13-21k tokens per session).

## 28. Requested local Windows installation (2026-11-18)

User explicitly requested installing Agent Commons on this computer. Initial worktree was clean on `main` `0f2e1c4e22ef5905878b15c1a6a04b83a2eee0c2`, matching live GitHub, with no open PRs. All three main workflows succeeded: [CI](https://github.com/neosoda/agent-commons/actions/runs/44283121972), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/44283122035), [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/44283121973). Latest official release was v0.5.3 at `6f8d59b73b6986074d9782f3049767cc618efb51`.

Downloaded the official Windows ZIP and checksum; verified SHA-256 `62b0d8c6f9967d907f22856a9a834c04df6cc8e6aeee536eb98a44af46d7097b` against both checksum file and release asset digest. Installed the portable bundle in the per-user Programs directory. Replaced the global CLI's old v0.4.0 development link with a standalone v0.5.3 package packed from the verified bundle (`--ignore-scripts`); no npm publication is implied. Added Desktop and Start menu shortcuts to the portable launcher. Existing development source and agent skill/MCP configurations were preserved; no sync, third-party skill installation or MCP probe was run.

**Verified:** installed `agent-commons --version` is 0.5.3; real-profile `doctor` reports Healthy, zero issues. Started the bundled runtime in the background; dashboard and `/api/state` return HTTP 200, and the listener binds only `127.0.0.1:4173`. Local repository checks: `npm ci`, typecheck, all 198 tests, generated bilingual catalog credits, audit (zero vulnerabilities) and pack dry-run passed. This session does not claim MCP handshake, screen-reader, SmartScreen or new release validation.

**Next:** use the local Skill Hub or shortcuts. Any future skill/MCP synchronization requires its own reviewed preview and approval. This documentation update follows the normal branch/PR process; no application code changed.

## 29. Web installation and management improvements (2026-11-18)

User requested improving the installed Web interface for installing and managing tools. Started with a clean worktree on the installation handoff branch. Verified live main/release/PR state; [PR #86](https://github.com/neosoda/agent-commons/pull/86) passed all eight exact-head checks and was squash-merged as `ccdeb3f2bf4f5134ee2b3f89101a1f18cf4cf7ae`. Its resulting main passed [CI](https://github.com/neosoda/agent-commons/actions/runs/44347064894), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/44347064720) and [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/44347064728). New work is on `codex/web-extension-management-20261118`.

**Implemented:** direct skill install/update previews and agent selection on catalog cards; managed/update/attention/local filters and reset; source/license metadata; management actions before usage help; MCP setup steps that distinguish package/configuration/client detection without asserting a successful sync or running server. Package installation/configuration returns to the item for the next explicit action. Pending previews expose cancellation/errors and discard late responses after cancellation/navigation. French translations and mobile controls are updated.

**Targeted skill sync:** new `skill-target-sync-preview`/`skill-target-sync-apply` HTTP actions accept one physical shared skill and explicitly selected installed, skill-compatible agents. One-use tokens bind selection, filesystem revision and plan. Saved profiles and MCP settings are preserved. Native central-library readers receive no redundant link, and selecting agents cannot hide shared skills from those clients. No new runtime dependency, automatic third-party installation or automatic sync.

**Validation:** `npm ci`, typecheck, all 202 tests (four new synthetic-HOME HTTP regressions), bilingual generated catalog check, audit (zero vulnerabilities), pack dry-run, and complete Chromium smoke at five viewport sizes passed. Browser coverage includes management filters, unmanaged MCP preservation, cancellation/navigation/error races, actual targeted sync to a synthetic Claude client, native-reader selection and French strings; no JavaScript/CSP errors or horizontal overflow. Before/after viewport captures were inspected; mobile filters occupy less height. Mechanical UI detector returned no findings. Local Playwright 1.64.1 and cached Chromium were reused; no browser dependency was added to the project. Generated screenshots are ignored under `artifacts/`.

**Local delivery:** package/lock version is **0.5.4-dev.0**, explicitly unpublished. Built a separate per-user portable directory using the previously verified official Node runtime and the new local package; tested the packaged UI and API with a synthetic home, then updated the standalone global CLI and Desktop/Start menu shortcuts. The improved interface serves **127.0.0.1:4174**, HTTP 200; the stable v0.5.3 bundle and existing 4173 process were preserved. Real-profile `doctor` remains Healthy with zero issues. No real-agent sync, MCP provisioning/probe or skill installation was performed. Latest public release remains v0.5.3; no tag, release asset or npm publication was created.

**Review:** [PR #87](https://github.com/neosoda/agent-commons/pull/87), initial code head `ad320330512c061c69747b596b84742034b499aa`. At 16:41 UTC, GitHub reported no check runs for this PR yet; workflows are enabled, and no CI success or merge is claimed for this change.

**Next:** verify PR #87's exact-head six-job CI, Chromium and Windows portable checks before merge; recheck resulting main if merged. Use the updated shortcuts or local port 4174 for the improved interface. A stable public release needs its separate reviewed version/release process.

## 30. v0.5.4 release preparation (2026-11-18)

User explicitly requested push, merge and release. Verified clean worktree, live `main` at `ccdeb3f2bf4f5134ee2b3f89101a1f18cf4cf7ae`, PR #87 open, v0.5.3 still latest and no v0.5.4 tag/release. Promoted package and lockfile from 0.5.4-dev.0 to **0.5.4**, added bilingual release notes and updated both README editions and Extension Manager guide. No application code changed during this preparation.

**Release gates:** rerun local npm checks, require all eight checks on the final PR #87 head, squash-merge with an exact-head guard, then verify the resulting main's six CI jobs, Chromium and Windows portable workflows. Only then create v0.5.4 on that exact merged SHA and let `release-assets.yml` attach its tested ZIP and SHA-256. Verify the actual public release/tag/assets and downloaded Windows archive before recording publication. npm publication stays disabled; no tag/release has been created at authorship.

## 31. v0.5.4 published and downloaded archive verified (2026-11-18)

Completed the user's push/merge/release request. [PR #87](https://github.com/neosoda/agent-commons/pull/87) was squash-merged after all eight final-head checks passed at `d8ac74ed0c86b8864fd9f2e239a5c41d88864830`. Resulting main `313346b5cad973f535bbfa88910ef94623242dd9` passed the six CI jobs, Chromium and Windows portable workflows again. Only then was the stable [v0.5.4 release](https://github.com/neosoda/agent-commons/releases/tag/v0.5.4) created on that exact commit, without replacing any historical tag or asset.

The [release assets workflow](https://github.com/neosoda/agent-commons/actions/runs/44353235533) passed and attached the ZIP (36,562,044 bytes) and checksum. Downloaded both public files and independently confirmed SHA-256 `93d8722c8804c4e3e5aaa163e36709a2bfc60158ef898eaac0b59e314800c84e` against the attached checksum and GitHub asset digest. Windows PowerShell 5.1 acceptance passed: extraction into a spaced path, embedded Node/CLI v0.5.4, dashboard and read-only API under synthetic HOME. [Complete verification record](docs/releases/v0.5.4.md) includes exact SHA and workflow references. npm publishing was skipped by its gate, not attempted. Windows signing, NVDA/VoiceOver and SmartScreen remain unverified.

Local installations/configurations were preserved: the existing improved UI is still the previously installed 0.5.4-dev.0 bundle on port 4174. This release session did not sync real agents, provision/probe MCPs or install third-party skills. Final documentation is on `codex/record-v054-publication-20261118`, to pass the normal exact-head review gates before merge. **Next:** optional installation of the public stable bundle only if requested; remaining product backlog is live upstream update review, MCP health reconciliation and accessibility acceptance. Do not republish or move v0.5.4.

## 32. Motion Educator integration (2026-11-20)

User-requested integration: [zeative/motion-educator](https://github.com/zeative/motion-educator) pinned at `c7914463f915e628f41270eae4e77de6a23460e1` (Zeative, MIT). The `motion-educator` catalog entry selects 38 reviewed upstream source files (614,529 bytes) from `SKILL.md`, `package.json`, `kit/`, `references/`, excluding pre-rendered example media. Install and synchronization remain opt-in and metadata loading remains lazy. Updated both READMEs, generated catalog index/credits, FR/EN guides, CHANGELOG and a synthetic-home install/verify regression test. Neither external audio/TTS nor third-party scripts are auto-run.

**Pending delivery checks:** require six cross-platform Node CI jobs plus Chromium and Windows portable jobs on the exact PR head before merge, then verify main CI. No release/tag, third-party code vendoring, real user agent changes, or actual video render as part of this integration.

## 2026-11-20 — Hermes curation after Motion Educator merge

Six pinned metadata-only skills from the FrankX Hermes discovery list were selected: todo-discipline (FrankX `1f1ae5b`), bounded-orchestration-contract, compaction-survival, skill-health-audit and local-inference-tuning (ABVX `d4af8c3`), plus skill-inspector (NVIDIA `48e0f94`). Source files and MIT/Apache-2.0 license evidence inspected. No skill copied, auto-installed, executed, synced, or dynamically tested; native hooks and implicit approval deliberately excluded. Combined with concurrently merged Motion Educator (#90), public catalog count: **208 skills / 30 upstream repositories**. Regenerated both README credit sections and skill index; added bilingual Hermes guide and pinned-source test. The original 201-count video test was made resilient to catalog growth. **Pending:** PR #89 exact-head six-matrix CI, Chromium QA and Windows portable checks, merge, post-merge main checks. No new release and no physical Windows client test.


## 2026-11-20 — Operating Surface web redesign (review pending)

**Branch:** `feat/operating-surface-redesign-20261120` (based on live `main` `79afa9938fa5742ce9da16d63439690b65bc3b30`). **Status at authorship:** implementation committed to branch; PR checks and post-merge checks still required. This is **not** part of the published v0.5.4 release; no new release, native agent synchronization, MCP provisioning or installation has been performed.

- Redesigned local dashboard shell, navigation, hero, catalog density, dialogs, fields, side panels, and responsive layouts through `src/web/operating-surface.ts`. New distinctive editorial direction: graphite, porcelain, vermilion signal; light/dark theme without external fonts or runtime dependencies.
- Added accessible keyboard quick switcher (`Ctrl+K`, `Cmd+K`, `/`; arrows/Enter/Escape) searching real section names, installed agents, curated/local skill and MCP inventories using existing `discoveredTools()`; selecting opens and filters the actual catalog, never performs writes.
- Added explicit overview integrity signal calculated only from actual local `state.integrity` results and scanned counts; no fabricated health or MCP reachability claims.
- Theme uses client-local `agent-commons-ui-theme` (only light/dark); language preference and all existing preview/revision/approval/backup controls are preserved. CSP nonce stays in the existing inline style/script, no external network call.
- Added `docs/WEB_OPERATING_SURFACE.md`, updated both README editions, extended unit-side rendered HTML/JS checks and Chromium smoke for keyboard search + persisted appearance.
- Preserve security: 127.0.0.1-only unauthenticated UI, CSRF, Host/Origin protection, no exposure of secrets, no automatic skill/MCP install/sync, no fake controls.

**Remaining delivery gate:** require six Node 22/24 Windows/Ubuntu/macOS CI jobs, Chromium viewport and interaction QA, and Windows portable jobs to pass on the PR's exact HEAD SHA before any merge; verify `main` afterward. Real local testing on a user's actual Windows agent environment is not yet verified.

## 33. Bounded local agent runtime and follow-up hardening (2026-11-20)

- [PR #92](https://github.com/neosoda/agent-commons/pull/92) merged by squash as `cf30a02f1f2a15fd3e651883379de6b698effe04`. New independent `src/runtime/` includes LM Studio-compatible model client, bounded workspace tools, anti-loop mission runner, checkpoints and explicit optional cloud recovery; `agent-commons-agent` CLI is opt-in. PR-head CI all 6 platform/Node jobs, Chromium and Windows portable completed successfully. Main subsequently advanced with Operating Surface #91 at `042a7ee93721b28053e31fcbb8ce84bacc5fd747`.
- This follow-up improves **recovery integrity**: CLI missions are bound to a hashed canonical Git checkout; wall-time limit resets only between launches (step/token/tool/cloud budgets stay cumulative), Windows ADS/device paths are denied, and cloud calls without source-sharing approval cannot write files. Four regression tests added, bringing the isolated runtime suite to 14 passing tests before CI.
- This remains **experimental**: no actual LM Studio/RTX 5070 Ti benchmark, real Windows account integration test, MCP-in-the-loop, true OS sandbox, guaranteed descendant process cleanup, or persistent dashboard mission management. Never claim complete autonomous production readiness. Validate this change's exact PR-head CI matrix, browser and Windows portable workflows before merging.

## 34. v0.6.0 release preparation (2026-11-20 — NOT YET PUBLISHED)

PRs #92, #93, #94 merged: bounded mission runner, checkpoint safeguards and oscillation detection. Operating Surface #91 also merged. Preparing package version 0.6.0, bilingual README, release notes and an exact-main-gated one-shot GitHub publisher. The last verified public release remains v0.5.4 until the v0.6.0 tag, page and checksum-verified Windows assets are confirmed live. Real LM Studio/Windows/RTX 5070 Ti tests remain outstanding. Do not claim npm publication. After confirmed publication, retire the one-shot workflow via reviewed PR.

## 35. v0.6.0 public release verified — 2026-11-20

**Published, NOT a draft:** [v0.6.0](https://github.com/neosoda/agent-commons/releases/tag/v0.6.0), GitHub's latest stable release, tag pointing to `7077d8c30648f1f3cc5ac9943c540201515788de` (merged release source, PR #97). The version/README preparation was PR #96, and the PowerShell lockfile parsing fix was PR #97. [PR #98](https://github.com/neosoda/agent-commons/pull/98) recovered a fully verified GitHub draft without rebuilding or changing assets. Publication completed via [workflow 44719872186](https://github.com/neosoda/agent-commons/actions/runs/44719872186) on main `086acdf6c57247f739dd41fd3dcbdcfe05bc49e6`, after all eight exact-main checks. Initial source commit `7077d8c` independently passed [six CI jobs](https://github.com/neosoda/agent-commons/actions/runs/44718700964), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/44718701116) and [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/44718701009); the first release workflow built, extracted and smoke-tested the ZIP and uploaded a draft before its draft-by-tag API lookup failed. The recovery workflow validated existing asset digests and published the draft.

- Windows ZIP `AgentCommons-win-x64-portable.zip`: **36,600,846 bytes**, GitHub asset SHA-256 `a91f86614636b15b69b04c23ee6126920aed2a5ac7bdf69a1c7ce1cef9190404`.
- Checksum sidecar `AgentCommons-win-x64-portable.zip.sha256`: 101 bytes; asset digest `sha256:3e4f945a3a2a359fb120b78383cce19bea9827e37ac6f1f68e09595d725c158b`.
- Verified directly from GitHub release/tag/latest endpoints: public, stable (not draft or prerelease), two uploaded assets, tag points to original v0.6.0 package source SHA. **No independently downloaded physical ZIP check or real LM Studio / RTX 5070 Ti benchmark is claimed**, and Windows ZIP is unsigned. npm remains unpublished / gated.
- This documentation branch retires the one-shot v0.6.0 publishing workflow. Keep the normal `.github/workflows/release-assets.yml` and gated npm workflow intact for future releases. Follow normal exact-head PR checks before merging this cleanup.
