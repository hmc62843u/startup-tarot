# OpenFor data and illustrative scenarios

This is the data reference for the private OpenFor demonstration. Start with [the operator workflow](../enterprise/OPERATOR.md) for Codex-assisted operation. [Browser Publisher](../publisher/README.md) is the optional visual interface. Neither name nor inclusion claims OpenFor endorsement.

## Sourced sample

enterprise/fixtures/openfor-research.json v0.2.0 contains two investor profiles, three current startup observations, two historical teaching snapshots and six graph edges. It is separate from the public app's default Guide Pack.

| Record | Demonstration role | Source and limits |
| --- | --- | --- |
| Geek Ventures | Investor criteria | [Official website](https://geek.vc/): US/stage context; sector and typed check evidence remain unknown. |
| Monozukuri Ventures | Investor criteria | [Investment services](https://monozukuri.vc/services/): early hardtech context, US/Canada/Japan geography and typical initial USD 100,000–300,000; follow-on capacity is separate. |
| ad-dice | Current startup observation | [Official website](https://ad-dice.com/): air-conditioning AI product context. |
| Citadel AI | Current startup observation | [Official website](https://citadel-ai.com/): AI evaluation, governance and monitoring product context. |
| Asenion | Current startup observation | [Official About page](https://asenion.ai/about-us): AI controls and verification context. |
| Airbnb and DoorDash | Historical teaching cases | Existing attributed snapshots and source metadata; not labelled OpenFor companies. |

Sources were checked on 2026-10-31. The [OpenFor directory](https://www.openfor.co/companies) mixes partners and companies associated with mentors/speakers. Directory presence is recorded as source metadata, not a claim of partner status, incubator participation, portfolio membership or introduction availability.

Current startup records use 2026-10-31 as observation date, not founding/launch date. Source publication dates are null; historical-cutoff research excludes undated evidence. Funding, customer counts, team size, stage, revenue and fundraising needs remain unknown. The graph has three historical Airbnb edges and three snapshot/company identity mappings. No mentor/person, investor/startup investment or introduction links are invented. Missing edges do not prove absent relationships.

## Illustrative companion

enterprise/fixtures/openfor-illustrative.json v0.1.0 contains three fictional founder journeys:

| Fictional startup | Real product context only | Scenario ID |
| --- | --- | --- |
| Harbor Building AI | ad-dice | building_ai |
| Maple AI Controls | Asenion | ai_governance |
| Sakura Model Testing | Citadel AI | ai_evaluation |

The fictional startups are not the real companies, subsidiaries or portfolio companies. Each invented stage, location, fundraising target, monthly revenue, customer count and planning date carries value, unit, status illustrative_unverified and confirm/replace/remove guidance. Zero is an invented value where explicitly labelled; canonical unknowns remain null. Investor selection is a comparison to inspect, not confirmed fit or a funding offer.

Operator prepare --scenario selects a compatible journey for preview. The companion can also be inspected/downloaded in the optional browser Publisher or loaded into the advanced Workspace research form. Assumptions remain untrusted founder inputs; they do not become canonical company facts. Scenario inputs and preview edits are excluded from both operator and browser Publisher release ZIPs. Carry the labelled companion separately when a presentation needs it.

For synthetic investment networks or introduction topology, use the separate fictional alpha/beta template. Do not invent those links between real people or companies.

## OpenFor demonstration walkthrough

Use the OpenFor research sample for the operator-to-founder demonstration, not alpha.json alone. The fictional alpha fixture deliberately excludes its investor profiles from fundraising comparisons; it is a separate topology demonstration.

1. Ask the research-operator skill to check enterprise/fixtures/openfor-research.json and prepare it with --scenario building_ai. Review the generated summary and isolated founder preview. All invented scenario values remain labelled, and no release is approved automatically.
2. The preview starts on Situation; Japan and the check amount are not fields on that screen. Scroll inside the app to the bottom navigation, choose Investor, then Explore investor fit. In Company location / region select Japan; in Desired check from one investor enter 150000 and select USD in Currency. For the complete comparison, enter the fictional test inputs: sector hardware, stage pre-seed, geography Japan, desired check USD 150,000. Submit Compare investor criteria. This is an invented investor-check request, not a fact about ad-dice or its fundraising target. Inspect both profiles, their evidence dates, missing information and conditions. No comparison establishes eligibility, availability or a personal connection.
3. Open Profile & sources and inspect source references. Current company observations and historical teaching cases have different roles; unknown company metrics stay unknown.
4. Test a documented historical path:
   - Close any profile dialog. On Investor, click Relationships & introduction paths.
   - Set Evidence collection to Public documented examples.
   - Keep Assessment date at today and leave Historical source-availability cutoff blank.
   - Set Start entity to Y Combinator (2017 government reference).
   - Set Target entity to Airbnb user visits (documented historical activity).
   - Set Maximum links to follow to 4. Leave Follow recorded edge direction only and Include explicitly labelled editorial links unchecked.
   - Click Find evidence paths, then scroll down below the form to inspect the result and supporting evidence. Record the displayed path or explained empty state; opening the form alone is not a pass.
   - This is a historical teaching example, not an OpenFor introduction. An OpenFor investor-to-startup query may correctly have no documented path: this sample does not establish those relationships. Richer invented network topology is a separate alpha.json demonstration, clearly labelled fictional.
5. Review the exact proposal and proposed private OpenFor presentation terms before requesting a local ZIP. Previous fictional-rehearsal approval does not authorize this research release. After approval, extract the new ZIP and repeat the recipient tests in publisher/README.md, including persistence and offline queries.

The scenario initializes preview only. Recipient ZIPs exclude scenario inputs, so enter the labelled fictional test inputs manually when presenting the extracted app. Operator data maintenance needs Workspace; local-file preparation and recipient matching do not. LLM reasoning is optional and tested separately.

## What OpenFor can supply or correct

Collect authorized investor criteria with source/review dates, dated startup observations and metrics, documented relationships, intended audiences and update instructions. Ask the operator/founder to confirm, replace or remove every illustrative value. Record source, observation date and permission scope before separately importing a confirmed fact. Editing a scenario alone does not verify it or update research records.

Private presentation intent is not access control or blanket distribution permission. Selected fixtures are included in reference packages; raw bulk datasets and private runtime material are not. Review actual privacy, attribution and rights before distributing. Downloaded copies cannot be remotely revoked or automatically synchronized.

Human browser/operator usefulness review, genuine source/rights approval and real-account LLM acceptance remain pending. The canonical human browser checklist is in publisher/README.md; implementation evidence is in enterprise/ACCEPTANCE.md.
