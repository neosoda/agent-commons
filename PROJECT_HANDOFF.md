# Agent Commons — PROJECT_HANDOFF

> **Operational handoff, last verified: 2026-11-14 (v0.4.0 published).** Read this file before modifying the repository; then check live `main`, release/tag, PRs, issues and GitHub Actions **by exact commit SHA**. Historical SHA and run IDs below are a snapshot, not a promise of current status. This review used the connected GitHub repository only; it did **not** inspect the user's Windows PC, npm account or private agent configurations.

## 1. Product, distribution and safety boundaries

**Goal:** local-first multi-agent AI skills and MCP configuration management, with
a shared skill library, central MCP manifest, per-agent profiles, optional
curated public GitHub skill installer, explicit sync, backups and safe recovery.

**Architecture:** TypeScript strict, Node.js >=22, native ESM, `jsonc-parser` as
the only runtime package. Source: `src/agents` (18 registered environments, including MCP-only LM Studio),
`src/sync` (skills/JSON/JSONC/TOML MCP adapters), `src/core` (link/junction
handling, safe backup/restore), `src/commands` (CLI), `src/web` (local
HTTP and framework-free Skill Hub), `src/security`, `src/test`, `scripts`.
Public catalog assets in `catalog`; end-user documentation in `README.md`.

**Current published stable version:** [GitHub **v0.4.0**](https://github.com/neosoda/agent-commons/releases/tag/v0.4.0), tagged exactly at `9a952793f2f6c9a665e3f960f3610c027d961f7c`; Windows ZIP (36,485,546 bytes) plus matching SHA-256 are published. Verified ZIP SHA-256: `b333ddf4ac7aecc135f23914cf6ddb2ca8aad52817033c5f27ef7aca44859522`. [Full release verification](docs/releases/v0.4.0.md).

**Previous published stable version (before v0.4.0):** [GitHub **v0.3.1**](https://github.com/neosoda/agent-commons/releases/tag/v0.3.1),
tag at `9c1735aed0226dfa0eff4165753368c2daf2aa02`, ZIP Windows x64 and
matching SHA-256 uploaded. Historical [v0.3.0](https://github.com/neosoda/agent-commons/releases/tag/v0.3.0) remains unchanged. [Published release record](docs/releases/v0.3.0.md).
The historical v0.3.1 ZIP's SHA-256 is
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
