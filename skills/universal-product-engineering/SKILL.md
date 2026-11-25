---
name: universal-product-engineering
description: Autonomous loop engineering for any software project. Iteratively fix, develop, enrich, test, critique UX/UI and eliminate AI slop with measured baselines, acceptance gates, specialist skills and resumable checkpoints.
---

# Universal Product Engineering — V2

## Contract
Run on the current project. Deliver working improvements, not just an audit, plan or code volume. Preserve purpose, existing behavior, data, user changes and constraints. Improve reliability, meaningful features, content, UX/UI, security, performance, maintainability and deployment as applicable. Proof outranks claims; repair before building on broken foundations; favor small reversible increments and user value over sophistication. Respect repository instructions, permissions and higher-priority policies.

## 1. Initialize once (Phase 0)
Infer product, audience, language, target environment, scope, constraints and budget from repository and request; record assumptions briefly. Read repository instructions and handoff; inspect Git status, architecture, dependencies, scripts, CI, config and existing design. Avoid unnecessary discovery. Use a dedicated branch/worktree if authorized and appropriate; preserve user changes.
- Identify the 3–7 most valuable critical journeys (fewer for small projects); include error/recovery and permission paths as relevant.
- Establish baseline: clean install from docs where feasible, build, lint/typecheck, tests, startup and real critical journeys. Use isolated fixtures/test data, not production. Capture baseline UI at relevant viewports. Record actual commands, outcomes and unavailable checks. If build or test harness is broken, prioritize restoring it.
- Define a bounded release goal, measurable criteria, initial scorecard and prioritized backlog; outline first few increments. Start implementing promptly.
- P0: security/data loss/crash/install or build blockers; P1: broken critical journeys, severe UX/accessibility, incorrect install docs; P2: meaningful features, content enrichment, UX/design improvements, nonblocking bugs and performance; P3: secondary polish. Rank within priority by impact, frequency, risk, dependency and effort. Address actionable P0/P1 first; reserve real capacity for P2 as soon as the foundation is stable. Do not equate product growth with cosmetic polish.
- Defaults: 12 total cycles including final verification and rework; 3 repair attempts per task across all cycles/resumes; stop after 2 consecutive cycles without verified progress. Lower limits when required by environment/time/tokens/cost; reserve one cycle for final gate. Never reset counters on task switches or resume.

## 2. Skills: discover, select, load, evaluate
Discover metadata before reading instructions. Use `agent-commons skills route "<specific task>" --json`, then `agent-commons skills load <id>` for relevant installed skills; `agent-commons catalog search <query>` discovers references, not installation. If unavailable use client-native discovery and equivalent methods. Select a small complementary set by task, compatibility, proven relevance, provenance, maturity and cost. Read each skill's instructions and respect its applicability. Reassess if results disappoint. Never recursively invoke this master skill or auto-install absent skills. Prefer project tools. Use authorized browser automation (Playwright or equivalent), independent reviewers/subagents only where available and authorized; avoid conflicting writes. If unavailable, self-review in a distinct adversarial pass and disclose the limitation.
Catalog candidates (check actual installation):
- verification-loop, e2e-testing, webapp-testing; route for debugging, TDD and stack-specific engineering.
- UX/UI: ux-psychology for usability, frontend-design or frontend-design-direction for art direction, impeccable or ui-ux-pro-max for critique, design-system for consistency. Hallmark only for new designs or when expressly requested for existing designs per its instructions.
- security-review, security-audit; route for performance, architecture, accessibility, content, SEO, operations and documentation.
Candidates are not guarantees or mandatory installs. Record actual skills loaded, not merely suggested.

## 3. Master closed feedback loop
Every cycle has a coherent bounded slice (typically 1–5 tasks), explicit criteria, evidence and decision. Do not spend cycles auditing unless implementation is blocked.

```text
INITIALIZE baseline, release goal, backlog, scorecard, budget
while work-cycle budget remains (reserve final gate):
  OBSERVE persisted state and current evidence
  SELECT highest-value feasible slice
  SPECIFY acceptance checks before implementation
  ROUTE + LOAD appropriate skills
  REPRODUCE defect with failing test when practical
  IMPLEMENT complete vertical slice
  TEST targeted checks, relevant full suite and real journeys
  CRITIQUE diff, UX, security and regression risks
  EVALUATE against explicit criteria and baseline
  while failed and task attempts remain:
    DIAGNOSE root cause -> change hypothesis -> FIX -> RETEST
  if applicable task gates PASS:
    CHECKPOINT verified increment (atomic commit if authorized)
  else:
    ISOLATE or safely revert only own failed change; record blocker
  UPDATE scorecard, evidence, counters, backlog, next action
  RETROSPECT: worked / failed / change in approach
  REPRIORITIZE using evidence; detect oscillation or plateau
  if release goal appears met: proceed to final gate
  if plateau or no feasible work: deliver verified partial result
RUN final gate within shared budget
if failed and budget remains: re-enter relevant repair loop, then final gate
REPORT READY / PARTIAL / BLOCKED according to evidence
```

Task gate: acceptance outcome observed, relevant tests pass, no introduced regression, applicable lint/types/security/visual checks pass, docs updated when affected, checkpoint recorded. Use targeted checks per edit and full applicable suite at cycle boundaries; never skip required repository gates. If baseline has preexisting failures, distinguish them and do not label a red required gate passed. No disabled/weakened tests, swallowed errors, fake data, placeholders or bypassed controls for green results. Anti-oscillation: if the same behavior is changed and reversed across cycles, stop repeating that approach; document cause, alternatives and decision. Count attempts even when changes are reverted; safely isolate failed work without destructive resets or touching user changes.

## 4. Evidence hierarchy and scorecard
Classify claims: A = executed command with observed outcome; B = observed behavior in running target/test environment (real workflow, rendered UI); C = code inspection; D = assumption. A/B must actually support the specific criterion; a green build is not proof of functionality, and a screenshot alone is not proof of interaction. C can support static facts but not runtime success; D is unverified. Record PASS, FAIL, UNVERIFIED or N/A with reasons. Do not invent metrics, results, coverage, or certainty.
Track baseline, current cycle, target, status and evidence for applicable dimensions:
| Dimension | Example measures / target |
| --- | --- |
| Functional | critical journeys passed/total; required tests green; regression cases |
| Security | severe findings, tested access boundaries; no unresolved critical/high blocking risks |
| UX/UI | accepted screens/journeys, specific critique findings resolved, responsive evidence |
| Accessibility | serious/critical automated findings and manual keyboard/focus/contrast checks |
| Performance | measured before/after p95, startup, or web vitals; agreed budgets |
| Product/content | selected complete features and verified content gaps closed |
| Operations | clean install, startup, CI, migrations/restore where applicable |
| Maintainability | lint/types, relevant debt removed, documentation synced |
Use comparable environments; record measurement method and exact revision. Choose targets appropriate to the product, not arbitrary universal numbers. An optional qualitative design rubric is anchored to findings, not a self-awarded score. A cycle progresses when a criterion is newly verified or a measured defect is resolved without new regressions. Stop on two cycles with no verified improvement, exhausted budget or all feasible tasks blocked. Stopping is not success; missing or waived targets remain visible.

## 5. Specialized feedback loops
- Functional: REPRODUCE -> FIX -> TEST -> REGRESSION. Cover real actions, CRUD, auth/roles, API/data, imports/exports, persistence, invalid/empty/long/Unicode inputs, concurrency and network/session failures as relevant. Unit for logic, integration for boundaries, E2E for critical journeys. No unhandled errors on verified paths.
- Product: DISCOVER -> PRIORITIZE -> DESIGN -> IMPLEMENT -> VALIDATE. Add useful features and automation from observed needs; deliver complete UI/API/data/permissions/error states/tests/docs where applicable. No gadgets or unnecessary architecture.
- Content: FIND GAPS -> RESEARCH -> VERIFY SOURCES -> ENRICH -> VALIDATE. Improve real content, classification, translations, microcopy, search and update mechanisms. Cite/date factual claims as needed; label examples; no fabricated facts, metrics, testimonials or filler.
- Architecture/code: INSPECT -> SIMPLIFY -> BUILD -> TEST -> REVIEW. Remove confirmed dead code, avoid wrappers/duplication, swallowed errors, needless dependencies and speculative rewrites. Justify significant dependencies (need, alternatives, license, maintenance).
- Security: MODEL THREATS -> CHECK -> REMEDIATE -> RETEST. Identify assets and main risks; test authz/IDOR, validation, injection, CSRF/session/CORS/headers, uploads, rate limits, secrets and dependency vulnerabilities as applicable. Use authorized scanners; avoid exposing data or weakening protections. Never claim full OWASP compliance from a partial check.
- Performance: MEASURE -> OPTIMIZE -> BENCHMARK -> COMPARE. Measure appropriate p95/startup/web metrics; for web consider LCP <=2.5s, INP <=200ms and CLS <=0.1 as reference field targets where applicable, not automatic lab guarantees. Avoid speculative complexity.
- Operations: INSTALL/BUILD -> START TEST ENVIRONMENT -> SMOKE TEST -> FIX -> RETEST. Verify config, migrations, logs, health/readiness, persistence, CI, graceful shutdown and backup/restore/rollback where applicable. No production testing without separate authorization.
- Documentation: COMPARE -> UPDATE -> VERIFY. Maintain existing source of truth; document installation, configuration, usage and operations as applicable. Avoid redundant reports.

## 6. Mandatory UX/UI and anti-AI-slop loop
For graphical interfaces, UX/UI is a blocking release gate, not decoration. For CLI/API adapt usability to help, errors, exit codes, machine output, API contracts and examples; graphical checks N/A only where genuinely inapplicable.
Define a concise brief: audience, context, existing identity, 3 intended attributes and 3 to avoid, references for principles, palette/type/density/spacing/motion and interaction conventions. Preserve strong identity; avoid blind cloning. Use coherent semantic tokens, components and accessible interactive states.

```text
OBSERVE real journeys -> CAPTURE baseline
IDENTIFY friction, hierarchy and slop -> DEFINE visual acceptance
DESIGN intentional direction -> IMPLEMENT working interactions
RENDER actual app -> CAPTURE before/after at relevant sizes
TEST real journeys, responsive, keyboard, focus and accessibility
CRITIQUE specific screens -> REFINE -> RENDER -> RETEST
repeat within shared budget until gate passes
```

Use authorized browser/native tooling; web reference sizes 390, 768, 1440 px when relevant. Assess 5-second clarity (where am I, what can I do, primary action?), persona-based walkthrough and usability heuristics (feedback, control, recognition, consistency, error prevention/recovery). This is a heuristic review, not a user study. Check hierarchy, density, typography, alignment, states, identity and finish. Record each finding with screen, severity, observation, action and evidence.
Anti-slop: avoid generic violet/blue gradients, gratuitous glass/shadows, nested cards, repetitive bento grids, decorative badges/icons, huge headings, purposeless whitespace, generic heroes, excessive rounded surfaces, ornamental motion and bland slogans. Patterns are not blanket bans: justify by function and identity. Use real content, precise action labels, helpful errors and empty states. No fake metrics/testimonials.
Gate: actual rendered key screens; before/after where feasible; critical interactions pass; no significant overflow/clipping, unreadable content or material visual inconsistency; keyboard/focus/names/contrast/zoom/reduced motion and loading/empty/error/success states checked where applicable. Aim for WCAG AA as appropriate; automated axe or equivalent if available plus manual checks, not a claim of full compliance. A visual critique should identify concrete issues rather than assign arbitrary 9/10 scores. If browser/captures or required interaction verification unavailable, record UNVERIFIED and do not declare graphical gate passed.

## 7. Persistent state, anti-amnesia and safe autonomy
Reuse existing task/handoff state or, if none, one compact local `.loop/STATE.md` in an authorized location (no mandatory tracked reports). Store goal/assumptions, baseline, scorecard, backlog IDs/priorities/criteria/status/attempts, cycle/budget/stagnation counters, exact Git ref, skills loaded, actual commands/outcomes, concise decisions/retrospective, blockers, next task and safe screenshot references. Keep evidence private; do not log secrets, personal data or raw sensitive output. Use local ignored screenshots only where permitted. No unnecessary repo changes solely for bookkeeping. On resume verify Git and workspace, recover counters, revalidate stale evidence and continue; if state unavailable, disclose and reconstruct conservatively.
Autonomous reversible edits within permission; human authorization for destructive operations, secrets/infrastructure changes, new paid services, third-party installation, major architecture changes, publishing, production deployment or protected branch merge. Never overwrite unrelated changes or execute untrusted scripts. Continue independent safe tasks while blocked. No auto-install or unauthorized MCP/subagents.

## 8. Final gate and delivery
Reserve budget for clean install/build, full applicable tests, lint/types, security, actual critical journeys, visual review, test-environment startup/operations, documentation and diff review. Use independent reviewer if available/authorized, otherwise explicit separate adversarial self-review. Tie CI evidence to exact tested SHA. Re-enter repair loop if needed and budget permits; do not reset counters.
READY requires scoped release goal, no known P0/P1 in scope, selected features/content complete, applicable functional/design/security/operations gates passed, no known introduced regressions and accurate docs. PARTIAL means verified increments but outstanding/unverified gates or scope; BLOCKED means no feasible further progress due to missing access/dependencies/decisions. N/A needs reason, not an excuse. Never claim absolute bug-free software or production deployment without evidence.
At each cycle end report briefly: done + evidence, scorecard changes, blocker, next cycle. Final: verdict, baseline vs final, changes/commits, actual skills/tests/visual checks, unverified items, remaining risks and next action. Product is the deliverable, not the report.

Start now: infer parameters, initialize baseline and budget, route relevant skills, execute the first improvement cycle and continue autonomously until a stop condition.
