# SaaS Product Demo Video — Agent Commons

**Upstream:** [noamdorr/saas-product-demo-video](https://github.com/noamdorr/saas-product-demo-video) by **Noam Dorr**, [MIT](https://github.com/noamdorr/saas-product-demo-video/blob/c93c00ff44a65eea25ac1bb773a4565c68893ff9/LICENSE), pinned commit `c93c00ff44a65eea25ac1bb773a4565c68893ff9`.

## What changed

The catalog already referenced an older version; this update points to the **official v2** `skills/saas-product-demo-video/SKILL.md`. On explicit approval, the bounded installer fetches and Git-hash-verifies **all 92 files (622,353 bytes)** in the skill tree: native prompt, Remotion scaffold, React components, reference guides and scripts. Upstream evaluation data, publication hooks and release scripts remain outside the installation. No third-party files are bundled or loaded by Agent Commons during catalog browsing.

```bash
# Inside an updated and built Agent Commons checkout
node dist/cli/index.js catalog info saas-product-demo-video
node dist/cli/index.js catalog install saas-product-demo-video         # preview only; network
node dist/cli/index.js catalog install saas-product-demo-video --yes   # explicit install
node dist/cli/index.js catalog verify saas-product-demo-video
node dist/cli/index.js skills route "Create a SaaS product demo video with Remotion" --json
node dist/cli/index.js sync --skill saas-product-demo-video --agent codex --dry-run
node dist/cli/index.js sync --skill saas-product-demo-video --agent codex
```

Claude Code: `--agent claude-code`, then `/saas-product-demo-video`; Codex: `$saas-product-demo-video`; Gemini CLI: use `--agent gemini-cli` and its native skill discovery. Routing is **metadata only**; `skills load saas-product-demo-video` explicitly loads its SKILL.md, and other reference files are loaded only when needed.

## Runtime and security

- The **rendering project**, not Agent Commons, needs Node.js 18+, npm/Remotion, Python 3/librosa for beats; optionally ffmpeg, Pillow, Playwright, browsers or Gemini API. The scaffold pins Remotion versions; running or installing its dependencies is a separate, authorized action.
- Third-party scripts under `scripts/` and `assets/scaffold/tools/` are **not executed on install**. Obtain approval for npm/Python installs, private-site capture, browser downloads, network/API calls and rendering. Do not leak secrets or sensitive customer screens.
- Upstream may suggest `npx skills add remotion-dev/skills`; do **not** trust that as automatic installation authorization. Use reviewed, pinned catalog entries and user consent.
- To avoid wasted tokens and rework, use selected references only, no automatic subagents, and the upstream two-scene checkpoint.
- Media, music, brand artwork and the separate Remotion tooling may carry additional licenses or commercial terms; the skill's MIT license does not cover them.

**Updates:** Review a new commit/license, bump `ref/source/licenseEvidence` in `catalog/skills.json`, regenerate via `npm run catalog:generate`, and use `catalog outdated` / `catalog update saas-product-demo-video` preview before `--yes`. The safe updater refuses to replace linked or modified user skill trees.

Credits: [Noam Dorr](https://github.com/noamdorr/saas-product-demo-video) · [MIT](https://github.com/noamdorr/saas-product-demo-video/blob/c93c00ff44a65eea25ac1bb773a4565c68893ff9/LICENSE). [Remotion](https://www.remotion.dev/) remains a separate product.
