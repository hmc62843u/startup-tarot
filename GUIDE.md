# User guide

Founder navigation: Situation, Next move, Investor and Startup are the four footer tabs. Research opens from the header or a contextual investigation action on any journey tab. The same Research workspace retains saved research history and optional helper connections; moving its entry point does not delete existing work.

Startup Tarot helps you choose a small experiment and research investors using visible evidence. Planning, investor comparison and shared research retain their own saved work and explicit links.

The initial research screen now assembles evidence, validates structured outputs and saves feedback/revisions. An optional local helper implements ChatGPT OAuth and model requests; real-account sign-in and live reasoning acceptance remain pending. [Research setup](RESEARCH_SETUP.md) gives the exact steps and limitations.

![Your situation leads to a next move, then an experiment and learning.](assets/how-it-works.svg)

## Start here

Open index.html after unzipping the app for local planning, matching, packet export and manual response review. Live research additionally requires the Node 24 local helper and ChatGPT OAuth, with no API key. Keep the same browser profile and app location for saved work.

| Your goal | Start with | Continue to |
| --- | --- | --- |
| Learn what to try next | Situation | Next move, plan and learning |
| Find investors to research | Investor > Explore investor fit | Compare criteria, then Saved shortlist |
| Investigate a founder question | Research, or a contextual research action | Build/inspect a packet, connect ChatGPT or validate a manual response, save feedback and revise |
| Prepare a draft | Saved shortlist | Verify questions, edit a draft and export |

The help pages work locally. The included library has six equity investors available for comparison, seven historical references, one grant program and three startup snapshots. It is a small research sample rather than a comprehensive directory.

## Compare investor criteria

1. Open **Investor**, then **Explore investor fit**.
2. Enter your sector, funding stage, company region and desired check from one investor, with its currency. Leave unknown amounts blank. Sector suggestions show labels in the research.
3. Select **Compare investor criteria**. Review matches, mismatches, unknowns and additional conditions. Open **Evidence & dates** for source links and checked dates.
4. Use **Save startup profile** to retain these inputs in this browser. Comparing alone does not save the profile.

| Result | What to do |
| --- | --- |
| Strong documented alignment | All four fields align; verify full eligibility and current availability |
| Worth investigating | Stage and sector align; check unresolved geography or check size |
| Insufficient evidence | Supply missing information or research stage/sector fit |
| Documented mismatch | Inspect the conflicting explicit requirement before outreach |

Evidence coverage describes how many of the four comparisons are supported. Complete coverage is not a funding prediction and can include a mismatch. The app does not convert currencies. Additional conditions, such as full-time commitment or sector exclusions, are not automatically resolved.

## Try a comparison

Enter **SaaS**, **pre-seed**, **US**, **150000**, **USD**. With the included pack and evidence still within its review window, Hustle Fund has strong documented alignment. Firstminute is worth investigating because its broader technology mandate includes software while geography and check size need confirmation. Older checked dates eventually require fresh research.

Change stage to **seed** and compare again: Hustle Fund has a documented initial-stage mismatch. Change currency to **EUR**: the check-size comparison remains unknown. This example checks behavior rather than proving investor interest.

## Save a shortlist and prepare outreach

1. Choose **Save to shortlist** on an investor, then open **Saved shortlist**. You may save an uncertain prospect for research; saving does not improve its alignment label.
2. Add your name, company, description and a specific progress point you can substantiate. Select **Save founder details**.
3. Answer verification questions in the investor notes. **Save shortlist edits** saves all visible founder, note and draft edits. Refresh to confirm they remain.
4. If your startup input or source evidence changes, select **Review & update assessment** after checking the change. This uses the current startup profile and retains notes and any older draft.
5. With a current stage-and-sector alignment, select **Prepare outreach draft**. Replace placeholders, check each founder fact and inspect the investor source. Edit the text and save it. It is a local template; the app does not send messages.
6. If founder details or supporting evidence changed, review the older draft and select **Mark draft reviewed**, or replace it with a new template.
7. Select **Export shortlist (.md)** to save edits and download the profile, questions, notes, saved evidence and drafts. Review the file before sharing.

**Archive investor** moves an entry out of the active list while retaining notes and drafts. **Show archived investors** lets you restore it. Exports identify archived entries.

## Research a question

Open **Research**, or choose a contextual action in Situation, Next move, Startup or Investor. Enter a question, select up to five investor/snapshot records and choose an assessment date. An optional historical cutoff excludes unavailable or later source evidence. Add a sourced new finding if needed, then **Build evidence packet** and inspect it.

For live reasoning, use **start-research.cmd** or the Node helper and open its loopback URL. **Connect ChatGPT**, follow **Continue with ChatGPT**, return and **Refresh connection**. Choose an account-available model, inspect the packet, confirm transmission and select **Run research**. This uses your ChatGPT plan if eligible. API keys and Codex/browser token extraction are not used.

From direct-file mode you can instead export the prompt and paste a structured response under **Use another model manually**. Reference validation rejects unknown citations; it does not establish that a source supports the statement. Review findings, hypotheses, differences between historical cases and proposed investigations.

Saved runs retain their packet and output. Inspect a run, append feedback, select **Use as previous revision**, add new evidence and build a fresh packet. Earlier results remain in history. **Export research history** provides a private backup. See [RESEARCH_SETUP.md](RESEARCH_SETUP.md) for setup, privacy, cancellation, storage and acceptance checks.

## Choose a small experiment

1. **Situation:** choose a business model, stage and question. Select **Show my next move**.
2. **Next move:** read the action and support label. Select **Make a plan**, write what you will try and look for, then **Save plan & continue**.
3. **Record learning:** choose progress, record a note and select **Save progress**. Use **Edit plan** to return.

| Main tab | Purpose |
| --- | --- |
| Situation | Update the three experiment choices |
| Next move | Adapt an example or continue your saved plan |
| Investor | Browse profiles, choose an experiment perspective or open investor fit |
| Startup | Browse dated snapshots; related examples appear first |

Use the bottom tabs. The investor-fit and shortlist screens, source dialogs and long notes can scroll. Close a source dialog or press Escape to return. Reference-only investor profiles cannot be selected as experiment perspectives.

## Try a researched experiment

1. Set **A marketplace**, **Exploring an idea**, **Test demand**, then show your next move.
2. Expect **Try a bounded local service**, labelled **Startup example only**. No investor-topic connection is encoded in the included research pack.
3. Open **Startup**. DoorDash's launch-service snapshot dated **2013-01-12** appears first. Its account was published later than that historical snapshot date. Browse Airbnb and GitLab with the arrows; they are browsing-only for this move.
4. Selecting firstminute as an investor perspective does not create a documented connection to DoorDash or establish fundraising fit.
5. Save a plan with a recognizable action and note. Refresh and confirm both remain. A changed investor choice can change the evidence status without deleting the plan.

**Learning recorded** requires a note and a continue/change/stop decision. This records your judgment rather than an independent assessment of the experiment.

## Methodology

Experiment support distinguishes a connected investor topic and startup lesson, startup-only evidence, investor-only interest, or a general exercise with neither. With no selected investor, a complete connection is a preview until explicitly chosen. Sources support limited facts; suggested experiments remain authored interpretations.

Fundraising comparison uses different rules. Read [Matching methodology](METHODOLOGY.md) for claim freshness, sector aliases, alignment groups and known limits. Research authoring and quality review are described in [Guide Pack Kit](https://github.com/hmc62843u/guide-pack-kit/blob/main/CONTRIBUTING.md).

## Saving, recovery and privacy

Typing does not save automatically. Save controls show failures if storage is unavailable. Experiment plans use versioned workspaces. Shortlists use provider/pack identity across research versions; replacing a pack does not merge another provider's shortlist. Browser profiles and file locations may have separate storage.

Export regularly. Clearing browser storage can erase saved work. If shortlist data cannot be read, the app preserves it and offers **Download saved data for recovery (.json)**. That file is for recovery; there is no import interface. If another tab changed the shortlist, reload before saving from an older tab.

Saved plans, profiles, notes, drafts and research history stay in your browser. A live research request sends the inspected packet, including any selected founder context, to OpenAI using your explicit consent. Source links open external pages only when followed. Exports contain the personal and company details you entered; review them before sharing. No outreach is sent by the app.

## The local pack

The app reads packs/active-pack.js beside its other files. It is a browser script, so use only a trusted reviewed pack. There is no pack settings/import screen.

1. Obtain a trusted complete browser pack and its notices from the author.
2. Copy the browser pack into packs/ as **active-pack.js**, retain its source/licence notices and refresh.
3. To restore the included research, copy packs/active-pack.js from your prepared release or checkout. A repository download contains the published revision, which may differ from local work.

A JSON file alone does not load on direct-file URLs. Contributors can prepare a wrapper using the [developer guide](DEVELOPMENT.md) and Guide Pack Kit. A development build overwrites the wrapper from packs/guide-pack.json.

## Terms and next steps

Research retains its [licence](packs/LICENSE.md), [source bases](packs/SOURCES.md), [third-party notices](packs/THIRD_PARTY_NOTICES.md) and [data notice](packs/DATA_NOTICE.md). [Data scope](DATA_LICENSE.md) distinguishes original code, fictional examples and research.

The [release and pilot checklist](LOCAL_RELEASE.md) identifies completed development and pending acceptance. Founder feedback should focus on useful leads, misleading matches, unclear questions and whether saved work survives the workflow.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Model-directed public graph research

The research screen now connects LLM planning to the browser graph. Build a packet and open LLM graph exploration. Inspect both the packet and displayed public node catalog, connect ChatGPT, choose a model and confirm transmission. Choose Plan and explore public graph. The model proposes queries; JavaScript validates and executes them in the browser. Inspect the query audit and expanded evidence packet, then confirm again and choose Run research for the final answer.

One successful planning pass per prepared packet allows at most three queries, four hops and five returned paths per query, within the existing twenty-edge and 60 KB packet bounds. Supported queries are paths between existing public entities and same-round/shared-company network projections. Zero queries and no-path results are valid abstentions, not proof that real-world relationships are absent. There is no recursive autonomous browsing or canonical data mutation. Private contacts and fictional graphs are unavailable to the planner and executor. Historical availability filters constrain the catalog and results.

The planner receives the prepared packet plus the displayed public node catalog; the final request receives the expanded packet. Each call uses the selected ChatGPT model and may consume plan usage. Consent resets after exploration, including failure/cancellation. Invalid proposals fail without altering the original packet. The final saved run preserves its exact expanded packet, query results, omissions and available planner/model usage metadata. Exploration alone is inspectable but is not saved as a completed research run; export the prepared packet/prompt if needed. Rebuild the packet to ask a new question or repeat planning.

The implementation uses structured model output followed by deterministic validation, not arbitrary executable model code. Schema validation does not establish semantic relevance, source support or research usefulness. Live account/model acceptance, real-browser checks and founder evaluation remain pending.

## Carry research back into a plan

See [Research across tabs](CONTEXTUAL_RESEARCH.md) for the complete journey. Saved contextual investigations offer Review as experiment. Inspect the cited sources or general-method label, edit the action and expected evidence, then explicitly accept or keep the existing plan. Previous actions and learning remain in acceptance history. Source context and plan applicability are checked again at acceptance; no canonical investor/startup data is edited.

Action hierarchy: Situation leads to Show my next move; Next move leads to the current plan step; Investor leads to Explore investor fit; Startup leads to Compare this example with my situation. Supporting evidence/source and contextual research actions remain visible in labelled groups. Investor perspective selection is separate from fundraising fit. Each fit result places its shortlist action before the supporting evidence link.
