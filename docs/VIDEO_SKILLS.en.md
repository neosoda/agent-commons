# Video Engine and Remotion Superpowers — Agent Commons integration

Two MIT sources pinned on **November 14, 2026**:
- [ninjasweb/video-engine-skill](https://github.com/ninjasweb/video-engine-skill/tree/cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5) — by ninjasweb, [license](https://github.com/ninjasweb/video-engine-skill/blob/cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5/LICENSE). The `video-engine` entry includes the root SKILL.md and `references/` guides.
- [DojoCodingLabs/remotion-superpowers](https://github.com/DojoCodingLabs/remotion-superpowers/tree/970efd2d2f4ce2492231a31ee684c2ead883f4bc) — by Dojo Coding Labs, [license](https://github.com/DojoCodingLabs/remotion-superpowers/blob/970efd2d2f4ce2492231a31ee684c2ead883f4bc/LICENSE). **15 separately installable skills** from `skills/<id>/`.

## Choosing a skill

**`video-engine`**: audio-first narrated videos, word-level timing, deterministic Remotion/SVG animation, SRT captions, thumbnails and QA. A good fit for educational explainers and multi-video projects.

**`remotion-production`**: task-focused media orchestration for an existing Remotion project. The other Dojo skills are `create-video`, `create-short`, `add-captions`, `add-music`, `add-transitions`, `add-voiceover`, `analyze-footage`, `find-footage`, `generate-clip`, `generate-image`, `review-video`, `setup`, `setup-guide` and `transcribe`. Rule folders under `remotion-production/rules` and `setup-guide/rules` are retained when each respective skill is installed.

Dojo also requires **12 official Remotion skills**, but these are not imported or auto-installed by Agent Commons. Installing an individual Dojo skill does not include root plugin files, hooks, scripts or `.mcp.json`.

## Opt-in installation and lazy loading

```bash
agent-commons catalog search remotion-superpowers
agent-commons catalog info video-engine
agent-commons catalog install video-engine                # preview; no local writes
agent-commons catalog install video-engine --yes          # explicit approval
agent-commons catalog verify video-engine
agent-commons skills route "Make a narrated educational video in 9:16" --json
agent-commons skills load video-engine                    # only SKILL.md
agent-commons skills load video-engine --resource references/voice-and-alignment.md
agent-commons sync --skill video-engine --agent codex --dry-run
agent-commons sync --skill video-engine --agent codex
```

Use `remotion-production`, `create-video` or another focused Dojo ID when needed; approve companion skills separately. If synced to Claude Code, invoke `/video-engine` or `/create-video`; for Codex use `$video-engine` or `$create-video`. For Gemini CLI, use its supported native skills interface.

Routing returns **metadata only**; `skills load` explicitly reads a bounded file. Nothing auto-installs, executes, pushes to an agent, or loads all 16 instruction sets.

## Optional MCPs, dependencies and costs

Dojo's upstream `.mcp.json` suggests five third-party MCP servers: **ElevenLabs** (speech/music), **remotion-media** (generation), **TwelveLabs** (analysis), **Pexels** (stock media) and **Replicate** (models). These are **third-party suggestions, not vetted Agent Commons MCP catalog entries**. Review each exact package/version, file write scope (including the render project's `public/`), credentials, licensing and billing before adding it manually in the [MCP Control Center](MCP_CONTROL_CENTER.md). Do not paste API keys into prompts, or auto-run upstream `npx`, `uvx`, `npx skills add` setup directions.

Remotion/Node/ffmpeg and sometimes Python or alignment tools are **production-time** requirements, not catalog-browsing dependencies. Obtain explicit consent before remote downloads, paid TTS, image/video generation, uploads or renders. Review Remotion's license and the licensing of all voice, audio, music and footage assets. Source/license verification **is not a full third-party code security audit**.

**Prompts:** “Use video-engine to storyboard a narrated 45-second lesson, but get permission before paid TTS.” / “Use create-short to prepare a 9:16 Reel with subtitles; don't render until approved.”

Credits: [ninjasweb](https://github.com/ninjasweb/video-engine-skill) and [Dojo Coding Labs](https://github.com/DojoCodingLabs/remotion-superpowers), MIT at the pinned commits above. No third-party skill code is vendored into Agent Commons.
