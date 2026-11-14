# Interactive catalog — Skills & MCP

The **loopback-only Skill Hub** (`127.0.0.1`) has a single discovery page for skills and MCP servers; the existing **MCP Control Center** continues to handle actual configuration and synchronization.

Start `agent-commons web` and select **Skills & MCP**.

- **Skills**: pinned public references and the shared local skill inventory; categories include development, DevOps, security, design, AI, documentation and productivity.
- **MCP servers**: vetted entries plus server names found in the central manifest or detected native client configurations; classified into web, development/Git, infrastructure, other.
- **All tools**: combined search, category and installed/configured-versus-reference filters.
- **View details**: source, genuine inventory status, usage/preview commands, link to MCP Control Center and copyable example prompts.

An installed skill in the central library is **not necessarily linked to any client**. Preview `catalog install <id>` before approving `--yes`, and preview `sync --skill <id> --agent codex --dry-run` before linking. Prompt examples are local UI copy, **never injected** into running agents.

A configured/detected MCP is **not necessarily running**, and may not be available in every client. The catalog reveals **no private paths, command lines, configuration values, tokens or env vars**; providers marked not vetted are not install recommendations. Examples cover threat modeling, product demos, skill discovery, Docker and UX as well as all eight reviewed MCP references; other entries receive a concise generic prompt.

No new runtime services, dependencies, background sync, network scans, third-party execution or telemetry. All operations remain opt-in and guarded.

[Guide français](INTERACTIVE_CATALOG.md) · [English README](../README.en.md).
