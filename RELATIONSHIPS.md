# Relationships and introduction-path research

## Current capability

Open Investor > Relationships and introduction paths. This local implementation uses bounded traversal of an optional, source-backed JSON artifact. A graph database is unnecessary at this scale.

| Capability | Implemented locally | Acceptance still needed |
| --- | --- | --- |
| Reliable LLM research | Inspectable packets, source-reference checks, OAuth adapter, saved revisions | Actual sign-in/inference, semantic review and founder usefulness |
| Traceable relationships | Typed edges, source links, event/publication/review dates, explicit limits | Independent source review and broader coverage |
| Multi-hop research | Bounded paths, direction display, historical filters, public path selection into research packets | Real-browser acceptance and useful research cases |
| Investor network analysis | Same-round/shared-company projections, degree, betweenness, provenance and event windows | Coverage assessment and interpretation review |
| Private introduction paths | Consented local notes, directional connections, confirmation, willingness, freshness and revocation | Founder confirmation and browser acceptance; no independent verification |

A passing local test is an implementation check, not evidence of research accuracy or an available introduction.

## Public research

The initial public artifact has 19 nodes and 13 edges. Its coverage is deliberately incomplete. Sources establish selected firstminute seed portfolio relationships; boldstart and GV participating in Tessl's inception round; selected Connect seed relationships; and a historical YC/Airbnb snapshot/activity trail. A recorded relationship does not establish current investor fit, acquaintance, causation or a warm introduction.

The default path links YC, Airbnb, a historical snapshot and documented user visits. Reverse traversal is shown explicitly. The snapshot's later publication date prevents its use as contemporaneously available evidence in a 2009 historical simulation.

Same-round projection requires documented participation in the same identified round. Shared-company projection also includes investors connected to a company without evidence of a shared round. Unknown investment dates cannot pass an event-date window. Unknown publication dates cannot pass a historical availability cutoff. Date windows apply to both path and network queries.

Network metrics describe only the included graph. High degree or betweenness is not investor quality, influence, suitability or an introduction recommendation. Results disclose omitted edges and query limits.

Public paths can be added to a fresh research packet. Linked records and source-backed edges count toward packet limits. In the browser research workflow, private and fictional relationship graphs are rejected by packet assembly. The incubator reference separately supports explicitly labelled fictional simulation packets, while its live model-adapter routes reject fictional data. Inspect the packet before any model request.

## Fictional demo

The separate fictional topology demonstrates multi-hop traversal and a star-shaped investor network. Every edge is labelled fictional. In the browser app, it is never merged into public evidence or accepted into live model research packets. Its metrics test the algorithm; they say nothing about real investors.

## Browser private contacts

Private names and connection notes require explicit storage consent and stay in this browser's local storage. Record each connection in the direction it can be used. A path from you to an investor requires permission for each edge, a review within 90 days, and no declined willingness. The stricter result also requires founder confirmation and reported willingness at every step. Possible paths must be explicitly requested.

Founder-confirmed means reported by the founder, not independently verified. A path does not guarantee that anyone will introduce you. Current investor fit is shown separately. No messages are sent.

Edit confirmation/willingness to save a new revision. Revoke use permission to exclude an edge from future paths; previous notes remain in local audit history. Private exports contain names and notes: inspect them before sharing. Private records never enter public releases or model packets. Browser storage is not encrypted by this app; use a trusted browser profile. There is no private-record import interface.

## Architecture and limits

`js/relationships.js` validates datasets and implements traversal, projections and packet-safe public evidence selection. `js/private-relationships.js` maintains private changes. `js/relationship-ui.js` renders the controls. `data/relationships.json` is copied from the separately reviewed optional artifact in guide-pack-kit; `data/relationships-demo.json` is fictional. `packs/relationships.js` makes both public artifacts available during direct-file use. These files do not change Guide Pack v2.

Limits are 300 nodes, 1,000 edges, six hops, 30 returned paths and 5,000 expansions per query. Research packets accept at most 20 selected relationship edges and retain the existing overall byte/evidence limits. Overflow fails or is explicitly disclosed; it is not silently treated as complete coverage.

An optional Neo4j incubator reference is now available for adoption trials. Making a graph database the primary product storage remains conditional on measured graph size, concurrent editing, query latency or operational needs. Migration should preserve IDs, sources, dates, permission and confirmation semantics. Broader ingestion and verified introduction discovery require reviewed data and consent, not merely a database.

## Model-directed public graph research

The research screen now connects LLM planning to the browser graph. Build a packet and open LLM graph exploration. Inspect both the packet and displayed public node catalog, connect ChatGPT, choose a model and confirm transmission. Choose Plan and explore public graph. The model proposes queries; JavaScript validates and executes them in the browser. Inspect the query audit and expanded evidence packet, then confirm again and choose Run research for the final answer.

One successful planning pass per prepared packet allows at most three queries, four hops and five returned paths per query, within the existing twenty-edge and 60 KB packet bounds. Supported queries are paths between existing public entities and same-round/shared-company network projections. Zero queries and no-path results are valid abstentions, not proof that real-world relationships are absent. There is no recursive autonomous browsing or canonical data mutation. Private contacts and fictional graphs are unavailable to the browser's live research planner and executor. Historical availability filters constrain the catalog and results.

The planner receives the prepared packet plus the displayed public node catalog; the final request receives the expanded packet. Each call uses the selected ChatGPT model and may consume plan usage. Consent resets after exploration, including failure/cancellation. Invalid proposals fail without altering the original packet. The final saved run preserves its exact expanded packet, query results, omissions and available planner/model usage metadata. Exploration alone is inspectable but is not saved as a completed research run; export the prepared packet/prompt if needed. Rebuild the packet to ask a new question or repeat planning.

The implementation uses structured model output followed by deterministic validation, not arbitrary executable model code. Schema validation does not establish semantic relevance, source support or research usefulness. Live account/model acceptance, real-browser checks and founder evaluation remain pending.

## Incubator graph reference milestone

The optional [Neo4j reference](ENTERPRISE_REFERENCE.md) is now implemented alongside the browser app. It includes fictional investor/startup workspaces, validated imports, versioned storage, organization and private-owner isolation, native graph query parity, scoped model adapters and an adoption guide. Real Neo4j/API integration checks pass. See [reference acceptance](enterprise/ACCEPTANCE.md) for evidence and pending production, live-model and browser gates. This does not make Neo4j a dependency of the browser version.
