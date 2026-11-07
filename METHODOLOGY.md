# Matching and research methodology

The current app applies deterministic rules to dated claims in the configured Guide Pack. An initial research flow now assembles packets, checks structured outputs and saves feedback/revisions. Its OAuth/model adapter is implemented, while real-account inference and reasoning quality remain unvalidated. [RESEARCH_PLAN.md](RESEARCH_PLAN.md) defines contracts and evaluation gates.

Current results explain documented alignment and missing information. They are research leads, not funding probabilities or verified eligibility.

## Two kinds of relevance

| Workflow | Question answered | Evidence required |
| --- | --- | --- |
| Next move | Which small experiment could help in this situation? | Authored startup lessons, context rules and any explicitly connected investor topic |
| Explore investor fit | Which investors have documented criteria aligned with this startup? | Current, sourced mandate claims about sector, stage, geography and individual check size |

Choosing an investor perspective does not save a fundraising prospect. Saving a fundraising prospect does not establish a connection to a historical startup. Neither workflow supplies a warm introduction or proves an investment relationship.

## What enters the comparison

The founder supplies one sector, funding stage, location/region and desired check from one investor, including currency. The total round size is a different amount. Missing inputs stay unknown.

Each investor claim records a field, values or amount range, source link, factual paraphrase, checked date, basis and whether it establishes a strict requirement. The source link lets the founder inspect the claim; it is not an independent certification of its accuracy.

Only declared claims checked within the preceding 180 days contribute to a comparison. Future dates, older claims and observed or inferred patterns cannot establish current alignment. The 180-day window is a product review policy, not an investor's expiry date. Evidence remains inspectable after it needs review.

Historical/reference-only profiles, fictional records and non-equity programs are excluded from the equity shortlist. The included pack has fourteen records: six equity comparisons, seven historical references and one grant program. This is a small curated sample, not market-wide coverage.

## Alignment groups

| Result | Rule | Next action |
| --- | --- | --- |
| Strong documented alignment | All four fields match, with no explicit mismatch | Check remaining eligibility and current availability |
| Worth investigating | Stage and sector match; geography or check size remains unresolved | Verify the unresolved fields |
| Insufficient evidence | Stage and sector alignment is not established | Supply missing information or research the mandate |
| Documented mismatch | At least one explicit requirement conflicts with the startup profile | Inspect that requirement before outreach |

A stated focus or typical range does not automatically exclude startups outside it. An unmatched preference stays unknown. A strict requirement can establish a mismatch. If one usable claim matches and another strict claim conflicts for the same field, that field stays unresolved pending review.

Results sort by alignment group in the order above, then by number of matched fields, then by investor ID for a stable tie break. No learned success score, editorial compatibility weight or graph-path count contributes to this ranking. Repeating a claim does not add another matched field.

## Evidence coverage

| Coverage | Meaning |
| --- | --- |
| Complete | All four fields could be evaluated without an unknown |
| Partial | At least one field has a documented match or mismatch; others are unresolved |
| None | No field has a documented match or mismatch |

Complete coverage can include a mismatch. It does not mean full eligibility, high confidence in every source, or likely funding. Full-time commitment, technology defensibility, impact, sector exclusions, competitive conflicts and other conditions still require separate review. Known additional conditions appear with the result.

## Sector vocabulary

The app uses a small editorial vocabulary in [js/sectors.js](js/sectors.js). Spelling variants normalize to a common label. A narrower sector can match an explicitly broader mandate; the reverse is not assumed.

| Founder wording | Supported interpretation | Boundary |
| --- | --- | --- |
| Software-as-a-service | SaaS; can fit software or technology | Software alone does not establish a SaaS-only fit |
| Cyber security | Cybersecurity; can fit software or technology | Does not imply every AI or hardware mandate |
| Climate tech | Climate technology; can fit climate or technology | Climate alone does not imply a technology company |
| AI infra | AI infrastructure; can fit technology | Broad AI does not establish AI infrastructure fit |

Unknown wording is not assigned a sector by an LLM. Sector suggestions show labels from the data. Aliases are matching policy, not new investor research. A shared sector label alone cannot satisfy a compound thesis such as AI, hardware and automation; additional conditions must be checked.

No currency conversion is performed. Regions match explicit labels and authored mappings, not an automatic geographic hierarchy. The current Ada record only establishes an automatic UK match; its other locations require a UK-link check.

## Timing hint (for now or for later)

A profile may carry `timing_claims`: dated reports of when the investor's current fund was announced (pack 0.9.0 has them for five of the six equity profiles). The app shows a timing hint under each fit result. **It never changes the alignment label, evidence coverage or ranking,** and saved assessments are not flagged for review when only timing changes.

| Latest fund announcement | Hint |
| --- | --- |
| Under 3 years before the assessment date | Likely still making new investments; confirm |
| Over 5 years before | May now focus on follow-on investments; confirm whether it makes new ones |
| 3 to 5 years, or no dated announcement | Timing unclear or unknown; check recent investments |

Only `declared` and `observed` claims are used, and only those checked and announced on or before the assessment date. A partial date (year, or year and month) counts from its earliest day. Claims checked more than 180 days earlier are shown with a review note. The 3- and 5-year thresholds are an editorial rule of thumb, not a fact about any fund. A first close is reported as a first close in the claim's statement. Investment pace (deals per year) is not used: funds rarely declare it, and third-party counts disagree.

## Amounts and source boundaries

The matcher uses typed amounts with explicit currencies. It does not parse the legacy display field named `check_size_range_usd`, which may contain a non-USD description.

Connect's published range describes rounds, so its individual check remains unknown. Concept publishes a maximum without a verified lower bound, so it has no automatic check-range comparison. Amounts, founder preferences and initial investment stages are not inferred from portfolio rounds or follow-on investments.

## Saved evidence and outreach

Saving an investor retains the startup input, assessment, source claims, pack version and save date. Reassessment compares that snapshot with the current input and available research. Changed results or sources request review; notes and older drafts remain available. A disappeared or excluded record cannot support a new draft.

Outreach preparation requires an unchanged assessment with stage and sector alignment. Templates use the founder's own description and progress plus a current matching, attributed sector statement. They leave missing facts as placeholders. Founder edits and verification remain necessary; there are no model calls or message-sending actions.

Changed founder details or supporting assessments flag an older draft for review. Updating an assessment preserves the draft. The founder can check and edit it, then mark it reviewed, or replace it with a new template. Exports retain saved evidence and review warnings.

## What has been evaluated

[data/fit-benchmark.json](data/fit-benchmark.json) contains nine authored scenarios with expected outcomes and rationales, including missing data, currency differences, broad/narrow sector boundaries and stale claims. Automated agreement checks implementation regressions; it does not measure independent accuracy or founder usefulness.

[LOCAL_RELEASE.md](LOCAL_RELEASE.md) records the pending real-browser acceptance and founder pilot. Source truth, matching quality and outreach usefulness require separate assessment. Feedback should identify misleading leads, missed relevant investors, unclear unknowns and unsupported draft statements.

For research authoring and field contracts, use Guide Pack Kit's INVESTOR_FIT.md. For implementation and updates, see the [developer guide](DEVELOPMENT.md). For the actual workflow, see the [user guide](GUIDE.md).

For components, data flow and storage boundaries, see [ARCHITECTURE.md](ARCHITECTURE.md).

## LLM research method — structure implemented, quality evaluation pending

The model's task is to use evidence to develop a research agenda for a founder, not merely to rank investors or write outreach. Existing comparisons and snapshots become inputs to that task. The structured output contract separates the following kinds of statements.

| Kind | Required treatment |
| --- | --- |
| Sourced fact | Reference an existing evidence item and accurately state its scope and dates |
| Founder assertion | Label as supplied by the founder; do not present it as independent verification |
| Interpretation | Explain the implication briefly, with references and assumptions |
| Hypothesis | Identify what is unproven, alternatives and evidence that would weaken it |
| Proposed investigation | State a specific question/action, why it matters, expected evidence and a review/stop condition |
| Unknown or contradiction | Retain the gap or disagreement instead of forcing a conclusion |

A useful research output can abstain from recommending an investor or experiment. Unsupported generic advice must not be decorated with an unrelated citation. Concise explanations and source support are reviewable outputs; private model reasoning is not a required artifact.

### Use of historical snapshots

A snapshot can suggest an analogy or investigation. The model must identify relevant similarities and material differences in market, stage, geography, timing and constraints. A later successful outcome does not prove that an earlier action caused it or that the founder should repeat it.

Retain event/snapshot dates, source publication dates and retrieval dates separately. A later retrospective account may support a statement about an earlier event, but it was not necessarily available at that earlier decision point. Historical decision simulations must exclude facts only available after their cutoff. Unknown source availability stays unknown.

### Validation and learning loop

The implemented validator checks schema and evidence-reference integrity. Human review must still judge whether each source actually supports the statement, whether uncertainty is honest and whether the investigation is useful. Keep observed findings, model hypotheses and founder decisions distinct.

When new evidence arrives, create a new packet and run linked to the previous revision. Preserve feedback and show which conclusions changed. Working findings enter the canonical research pack only after separate source/reuse review. Retrieved source text is untrusted data and cannot grant permission to browse, send messages or execute actions.

The planned evaluation includes supported, missing, conflicting and retrospective evidence, citation support, unsupported claims, historical leakage, actionable investigations, revision behavior, cost and latency. Define thresholds before live evaluation. The existing nine-case matcher benchmark and synthetic research/OAuth tests do not validate actual model reasoning quality or account availability. See [RESEARCH_SETUP.md](RESEARCH_SETUP.md) for the implemented flow.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Model-directed graph interpretation

The LLM proposes a bounded public graph plan; JavaScript validates existing IDs, supported query types and limits before execution. Model reasons are proposals, sourced edges are evidence, and paths/network metrics are computed context. These categories remain distinct in the expanded packet and saved query audit. Same-company overlap cannot establish participation in the same round. Path connectivity does not establish causal influence, personal acquaintance, current eligibility or an available introduction. Unknown publication dates cannot pass a historical availability cutoff. Missing paths and low network metrics describe incomplete data, not proof of real-world absence.

Independent review should assess whether queries address the founder question, citations support the final statements, omissions change interpretation, and graph-assisted reasoning improves investigations over the same packet without graph exploration. Record planner and final-answer usage/latency separately where available. Local schema and algorithm checks establish neither semantic accuracy nor founder usefulness.
