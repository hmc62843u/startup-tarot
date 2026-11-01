# LLM research assistant: contracts and evaluation plan

## Goal and status

Use investor profiles and criteria, dated startup snapshots and founder context to identify knowledge gaps, develop hypotheses and propose evidence-backed research for a founder.

The initial version-1 research flow is implemented: inspectable packets, structured/reference validation, saved runs, feedback and revisions. A local helper implements ChatGPT OAuth and streamed model requests. Real account sign-in, completed live inference, semantic source support and founder usefulness are not yet validated. [RESEARCH_SETUP.md](RESEARCH_SETUP.md) describes operation and limitations.

| Capability | Status |
| --- | --- |
| Structured records, claim sources and dates | Implemented in the current research pack |
| Deterministic comparison and saved evidence snapshots | Implemented; independent usefulness validation pending |
| Model-ready evidence packets and structured research outputs | Version-1 assembly and structural/reference checks implemented |
| Live LLM reasoning, research sessions and revisions | UI, saved history and OAuth adapter implemented; real-account inference acceptance pending |
| LLM-directed public graph exploration | One planning pass, browser query execution, inspectable expanded packet and saved audit implemented; live acceptance pending |
| Automated web research and source ingestion | Later phase; not part of the first flow |
| Independent assessment of LLM citation support and usefulness | Not performed |

## First complete research flow

The first question type is: **What should this founder investigate before approaching investors, and which dated startup examples could help frame the investigation?**

An illustrative question is: What customer-demand evidence should a pre-seed software startup gather before approaching investors? The system must allow the answer that the available records do not support a specific recommendation.

1. The founder enters a question and startup context, selects the relevant records, and chooses an assessment date.
2. A deterministic assembler creates a bounded evidence packet from the selected investor claims, snapshot fields, source metadata and existing comparison results. The founder can inspect what will be sent.
3. Optionally request one LLM graph planning pass, execute validated public queries in JavaScript, and inspect the expanded packet. A second consent is required for final reasoning. An explicitly enabled model receives that packet and returns facts, interpretations, hypotheses, unknowns and proposed investigations as separate fields.
4. The application checks schema and reference integrity, flags unsupported or invalid references, and shows concise rationales with source links. Structural validation alone does not establish semantic support.
5. The founder saves, challenges or edits the research output. A rejected recommendation is retained with the reason rather than silently replaced.
6. The founder can add a finding, its source and dates. An explicit follow-up request creates a new revision showing what changed and which hypotheses remain unresolved.

No automatic browsing, experiments, outreach or publication is triggered by a recommendation. New findings are working research until reviewed for promotion into canonical records.

## Evidence-packet contract version 1

Research contract version 1 is implemented separately from Guide Pack v1/v2, which remain unchanged. Limits are five selected records, sixty evidence items, ten working findings, a 2000-character question and a 60,000-byte packet. Oversized inputs are rejected with no silent truncation.

| Field | Required information |
| --- | --- |
| packet_id and contract_version | Stable session input identity and versioned contract |
| question and scope | Founder question, intended decision and excluded tasks |
| startup_context | Supplied facts, missing fields and founder-provided assertions clearly labelled |
| assessment_date | When relevance is assessed; optionally a separate historical decision cutoff |
| records | Stable investor, criterion and snapshot IDs, record versions and kinds |
| evidence_items | Stable evidence IDs, factual paraphrases or snapshot fields, source IDs and relevant limitations |
| source_metadata | URL, publication date if known, checked/retrieved date, event/snapshot date where relevant and source locator if available |
| deterministic_assessments | Matching results with their inputs and rule version; these are computed interpretations, not source facts |
| missing_and_conflicting_evidence | Known gaps, contradictory claims and claims that require refresh |
| selection_manifest | Included and omitted record IDs, selection reasons and any truncation |

The first implementation uses explicit record selection and bounded field retrieval. These are byte/item limits, not a tokenizer-specific guarantee. Omissions are disclosed and contradictory/limiting evidence is preserved within the selected records. Do not silently discard contradictory or limiting evidence to fit the budget. Embeddings remain conditional. Bounded graph traversal is implemented separately and selected public paths can enter packets; see RELATIONSHIPS.md.

## Structured research-output contract version 1

| Field | Contents and review requirement |
| --- | --- |
| run_id, packet_id and output_version | Link the output to the exact input and revision |
| findings | Supported factual statements with evidence IDs and a concise account of what the sources establish |
| interpretations | Comparisons or implications with evidence references and explicit assumptions |
| hypotheses | Unproven explanations or possibilities, supporting observations, alternatives and evidence that would weaken them |
| unknowns and contradictions | Missing information, unresolved differences and limitations affecting the decision |
| proposed_investigations | Specific question/action, why it matters, supporting evidence or labelled general rationale, expected observation and review/stop condition |
| historical_comparisons | Relevant similarities, material differences, dates and transfer limits for each startup analogy |
| caveats and abstentions | Where evidence is insufficient and which conclusions must not be drawn |

Every factual claim attributed to the packet needs an existing evidence ID. A research suggestion may be a general method rather than a sourced fact; label it as such. A hypothesis can cite observations without claiming those observations prove it. Do not require invented numeric confidence or expose private model reasoning; use concise, reviewable explanations.

## Session and revision records

Saved research runs retain the question, exact evidence packet, pack/record versions, model identifier, prompt/contract version, generation time, available usage/cost metadata, validation results and displayed output. Retain enough information to audit the result; model runs need not be exactly reproducible.

Keep founder feedback, new findings and model revisions separate. New evidence creates a new packet/run linked to its predecessor. Display a short change summary, superseded claims and unresolved questions. Never overwrite the reviewed pack, a founder note or an older research conclusion automatically.

Store source contents only where rights and necessity permit. Keep private research sessions out of public pack exports. Any future remote processing requires an accurate account of what founder information is transmitted and how the selected service handles it; the current app's local-only behavior must not be presented as a promise for that future integration.

## Reasoning and source safeguards

- Treat source text, snapshots and founder notes as data, not instructions. A retrieved passage cannot authorize tool execution or change the research scope.
- Preserve investor eligibility mismatches and source uncertainty. The model cannot override a documented exclusion simply because two descriptions sound similar.
- Distinguish a historical event date, later publication date and retrieval date. A retrospective source can describe an earlier event, but must not be represented as evidence that was available to founders at that earlier time.
- For a historical decision simulation, exclude facts known only after the decision cutoff. Unknown availability remains unknown; do not manufacture dates to pass a filter.
- Do not use later fundraising, survival or success to prove that an earlier action caused the outcome. Include counterexamples and material context differences where evidence supports them.
- Missing or conflicting sources may justify abstention, additional research or a conditional hypothesis. Do not turn every packet into a confident recommendation.
- A citation validator checks references; a reviewer still checks whether the cited content supports the actual statement.

## Evaluation and advancement gates

| Checkpoint | Evidence needed to advance |
| --- | --- |
| Contract and fixture review | Synthetic, public or appropriately consented cases cover supported, missing, conflicting and retrospective evidence; expected review criteria are defined before model runs |
| Packet integrity | Selected records, dates, omitted items and truncation can be inspected; no private or out-of-scope material is silently included |
| Output validation | Malformed outputs and nonexistent evidence IDs are visibly rejected or flagged; failures do not appear as completed research |
| Reviewer assessment | Reviewers record citation support, unsupported claims, historical leakage, contradictions, assumptions and actionable investigation quality |
| Baseline comparison | Compare the same cases with current deterministic guidance and a simple evidence-summary baseline; report quality, cost and latency together |
| Revision test | New evidence changes the appropriate conclusions while preserving prior outputs and founder feedback |
| Founder pilot | Founders understand the distinction between fact and hypothesis and can use the proposed investigations; usefulness observations are recorded |
| Release decision | Known issues and model/contract versions are documented; blocking failures are resolved and the user authorizes publication separately |

Define sample sizes, acceptance thresholds and blocking-error rules before evaluating live outputs. Report actual results and disagreements rather than calling a passing schema or an authored benchmark an accuracy score. Fabricated citations, silent evidence loss, private-data exposure or later outcomes presented as contemporaneous proof must be treated as blocking defects.

## Implementation boundary

The implementation stays in the current repositories. Packet assembly and output validation are independent of the model adapter. The loopback helper uses OpenAI Sign in with ChatGPT; tokens remain in helper memory, outside static assets, browser storage and Guide Packs. Available models are fetched for the signed-in account rather than hardcoded. No API-key billing fallback is implemented.

The app can remain a local deterministic tool without that adapter. Live research requires explicit OAuth sign-in, eligible plan scope, network access and per-packet consent. A shared service repository, relational store, vector index or graph database should be introduced only for concrete operational or retrieval requirements.

See [ARCHITECTURE.md](ARCHITECTURE.md) for proposed component boundaries, [METHODOLOGY.md](METHODOLOGY.md) for interpretation rules, [DEVELOPMENT.md](DEVELOPMENT.md) for implementation responsibilities and [LOCAL_RELEASE.md](LOCAL_RELEASE.md) for the roadmap.

The contract tables describe intent as well as version-1 fields. In code, source selection/omission metadata, `missing_and_conflicting_evidence`, `previous_revision` and `working_findings` form the packet; output uses `findings`, `interpretations`, `hypotheses`, `unknowns`, `contradictions`, `proposed_investigations`, `historical_comparisons`, `caveats` and `change_summary`. Runs store their own identity/model/prompt metadata around the output. Schema checks do not validate these claims semantically. Historical mode also omits undated founder narrative and prior model conclusions to reduce leakage.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Model-directed public graph research

The research screen now connects LLM planning to the browser graph. Build a packet and open LLM graph exploration. Inspect both the packet and displayed public node catalog, connect ChatGPT, choose a model and confirm transmission. Choose Plan and explore public graph. The model proposes queries; JavaScript validates and executes them in the browser. Inspect the query audit and expanded evidence packet, then confirm again and choose Run research for the final answer.

One successful planning pass per prepared packet allows at most three queries, four hops and five returned paths per query, within the existing twenty-edge and 60 KB packet bounds. Supported queries are paths between existing public entities and same-round/shared-company network projections. Zero queries and no-path results are valid abstentions, not proof that real-world relationships are absent. There is no recursive autonomous browsing or canonical data mutation. Private contacts and fictional graphs are unavailable to the planner and executor. Historical availability filters constrain the catalog and results.

The planner receives the prepared packet plus the displayed public node catalog; the final request receives the expanded packet. Each call uses the selected ChatGPT model and may consume plan usage. Consent resets after exploration, including failure/cancellation. Invalid proposals fail without altering the original packet. The final saved run preserves its exact expanded packet, query results, omissions and available planner/model usage metadata. Exploration alone is inspectable but is not saved as a completed research run; export the prepared packet/prompt if needed. Rebuild the packet to ask a new question or repeat planning.

The implementation uses structured model output followed by deterministic validation, not arbitrary executable model code. Schema validation does not establish semantic relevance, source support or research usefulness. Live account/model acceptance, real-browser checks and founder evaluation remain pending.

## Contextual workspace checkpoint

The current UI provides contextual research entry from each journey tab and direct Research navigation. Packets may include a founder-provided source_context snapshot; saved runs retain their origin even when historical mode excludes that context from transmission. A separate human review can explicitly accept an investigation into an existing user-owned task, retaining prior plan/learning and provenance. Context/lens/fit/task/plan/pack changes require renewed research. These controls do not establish model usefulness; see [CONTEXTUAL_RESEARCH.md](CONTEXTUAL_RESEARCH.md) for the remaining usability and live-model gates.
