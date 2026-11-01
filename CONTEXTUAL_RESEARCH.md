# Contextual research across the founder journey

Research is a header action and a contextual workspace, not a fifth footer tab. Situation, Next move, Investor and Startup remain in the footer; existing saved research and contextual entry points use the same workspace.

## Current milestone

Situation, Next move, Startup and Investor now open the same research workspace with their relevant context. A fifth Research navigation item makes that workspace directly reachable. Core planning, matching and graph calculations remain deterministic; model reasoning is optional and never starts just because a user changes tabs.

| Starting point | Action | Captured inputs |
| --- | --- | --- |
| Situation | Investigate my assumptions | Current situation choices, investor-fit input snapshot and existing experiment if available |
| Next move | Research this experiment | Situation, current task, experiment action/evidence and recorded or currently edited learning |
| Startup | Compare this example with my situation | The displayed snapshot selected as evidence, situation and current experiment context |
| Investor | Research this investor | The displayed investor selected as evidence, situation, fit inputs and current experiment context |

The source card identifies the starting point and lets the founder inspect the captured context. Questions and evidence selections remain editable. Source context is a founder-provided working assertion, not independently verified evidence; selected sourced records remain separate evidence items.

## Complete journey

1. Use a contextual action or open Research directly for a general question. If current source inputs have unsaved edits, confirm that research may take a copy; this does not save or change the original situation/plan.
2. Review the captured context and selected records. Build the evidence packet and inspect the exact inputs, source dates and omissions.
3. In browser-only mode, export a prompt and review a manually supplied response. For live reasoning, open the app through the local helper, explicitly connect ChatGPT, select a model and consent to transmission. Graph planning remains an optional, separately reviewed stage.
4. A saved result retains its question, exact packet, source context and model metadata. Findings, interpretations, hypotheses, unknowns and proposed investigations remain distinct. Return to this run's source opens the current situation/record; the saved context is not silently replaced by the latest inputs.
5. Choose Review as experiment on an investigation from a saved contextual run. Inspect its rationale and supporting sources or its general-method label, the destination plan, and existing learning. Edit the proposed action and expected evidence/review condition.
6. Keep existing plan cancels without changing it. Accept and save experiment explicitly updates the user-owned task. Its previous plan, status and learning are retained in acceptance history, linked to the research run and investigation. The new experiment starts at todo with an unreviewed outcome; previous learning is not presented as evidence that the new experiment has already run.
7. Next move identifies research-linked work. Continue the plan to inspect accepted research and previous learning, or open the linked saved run. Reloading the app preserves these links in the same browser/provider-pack workspace.

Nothing in this flow changes investor eligibility, source records or the canonical Guide Pack. A plan is the founder's decision, not model-certified advice or a predicted outcome.

## Boundaries and recovery

- Current experiment notes and captured founder context may enter a research packet. Inspect them before model transmission. Private contact graphs, shortlist drafts and OAuth credentials are not automatically included.
- Changing the source situation, investor perspective, fit inputs, supporting task evidence, experiment/learning or pack content requires refreshed research before a proposal can be applied. Local fingerprints detect changes; they are not cryptographic signatures or independent evidence certification.
- A historical decision cutoff excludes undated source context from the transmitted packet. Historical simulations cannot directly change a current plan.
- Another tab changing saved plans or the situation blocks acceptance. Reload to review the newer work. A failed storage write leaves the previous plan intact and keeps the proposal review open with the edited text.
- Live research must finish or be cancelled before leaving the research workspace or switching context. Entering context, navigating tabs, inspecting saved results and reviewing a proposal do not call a model.
- Older research without source-context metadata remains readable. Start a contextual question before using its investigation through the new acceptance flow. Repeated acceptance of the same investigation is refused; subsequent manual plan editing remains available.
- Browser persistence depends on profile, pack identity and origin/file location. Export research history and other browser work regularly. This milestone adds no cross-device synchronization, server-side research history or automatic restoration of unsaved drafts.

The existing research packet limits still apply, with an additional 12,000-character serialized source-context limit. Oversized context fails visibly without silent truncation. The structured output schema remains version 1; source context and plan acceptance are separate records rather than model authority to edit application state.

## Architecture

js/research-context.js constructs source context, checks applicability and creates an accepted plan with a bounded snapshot of prior work. js/research-ui.js maintains the common workspace, contextual runs, revisions, packet review and proposal actions. js/app.js captures tab context, returns to source records and owns the explicit plan-review dialog and browser-state write. Accepted links live in taskProgress.researchApplications; run snapshots live in the existing provider/pack research-history store.

The browser graph, local OAuth helper, operator distribution bridge and optional Neo4j reference retain their existing responsibilities. Exported browser editions include the contextual interface. The incubator reference web page remains a separate operator/research demonstration; this milestone does not merge the two interfaces or provision shared model credentials.

## Verification and outstanding acceptance

Automated checks exercise all four entry points without model calls, source/record selection, historical context exclusion, edited acceptance, cancellation, prior-learning retention, reload and source links, stale-context rejection, cross-tab conflicts and failed saves. Operator-package tests initialize the same interface with custom data and no backend. These are simulated DOM and contract checks, not measurements of usability or model quality.

Before publication, manually check the complete journey in supported browsers: keyboard navigation and dialog focus/Escape; narrow screens and enlarged text with five navigation items; source-link behavior; initial/refreshed helper state; a real model run and cancellation; and user understanding of facts versus hypotheses and explicit plan acceptance. Record founder task completion, unnecessary navigation/re-entry, errors and disagreements before claiming that the revised UI is more streamlined in practice.
