# Motion Educator — Agent Commons

**Upstream:** [Zeative / motion-educator](https://github.com/zeative/motion-educator), [MIT](https://github.com/zeative/motion-educator/blob/c7914463f915e628f41270eae4e77de6a23460e1/LICENSE), pinned to [`c7914463f915e628f41270eae4e77de6a23460e1`](https://github.com/zeative/motion-educator/tree/c7914463f915e628f41270eae4e77de6a23460e1) (reviewed 2026-11-20).

This skill lets Claude Code, Codex and Gemini CLI plan and build **educational motion films** (16:9 or 9:16), with verified illustrated storyboards, sourced facts, deterministic 3D animation, captions and optional narration and audio. **Illustrated storyboard approval precedes rendering.**

Agent Commons only catalogs the pinned Git source. With explicit consent, installation selects **38 source files (614,529 bytes)**: `SKILL.md`, `package.json`, `references/` and `kit/`. Large example videos, images and `examples/` remain [upstream](https://github.com/zeative/motion-educator/tree/c7914463f915e628f41270eae4e77de6a23460e1/examples), with no automatic downloads or vendoring.

## Optional installation and selective loading

```bash
agent-commons catalog search motion-educator
agent-commons catalog info motion-educator
agent-commons catalog install motion-educator              # preview, no writes
agent-commons catalog install motion-educator --yes        # explicit consent
agent-commons catalog verify motion-educator
agent-commons skills route "Explain DNS in a 45-second educational film" --json
agent-commons skills load motion-educator                   # only SKILL.md
agent-commons skills load motion-educator --resource references/storyboard.md
agent-commons sync --skill motion-educator --agent codex --dry-run
agent-commons sync --skill motion-educator --agent codex
```

Use `--agent claude-code` for Claude Code or `--agent gemini-cli` for Gemini CLI. Routing loads **metadata only**. After storyboard approval, the upstream workflow creates a separate film workspace using `node <skill>/kit/tools/new.mjs <workspace> <film-name>`.

## Requirements and safeguards

- Agent Commons needs Node.js 22+; the film requires Node 20+, kit npm packages, Playwright/Chromium with WebGL2, FFmpeg/ffprobe, Python 3/NumPy and GPU or software Vulkan. Skill installation **does not** install these dependencies.
- ElevenLabs narration is optional and can incur API costs. Never include API secrets in prompts; authorize paid calls and external network access separately.
- `kit/audio/fetch.sh` fetches Mixkit music/sound under **separate media licenses**. No media is bundled; review rights before publishing.
- Third-party scripts (`kit/tools/`, `kit/audio/`, `kit/farm/`) are downloaded but **not executed by Agent Commons**. Never launch `kit/farm/compose.yml` or allow network access without separate review.
- The review covers **source and license only**, not full security or a real video render. Regression tests use synthetic profiles and never touch personal agents.

**Prompt:** “Use motion-educator to draft an illustrated, sourced 45-second explainer on DNS. Show me the storyboard before rendering or using any paid service.”

See [Video Engine](VIDEO_SKILLS.en.md) and [SaaS Product Demo](SAAS_PRODUCT_DEMO_VIDEO.en.md). Credits: [Zeative](https://github.com/zeative/motion-educator) · [MIT](https://github.com/zeative/motion-educator/blob/c7914463f915e628f41270eae4e77de6a23460e1/LICENSE).
