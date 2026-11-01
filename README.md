# Startup Tarot

OpenFor demo branch: start with [guided setup and demonstration](OPENFOR_DEMO.md). This is a local demo, not a production deployment; assisted fresh-checkout setup passed on a second lab machine; unattended installation remains unverified.

**Build evidence-backed research for founders using investor criteria and dated startup examples.**

The intended product is an LLM research assistant that identifies gaps, develops hypotheses and proposes investigations using investor profiles, criteria, startup snapshots and founder context.

The app implements experiment planning, investor comparisons, shortlists, template drafts and an initial research workflow: inspect evidence packets, optionally let an LLM plan public graph queries, validate structured responses, save feedback and revise research. An optional local helper implements OpenAI OAuth and model requests using ChatGPT plan access. Real account sign-in, completed live inference and reasoning usefulness still need acceptance testing.

[Research setup](RESEARCH_SETUP.md) explains the connection; [research contracts and evaluation gates](RESEARCH_PLAN.md) distinguish implemented structure from pending validation.

## Open the app

Open **index.html** in your browser. A prepared download needs no installation, Node, Python or API key. If you use the repository ZIP, unzip it first. Keep the app at the same location and use the same browser profile to retain access to saved work.

[Download the repository ZIP](https://github.com/hmc62843u/startup-tarot/archive/refs/heads/main.zip). Local development changes are available in your checkout before they are published to that download.

## Run research with ChatGPT

Run **start-research.cmd** on Windows, or `node tools/research-server.mjs` with Node 24. Open the displayed loopback URL, select **Research** or a contextual action in Situation, Next move, Startup or Investor, and connect your ChatGPT account. No API key is used. Tokens remain in helper memory; the prepared packet and public node catalog are sent when you request graph planning; the expanded packet is sent when you separately request final research. Direct-file mode supports packet export and manual response review without a live connection. See [RESEARCH_SETUP.md](RESEARCH_SETUP.md).

## Incubator graph reference

An optional [incubator reference implementation](ENTERPRISE_REFERENCE.md) adds Neo4j, an authenticated organization-scoped backend, validated investor/startup imports and fictional demonstration workspaces. It is separate from the browser-only release and stays in this repository. Native graph queries have been tested against the browser algorithms; production identity/security, real customer imports and live per-user model acceptance remain adoption work.

## Distribute an incubator edition

The [operator distribution workflow](DISTRIBUTION_GUIDE.md) exports an approved organization revision into one modular data bundle and a configured browser package. A manifest binds pack/relationship identities, versions, hashes, operator review and update instructions. Recipients can use the graph without Neo4j or a backend. Downloaded copies are not automatically synchronized or revoked.

## Research across the founder journey

Situation, Next move, Startup and Investor now open [one contextual research workspace](CONTEXTUAL_RESEARCH.md). Captured context and evidence remain inspectable. Saved runs link back to their source; a separate review dialog lets the founder edit and explicitly accept an investigation into a plan while retaining the previous plan and learning. No model request or plan update occurs merely by navigating tabs.

## Choose a workflow

| Goal | Where to go | What you get |
| --- | --- | --- |
| Learn what to try next | Situation > Next move | A small experiment, supporting sources and saved learning |
| Research investors | Investor > Explore investor fit | Matches, mismatches, unknowns and dated evidence |
| Develop a research agenda | Research, or contextual actions in all four journey tabs | Inspect packets, optionally explore the public graph with LLM-planned queries, review responses and create revisions |
| Explore relationships | Investor > Relationships and introduction paths | Sourced paths, network analysis and private founder-reported introduction paths |
| Prepare outreach | Explore investor fit > Saved shortlist | Verification notes, editable drafts and a Markdown export |

The research pack contains fourteen investor/program records and three startup snapshots. Six equity profiles support fundraising comparisons; seven historical references and one grant are excluded. The included experiment examples are startup-only: no investor-topic connections are encoded. Relevance does not establish funding, endorsement or an introduction.

## Documentation

| Start here | Purpose |
| --- | --- |
| [Research setup](RESEARCH_SETUP.md) | Local OAuth helper, packet inspection, response review and research history |
| [Relationships and introduction paths](RELATIONSHIPS.md) | Browser graph, LLM planning, private contacts and capability limits |
| [Research plan](RESEARCH_PLAN.md) | Implemented version-1 contracts and pending model-quality evaluation gates |
| [User guide](GUIDE.md) | Compare, save, verify, draft, export and recover saved work |
| [Matching and research methodology](METHODOLOGY.md) | Implemented matching rules and proposed evidence/reasoning safeguards |
| [Incubator reference](ENTERPRISE_REFERENCE.md) | Optional Neo4j backend, own-data imports, isolation and deployment boundaries |
| [Architecture](ARCHITECTURE.md) | Components, data flow, repository boundaries and storage |
| [Developer guide](DEVELOPMENT.md) | Architecture, storage, data updates, tests and builds |
| [Release and pilot checklist](LOCAL_RELEASE.md) | Completed capabilities, known limits and pending acceptance |

The app's help link opens the same guides as styled local pages. [Replace the local pack](GUIDE.md#the-local-pack) or author research using [Guide Pack Kit](https://github.com/hmc62843u/guide-pack-kit).

[Watch the 29-second experiment introduction](assets/startup-tarot-intro.mp4) - silent, with captions. [Caption file](assets/startup-tarot-intro.vtt). The video covers the experiment workflow rather than the newer shortlist screens.

## Status and terms

This is a local development release with an initial research integration, not an independently validated research assistant. Implemented means present in code; proposed means a design target; validated requires recorded assessment of the stated capability. Automated checks cover the matcher and saved workflow; a founder pilot, real-account OAuth/inference acceptance and the latest UI acceptance remain pending. Outreach drafts remain local templates; the app sends no messages. Graph planning and final research explicitly transmit the inspected inputs to OpenAI in separate requests. Source refresh is manual. Browser storage is not a backup: export regularly and review files before sharing.

Code and original fictional examples: [MIT](LICENSE). Included research retains its [separate licence and source notices](packs/README.md). [Data scope](DATA_LICENSE.md).

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.


## Operator workflow

For the OpenFor pilot, invoke the repository-scoped `$research-operator` skill in Codex. It uses the existing guide and one command family: node enterprise/operator.mjs. Start with [the operator guide](enterprise/OPERATOR.md): maintain selected research → prepare a concrete preview/review proposal → obtain operator approval → package locally. Sending or publishing requires a separate explicit instruction naming the artifact and destination.

| Component | Responsibility |
| --- | --- |
| Research Workspace | Optional shared data store, permissions and revisions; Node/Neo4j |
| Research Publisher | Optional browser-only visual check/preview/download, using the same release engine |
| Founder Workspace | Recipient matching and research; optional local LLM helper |

[Launcher setup](enterprise/LAUNCHER.md), [OpenFor data/scenario reference](enterprise/PUBLISHER.md) and [browser Publisher instructions](publisher/README.md) provide the details. Prepared reference packages include the operator command and launcher. The public default data pack is unchanged. Human browser, real Docker and live-account acceptance remain pending.
