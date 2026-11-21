# SimuLab — interactive 3D educational labs

[SimuLab](https://github.com/ecapri-dev/simulab-skill) by **ecapri-dev / @0xKapri** converts a teaching question into an **offline interactive isometric 3D lab**: one standalone HTML page, self-building scene, guided contrast chapters, adjustable input, sourced values from one model and optional video/audio output. Included examples cover Arduino blinking, robot sonar, multimeters, soldering, espresso and the asset catalog.

The Agent Commons `simulab` catalog reference pins the upstream revision [`a0561f868d9c642d92c667294d98b98c367a45ab`](https://github.com/ecapri-dev/simulab-skill/tree/a0561f868d9c642d92c667294d98b98c367a45ab). The reviewed install selection contains **71 files, 1,379,881 bytes**: root SKILL/CATALOGO/PROMPTS documents, licenses and package metadata, `assets/`, `demos/`, `kit/` (including fonts and OFL notices), and `tools/`. Redundant `docs/` marketing previews are excluded. No third-party files are vendored into Agent Commons itself.

## Install and load selectively

```bash
agent-commons catalog search simulab
agent-commons catalog info simulab
agent-commons catalog install simulab
agent-commons skills route "Build a 3D interactive learning simulation" --json
agent-commons skills load simulab --json
agent-commons skills load simulab --resource PROMPTS.md
```

Browsing/routing uses **metadata only**; explicit preview and approval are needed to install. Agent Commons does not run scripts, npm, pip, Python, Chromium, ffmpeg, or automatically sync native agents. Install under `~/.agents/skills/simulab` and sync only to clients that do not already read the shared library.

## Dependencies and safeguards

- **Interactive HTML:** Node.js 20+ upstream (Agent Commons itself requires Node 22+). Copy demo templates into a **separate project directory** before generating artifacts; never write output into the central managed skill.
- **Browser images/video:** manually installed Playwright and Chromium. The upstream launch code supplies Chromium's `--no-sandbox` flag; do not run untrusted content on an unisolated workstation.
- **Optional video/audio:** Bash, ffmpeg, Python 3, numpy and scipy. On **Windows, WSL2 is recommended** for Bash-oriented rendering. Native Windows execution, end-to-end rendering, hardware/audio quality and platform-specific behavior have **not been tested** as part of this integration.
- **Security:** upstream third-party dependencies and scripts are not audited by Agent Commons merely because source/license are reviewed. Never implicitly execute suggested global `npx skills add` or dependency installation. Obtain separate approval before running external tools.
- **Models:** every displayed number should come from evidence or a clearly marked assumption; simulations need independent validation before consequential use.

Prompt: “Use SimuLab to explain a DNS–TCP–TLS–HTTP exchange as an interactive lab. Ground measurements in authoritative sources, draft the model and offline HTML first, and ask before installing dependencies or rendering video.”

## Attribution

Author **@0xKapri** / [ecapri-dev](https://github.com/ecapri-dev/simulab-skill), upstream code/documentation under **MIT** ([LICENSE](https://github.com/ecapri-dev/simulab-skill/blob/a0561f868d9c642d92c667294d98b98c367a45ab/LICENSE)). Embedded JetBrains Mono, Silkscreen and Caveat fonts have separate **SIL OFL 1.1** license notices under `kit/fonts/LICENSE-*.txt`. SimuLab is an independent third-party project, not maintained by Agent Commons.
