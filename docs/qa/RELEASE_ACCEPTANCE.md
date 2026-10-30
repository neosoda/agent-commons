# Release acceptance — Windows, screen readers and local safety

This checklist is for **manual tests on a real machine**, not a claim that the
maintainers already performed them. Chromium CI and the Windows ZIP packaging
job cover automated checks; the following independent experience is still
required before broader end-user/enterprise promotion.

## Windows 10/11 x64 — published ZIP

1. On an independent Windows PC, download the **v0.3.0** ZIP and adjacent
   `.sha256` from [GitHub Releases](https://github.com/neosoda/agent-commons/releases/tag/v0.3.0).
2. From an ordinary PowerShell console (no Administrator, Node.js or Docker),
   run the standalone verifier **from the project source tree**:

   ```powershell
   .\scripts\check-published-windows.ps1 -ZipPath "$env:USERPROFILE\Downloads\AgentCommons-win-x64-portable.zip"
   ```

   It validates SHA-256, extracts the **downloaded archive** to a disposable
   location with spaces, checks embedded Node/CLI version and starts local
   HTTP+read-only API with a dedicated synthetic `--home`. It cleans up
   temporary files. **Do not bypass script execution policy globally.**
3. Separately double-click the launcher in a newly extracted ZIP; verify UI
   opening/closing, Chrome/Edge, correct port and SmartScreen behaviour.
4. Select FR/EN, inspect catalog and agent/profile controls, create a **test**
   backup, then restore the test snapshot **only** in the isolated test HOME;
   inspect before/after files and attempt cancellation.
5. Confirm port 4173 is not listening on any non-loopback address; verify the
   browser is not sending application telemetry to a third-party host.
6. Save test evidence: OS build, Windows edition, ZIP SHA-256, browser, outcome,
   screenshot with no private credentials, errors and reproduction steps.

## NVDA on Windows / VoiceOver on macOS

Use the stable reader on a test machine with **synthetic** Agent Commons data.

- Navigate the five views without a pointer, including the skip link, active
  section heading, search/filter controls and the local FR/EN language selector.
- Check every input has a usable announced label and state, including disabled
  and checked profile selections, MCP transport, included/excluded agents.
- Open dialogs: focus moves inside; Tab/Shift+Tab remains trapped; Escape
  closes only when no operation is running, restoring invoker focus.
- Trigger an intentionally invalid MCP preview in a **synthetic** profile:
  the inline error is announced, focus moves to it, entered text is retained.
- Exercise a delayed/failed approval on a synthetic HOME, verifying no duplicate
  submission and appropriate busy state / completion / error announcements.
- Review screen zoom, 200% magnification, contrast and small viewport without
  losing functionality.
- Record actual reader versions, pass/fail per test and minimal issue examples.

## Supported proof

The repo provides **automatic** Node 22/24 across 3 OSs, Chromium across 5
viewports, keyboard + CSP assertions, and extracted ZIP+checksum smoke testing
in Windows CI. These cannot attest a physical machine's SmartScreen result,
actual screen-reader speech, signed binary reputation, or recovery from an
unplugged disk. Do not mark those checks done without human evidence.
