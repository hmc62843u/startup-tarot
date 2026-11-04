# OpenFor pilot video: script and storyboard

A short walkthrough of the operator workflow for OpenFor and other organizations considering a pilot. Not for the public funnel page: the pilot is prepared, not started (see [OPERATOR.md](OPERATOR.md#next-milestone-codex-guided-openfor-pilot)).

- **Audience:** OpenFor organizers and a prospective pilot operator.
- **Length:** about 90 seconds; 16:9 for sharing in a call or message.
- **Footage:** real screen recordings of Codex, the operator command and the founder preview. No stickman or generated art.
- **Data:** the synthetic OpenFor demonstration input only (enterprise/fixtures/openfor-demo-raw.json), labelled "synthetic data, not verified OpenFor records". Never real or private rows.
- **Where it goes:** linked from [OPENFOR_DEMO.md](../OPENFOR_DEMO.md) or shared directly with OpenFor. Add it to the funnel only after the pilot is accepted.

## Recording setup

1. Use a machine that passes the setup panel: Node 24, local configuration and authenticated Neo4j ready (`node enterprise/operator.mjs setup`).
2. Run the repeatable demonstration once before recording, then again while recording:
   `node tools/rehearse-openfor.mjs --database-config .local/enterprise/neo4j-test.json --organization openfor_demo_private`
   Use the operator's own ignored database configuration; the path is an example.
3. Open the generated presentation.md first. It holds the run-specific artifact links and expected results, so the video never shows stale paths.
4. Before recording, hide credentials, connection files, tokens and any session-specific setup-panel URL. Record at 1920×1080 with a readable editor font.
5. No live backend available? Record the no-backend path instead: `check` and `prepare` with enterprise/fixtures/alpha.json. Then drop scene 3 and say so in the status card.

## Storyboard

| # | Time | On screen (capture) | Narration | On-screen label |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:08 | Title card over a blurred founder preview | "Keeping investor and startup research current for a whole cohort is slow, manual work. Here's how an operator does it with Codex." | OpenFor pilot walkthrough · synthetic data |
| 2 | 0:08–0:20 | Codex chat: `$research-operator` request; setup panel showing Node, configuration, Neo4j and Workspace ready | "The operator asks Codex to check the setup. One panel shows whether the local services are ready." | Codex · local services |
| 3 | 0:20–0:38 | Raw demo rows → mapping.json decisions → results.md showing a new revision and a rejected stale write | "Codex maps raw records to profiles and snapshots, keeps unknowns unknown, and imports only authorized changes. Every change is a new revision, and stale writes are refused." | Revisioned maintenance |
| 4 | 0:38–0:52 | `prepare` output: summary.md, preview.html, review.json with declarations false | "To share research with founders, Codex prepares a proposal: a summary, a preview and a review file. Nothing is approved yet." | Prepare · unapproved by default |
| 5 | 0:52–1:08 | preview.html: Next move, Investor, Startup tabs, Edit situation and the header Research workspace; then review.json declarations set to true | "The operator checks the founder preview and records the approvals. The human decides; Codex doesn't approve on anyone's behalf." | Operator review |
| 6 | 1:08–1:20 | `package` output: ZIP, release-manifest.json, hashes and published:false; then extracted browser-package/index.html opening | "Packaging produces a ZIP and a manifest with hashes. It never uploads or sends anything. A founder unzips it and opens the app, with no backend." | Package · founder copy |
| 7 | 1:20–1:30 | Status card | "This is a prepared pilot. We're looking for one OpenFor operator and a small authorized dataset to try it." | See the status lines below |

### Status card text

- Demonstrated with synthetic data on a local setup.
- Pending: the live OpenFor pilot, human browser acceptance, Docker startup and real-account LLM checks.
- Contact: [how OpenFor should reach Andrew; fill in before sharing].

## Claims to keep accurate

- Say "Codex". Other coding agents are untested with the research-operator skill.
- Packaging is local: say "never uploads or sends", matching published:false.
- Published copies do not synchronize or revoke automatically; mention it if asked, and don't imply updates reach founders.
- Don't show the retired browser administration screens (the "Historical Workspace capture" in OPERATOR.md).
- Synthetic numbers and dates are illustrative. Keep the synthetic-data label visible in every scene that shows records.
- Don't describe a model as verifying evidence. Model text stays unverified until the operator confirms it.

## Production notes

- Narration: record your own voice, or use captions only. Keep both under the 90-second target.
- Captions: burn in short phrases and also export a .vtt file, as the other Startup Tarot videos do.
- Editing: trim waits, but don't splice in results from another run. Every result shown must come from the same recorded rehearsal.
- After publishing: link the file from OPENFOR_DEMO.md with its recording date and the run's report path.
