# Release and pilot checklist

This is a local release candidate for the deterministic foundation. The intended end goal is an LLM research assistant using investor criteria, startup snapshots and founder context to drive research. The initial packet/history workflow and OAuth/model adapter are now implemented, while real-account sign-in, completed live inference and reasoning quality are not validated. Development checks for the foundation pass; the latest workflow still needs real-browser acceptance and a founder pilot. Publication requires a separate user decision.

## Milestones and checkpoints

| Milestone | Delivered locally | Checkpoint status |
| --- | --- | --- |
| Matching foundation | Four-field assessment, evidence dates, alignment groups, exclusions, controlled sector mappings | Automated regression checks pass; independent accuracy review pending |
| Actionable results | Saved profiles, investor notes, verification questions, archive/restore and exports | Simulated workflow checks pass; latest real-browser acceptance pending |
| Research coverage | Pack 0.9.0: fourteen records, six equity comparisons (five with current-fund timing claims) and three startup snapshots | Sources and limitations recorded; broader coverage and ongoing refresh remain manual work |
| Outreach preparation | Editable local templates, source attribution, placeholders and review warnings | Automated provenance and persistence checks pass; founder usefulness pending |
| Founder pilot | Protocol below and nine authored benchmark scenarios | Not yet completed |
| Release preparation | Reproducible offline assets, linked help and allowlisted export | Local packaging checks pass; acceptance and publication pending |

Implementation details and commands live in the [developer guide](DEVELOPMENT.md). The [methodology](METHODOLOGY.md) defines the evidence claims that reviewers should assess.

## Research-assistant roadmap and current checkpoints

The end goal is a founder completing question > evidence > findings/hypotheses > investigation > new evidence > revised conclusion. Matching and outreach are supporting capabilities. [RESEARCH_PLAN.md](RESEARCH_PLAN.md) specifies the first flow.

| Milestone | Deliverable | Advancement checkpoint |
| --- | --- | --- |
| R1: contracts and cases | Evidence packet, output schema and reviewed supported/missing/conflicting/historical fixtures | Define reviewer criteria, sample sizes, acceptance thresholds and blocking errors before model runs |
| R2: inspectable retrieval | Bounded packet assembled from selected investor claims, snapshot fields, source dates and deterministic results | Verify record inclusion, omissions, truncation, contradictions and private-data boundaries |
| R3: one live reasoning flow | Secure model adapter and structured findings, hypotheses, unknowns and investigations | Check citations for actual support, malformed-output behavior, abstention, assumptions and historical leakage |
| R4: saved research revisions | Exact input/output history, founder feedback, new evidence and linked revisions | New evidence revises appropriate conclusions without erasing earlier work or silently changing canonical records |
| R5: evaluation and founder pilot | Comparison with deterministic guidance and a simple evidence summary; founder task observations | Report reviewer disagreements, usefulness, cost and latency; resolve blocking defects |
| R6: research release | Documented provider/model/contract versions, limits, acceptance results and release package | Complete affected browser acceptance and obtain a separate publication decision |

R1/R2 contract code and packet fixtures are implemented with authored tests; independent contract/fixture review remains pending. R3 OAuth/model request code is implemented but actual account sign-in/inference has not been accepted. R4 saved runs/feedback/revisions are implemented and tested with synthetic/manual responses. R5/R6 semantic evaluation, founder usefulness and release acceptance remain pending. The matcher and synthetic tests are not proof of research quality. The pilot protocol below can test the implemented app today; the research pilot additionally evaluates the question-to-revision loop.

## Known limitations

- Six equity profiles are a small curated sample, not broad investor coverage.
- Mandate refresh is manual. The 180-day review window controls comparison freshness; it is not a monitoring service or proof that an investor is deploying capital.
- Sector aliases and broader-sector relationships are editorial rules. Compound theses, exclusions, founder commitments and full eligibility still need review.
- Currency conversion and automatic regional hierarchies are absent. Published round totals and maximum-only figures do not establish individual check ranges.
- Outreach remains template-based. A separate research workflow can use the OAuth helper; actual live model acceptance remains pending. Private, founder-entered contacts can support introduction-path research; the app does not guarantee introductions or send messages.
- Browser storage depends on origin/file location and profile. Exports provide a readable backup; there is no import/restore interface.
- Simulated DOM checks do not verify actual layout, keyboard operation, assistive technology or browser-specific file handling.

## Live OAuth/research acceptance — pending

Use [RESEARCH_SETUP.md](RESEARCH_SETUP.md) to start the loopback helper, register/sign in to ChatGPT, refresh account-specific models and run one public-data research question after inspecting the packet. Confirm completed inference, source-reference review, cancellation/error paths, saved feedback and a new-evidence revision. Account eligibility and workspace policy must be observed, not inferred from synthetic tests. No actual model-quality measurements have been recorded.

## Real-browser acceptance — pending

Use the [user guide](GUIDE.md) for the task steps. Record the app revision/cache version, pack version, browser and viewport.

1. Open the prepared index.html directly. Check help, source links and error messages.
2. Compare the US SaaS example and change stage, currency and missing inputs. Inspect evidence and additional conditions.
3. Save a profile, investor, founder details, notes and edited draft. Reload and confirm all remain.
4. Change the startup profile. Confirm saved assessments request review, notes survive an update and older drafts remain visibly reviewable.
5. Archive and restore an entry. Export and inspect the Markdown file for notes, source dates and review warnings.
6. Check keyboard-only navigation, source-dialog Escape/focus behavior, 320px-wide layout and enlarged text. Long comparisons and drafts should scroll without hiding content.
7. Where HTTPS hosting is available, verify offline reload and help after the first successful load. Direct-file use does not install a service worker.

Save a clear pass/fail observation for each task. Earlier checks of the comparison screen do not substitute for acceptance of the newer shortlist workflow.

## Founder pilot — pending

Invite 3–5 founders to complete profile > comparison > verification > shortlist > draft > export without assistance. Use real startup descriptions only with the founder's agreement, and keep their details outside the public repositories.

| Observe | Record |
| --- | --- |
| Match usefulness | Useful leads, misleading leads, missed relevant investors and the evidence behind the judgment |
| Understanding | Interpretation of alignment and coverage; unclear unknowns or additional conditions |
| Task completion | Where help was needed, failed saves, lost edits or difficult navigation |
| Draft quality | Unsupported investor claims, missing facts, unclear asks and edits needed before use |
| Trust and control | Ability to inspect sources, preserve notes, review changes and export work |

For each observation record: anonymous participant ID, startup case, app/pack versions, task, expected behavior, actual behavior, severity, supporting evidence and proposed correction. This is a feedback record, not a funding-outcome metric.

## Release gate

Before publication of the implemented foundation:

- Resolve data-loss defects and misleading classifications found during acceptance or the pilot.
- Review source-backed corrections and any affected benchmark rationales. Refresh mandates requiring review.
- Document remaining limitations and outstanding issues with an owner or next action.
- Run the build, test, syntax and export commands in DEVELOPMENT.md. Verify the exported package is self-contained and contains no private working files.
- Recheck affected real-browser tasks, then obtain the user's publication decision.

Do not call the product independently validated solely because its authored benchmark passes. Add a backend, semantic retrieval or graph infrastructure only when observed use cases justify the additional work.

## Recovery and private data

Export shortlists regularly. Unreadable saved data must be preserved; use the app's recovery download if available. An older tab must reload when another tab changed its saved shortlist. Review exported founder text, notes and drafts before sharing. Keep raw source archives, private feedback and credentials outside public release folders.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Graph-driven research acceptance

Locally implemented: one model planning pass, deterministic public query execution, expanded packet inspection and a separately consented final answer. Automated fixtures cover unknown IDs, unsupported queries, limits, historical leakage, invalid proposals, cancellation and saved query audits. Pending: sign in with a real eligible account, inspect the catalog, run a historical path question, check query relevance and factual support, compare no-graph reasoning, and record both call durations/usage. Check real-browser control state, keyboard access and cancellation before publication. Local fixtures are not live acceptance or usefulness measurements.

## Incubator graph reference milestone

The optional [Neo4j reference](ENTERPRISE_REFERENCE.md) is now implemented alongside the browser app. It includes fictional investor/startup workspaces, validated imports, versioned storage, organization and private-owner isolation, native graph query parity, scoped model adapters and an adoption guide. Real Neo4j/API integration checks pass. See [reference acceptance](enterprise/ACCEPTANCE.md) for evidence and pending production, live-model and browser gates. This does not make Neo4j a dependency of the browser version.

## Manual operator distribution checkpoint

Implemented: an administrator-only export of an explicit organization revision; operator privacy/rights approval; modular component manifest, hashes and identity checks; isolated branded browser build; data-copy update instructions. Tests reject changed components and private/credential fields and exercise the packaged browser graph with no backend. The [distribution guide](DISTRIBUTION_GUIDE.md) defines the repeatable commands. Actual customer redistribution approval, recipient browser acceptance and manual update/retention policy remain operator gates. This does not add automatic synchronization, revocation or a shared model login.

## Contextual founder-journey milestone

Implemented locally: all four tab entry points; a common Research workspace with explicit mode/context indicators; saved source links; proposal review/edit/cancel/accept; preserved prior plans and learning; stale-context and cross-tab guards; and failed-save recovery. Automated source/DOM tests cover these transitions and an operator browser edition. The [contextual research guide](CONTEXTUAL_RESEARCH.md) lists the remaining real-browser, keyboard/accessibility, live-account and founder-usability checks. More streamlined is a design aim, not a measured outcome. Publication remains a separate decision.
