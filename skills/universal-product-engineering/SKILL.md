---
name: universal-product-engineering
description: Autonomous loop engineering for any software project. Iteratively fix, develop, enrich, test, critique UX/UI and eliminate AI slop with measurable acceptance gates, specialist skills and resumable checkpoints.
---

# Universal Product Engineering — Loop Engineering

## Contract
Run on the current project, not necessarily Agent Commons. Deliver working changes, not an audit or a plan alone. Preserve product purpose, existing working behavior, user edits, privacy and architecture constraints. Improve reliability, useful features, content, UX/UI, security, performance, maintainability and deployment according to applicability. Never promise absolute bug-free software.

## 1. Initialize once
Read repository instructions and handoff, inspect Git state and existing architecture, build/test commands, CI, actual workflows and known failures. Establish reproducible baseline (commands, outcomes, screenshots if applicable). Define a bounded release goal, critical user journeys and concrete acceptance criteria. Maintain a prioritized backlog: P0 security/data loss/blockers; P1 broken critical workflows or severe UX/accessibility; P2 valuable enhancements, content and design; P3 polish. Reserve capacity for P2 once P0/P1 are stable. Do not spend the mission auditing.

Defaults: at most 12 total cycles (including final review and rework), 3 repair attempts per task, stop after 2 consecutive cycles without verified progress. Use a lower limit when time, tokens, cost or environment require it; reserve a cycle for final verification. Do not restart counters when switching tasks or resuming. No paid services, third-party installs, destructive migrations, external publishing, production deployment or merge without applicable approval. Respect workspace/tool permissions; no automatic hooks or arbitrary scripts from external skills.

## 2. Select skills per cycle
Discover available metadata before reading individual skills. In Agent Commons, use `agent-commons skills route "<specific task>" --json`, then `agent-commons skills load <id>` for a relevant installed skill; use `agent-commons catalog search <query>` to discover references, not to imply installation. If unavailable, use the client's native discovery and equivalent methods. Read each selected skill's own instructions, select only relevant complementary capabilities, and respect its applicability. Prefer maintained, trusted, compatible skills; inspect provenance and permissions. Never auto-install an absent skill. Use independent reviewer/subagents only if available and authorized; otherwise explicitly self-review. Do not delegate conflicting writes.

Examples of Agent Commons catalog IDs (availability must be checked):
- reliability and verification: verification-loop, e2e-testing, webapp-testing; select debugging/TDD skills through routing.
- UX/UI: ux-psychology for usability, frontend-design or frontend-design-direction for art direction, impeccable or ui-ux-pro-max for design critique; design-system when relevant. Hallmark only for new designs or when explicitly requested for an existing design, per its instructions.
- security: security-review, security-audit; choose stack-specific architecture, performance, content, SEO and documentation skills through routing.
These are candidates, not mandatory installations or guarantees of quality. Use authorized browser automation (e.g. Playwright) when available.

## 3. Master closed feedback loop
Each cycle has a task, observable evidence and a pass/fail gate. No audit-only cycle unless implementation is genuinely blocked.

```text
initialize baseline, release goal, backlog, budget
while budget remains:
  OBSERVE current evidence and checkpoint
  SELECT highest-value feasible bounded slice
  DEFINE acceptance tests and expected user-visible outcome
  ROUTE and LOAD relevant skills
  REPRODUCE defect or add failing behavioral test where practical
  IMPLEMENT complete vertical slice
  RUN targeted checks and actual workflow
  EVALUATE evidence against acceptance criteria
  while failed and repair budget remains:
    DIAGNOSE root cause -> change hypothesis -> FIX -> RETEST
  RUN applicable regression, security and visual gates
  if all applicable gates pass:
    RECORD verified outcome and checkpoint; update backlog
  else:
    isolate/revert only own failed changes safely; mark blocker
  REPRIORITIZE using new evidence
  if release goal met: proceed to independent final verification
  if stagnation or budget limit: deliver verified partial work
reserve final cycle: clean-environment verification and critical journeys
if final gate fails and budget remains: re-enter repair loop
report only evidence-supported status
```

Each iteration should leave a usable increment. Do not weaken tests, silence real errors, fake data, introduce dead UI or bypass security to reach green. Keep unverified items separate from passed items. Never overwrite unrelated changes; do not use destructive Git resets. Commit/checkpoint only within permissions.

## 4. Specialized feedback loops (invoke as applicable)
- Functional: REPRODUCE -> FIX -> TEST -> REGRESSION. Cover buttons/forms, CRUD, auth/roles, API/data, imports/exports, error/retry, empty/loading/success states; test actual persistence and negative paths.
- Product: DISCOVER -> PRIORITIZE -> DESIGN -> IMPLEMENT -> VALIDATE. Add meaningful features and automation, not gadgets. Deliver end-to-end UI/API/data/permissions/tests/docs where applicable.
- Content: FIND GAPS -> RESEARCH -> VERIFY SOURCES -> ENRICH -> VALIDATE. Improve information architecture, translations, real data, editorial clarity and update mechanisms. No invented facts or filler.
- Architecture/security: INSPECT -> REMEDIATE -> TEST -> REVIEW. Prefer simple, maintainable solutions; check authz boundaries, input validation, secrets, dependencies and data integrity; never disable protections.
- Performance: MEASURE -> OPTIMIZE -> BENCHMARK -> COMPARE. Use comparable measurements and avoid speculative complexity.
- Operations: INSTALL/BUILD -> START TEST ENVIRONMENT -> SMOKE TEST -> FIX -> RETEST. Check migrations, configuration, CI, logs, health, persistence and rollback as relevant.
- Documentation: COMPARE -> UPDATE -> VERIFY. Maintain existing sources of truth; avoid redundant reports.

## 5. Mandatory UX/UI and anti-AI-slop loop for projects with interfaces
Treat design as a release gate, not a cosmetic add-on. For CLI or nonvisual products adapt usability to the actual interaction surface; mark graphical checks N/A for truly headless services.

```text
OBSERVE real interface and user journeys
CAPTURE baseline screenshots when possible
IDENTIFY friction, weak hierarchy, inconsistency, AI-slop patterns
DEFINE product-specific visual direction and acceptance criteria
DESIGN coherent layout, typography, spacing, components, tokens
IMPLEMENT real working interactions and responsive states
RENDER actual application in browser or native client
CAPTURE after screenshots; compare at relevant viewports
TEST keyboard, focus, semantics, contrast, zoom, motion and workflows
CRITIQUE independently if available; identify concrete defects
REFINE -> RENDER -> RETEST until gate passes or budget exhausted
```

Aim for intentional, distinctive, professional design fitted to the audience. Preserve a strong existing identity and design system; improve visual hierarchy, density, navigation, meaningful feedback, clear copy and accessibility. Use references for principles, not blind cloning. Avoid generic purple/blue gradients, gratuitous glass, excessive rounding, nested card grids, decorative badges/icons, oversized headings, empty whitespace, ornamental animations and bland marketing copy. These patterns are not blanket bans: use only when justified by function and identity. Never invent metrics, testimonials or data. Do not turn every product into the same SaaS dashboard.

Acceptance evidence: actual rendered key screens; before/after where possible; successful critical journeys with real interactions; no significant clipping/overflow or unreadable content at relevant sizes (e.g. 390, 768, 1440 px for web); keyboard/focus and accessible names checked; contrast and reduced motion checked where applicable; loading/empty/error/success states usable; no unresolved material visual inconsistency or generic slop identified by critique. Use existing accessibility standards and tests; do not claim full WCAG compliance from automated scans. For each finding record screen, observation, severity, change and evidence. Do not self-award arbitrary 9/10 scores. If browser/screenshots unavailable, inspect code and report visual gate UNVERIFIED; do not claim visual acceptance.

## 6. Evidence and checkpoint
Use the repository's existing handoff/task state, or a minimal local checkpoint in an authorized location. Record iteration/attempt counters, remaining budget, baseline, exact changed files/Git ref, selected skills, acceptance criteria, commands and actual exit/outcomes, visual evidence, unresolved issues and next task. Keep secrets and private data out of logs. On resume verify Git and current state, recover counters and revalidate stale evidence; resume the next task without repeating the entire audit.

## 7. Final independent gate and delivery
Run applicable clean install, build, lint/typecheck, unit/integration/E2E, security and actual critical workflows; review changed diff and UX screenshots; test startup/deployment in an authorized test environment. Compare against baseline. CI must be tied to the exact tested revision when available. If a gate fails, re-enter the loop only within remaining budget; otherwise mark incomplete. Separate PASS, FAIL, UNVERIFIED and N/A, with reasons.

Declare READY only when the bounded release goal is met, no known P0/P1 remains in scope, the chosen improvements and content are fully integrated, applicable functional/design/security/operations gates pass and documentation is accurate. Otherwise deliver PARTIAL or BLOCKED with verified work and next action. Never claim absolute completeness, real deployment or executed tests without evidence.

Report concisely: verified corrections, features/content, UX/UI improvements, skills actually loaded, test commands/results, screenshots or their absence, Git status, remaining blockers and next step. The product is the deliverable, not the report.

Start now: identify the current project, initialize the baseline and budget, route relevant skills, execute the first improvement cycle and continue autonomously until the stop condition.
