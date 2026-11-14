# Lemo-Opuscar — code-rendered films and animations

Upstream: [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), by Lemomo / LemoLab. Reviewed revision: [`3a7132b996be0241c1ea0ab180d519f06e6f10b6`](https://github.com/lemomo-ai/lemo-opuscar/commit/3a7132b996be0241c1ea0ab180d519f06e6f10b6), November 14, 2026.

Agent Commons only references the **bootstrap skill files**, `SKILL.md` and `scripts/setup.sh` (13,223 bytes). The **99 styles**, films, models and rendering toolkit are **not bundled or preloaded**. Catalog discovery uses metadata only; loading the skill instructions is explicit.

## Selective install

```bash
agent-commons catalog search lemo-opuscar
agent-commons catalog info lemo-opuscar
agent-commons catalog install lemo-opuscar            # preview, no write
agent-commons catalog install lemo-opuscar --yes      # two pinned files only
agent-commons catalog verify lemo-opuscar
agent-commons sync --skill lemo-opuscar --agent codex --dry-run
agent-commons sync --skill lemo-opuscar --agent codex
```

Replace `codex` with the target agent. Smart Skill Router can suggest this skill for relevant film, video or animation tasks; it does not automatically install, run or inject the skill content.

## First-use warning

- The upstream `setup.sh` **clones or updates the runtime library from `main`** in `~/lemo-opuscar` when executed, then may download/install npm/Python packages and Chromium. **The pinned Agent Commons commit pins only the two bootstrap files, not the library later fetched by the script.**
- Obtain explicit consent for those actions and review the upstream scripts before running. Windows requires a POSIX shell such as Git Bash. Actual rendering requires Node.js 20+, ffmpeg 7+ and Python 3.11+; optional audio/image features can require additional packages, models and services.
- To keep runtime revision fixed, **manually** prepare the library checkout at the reviewed commit and set `LEMO_OPUSCAR_HOME` to that non-`setup.sh`-managed checkout. Avoid auto-initialization from `main` when reproducibility matters.
- No extra MCP server, background downloads on catalog browsing, or unsolicited project-file access. Films are generated in the user-selected workspace.

**Mixed licensing:** the skill Markdown and style guides are **CC BY-NC 4.0** (with a specific, limited permission to use them to produce films including commercial films, **not** permission to republish these texts in Agent Commons). The script and much of the executable code are **MIT**. Third-party media and assets retain their licenses. Consult upstream [LICENSE](https://github.com/lemomo-ai/lemo-opuscar/blob/3a7132b996be0241c1ea0ab180d519f06e6f10b6/LICENSE) and [REUSE.toml](https://github.com/lemomo-ai/lemo-opuscar/blob/3a7132b996be0241c1ea0ab180d519f06e6f10b6/REUSE.toml). Reference metadata is not an executable-code security audit.

Credits: **Lemomo / LemoLab**, [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar). Agent Commons does not claim authorship of its film styles.
