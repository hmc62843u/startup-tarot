# Developer guide

The prepared app runs from index.html, including direct-file URLs. Development uses Node 24 and built-in modules; no package installation is required. Start with the [architecture](ARCHITECTURE.md), [user guide](GUIDE.md), [matching methodology](METHODOLOGY.md) and [release checklist](LOCAL_RELEASE.md).

## Build and verify

```sh
node tools/build-demo.mjs
node --test tests/*.test.mjs
node --check js/app.bundle.js
node --check packs/active-pack.js
node --check sw.js
node tools/export-release.mjs
```

The build validates packs/guide-pack.json, generates its trusted browser wrapper, bundles source modules in dependency order, renders documentation and updates cache versions. Edit source modules and Markdown, then rebuild. Do not hand-edit generated app.bundle.js or docs HTML. The next build replaces a manually supplied active-pack.js from the JSON.

The exporter creates an allowlisted local release directory. It excludes Git metadata, browser state and private working files. Publishing and GitHub Pages configuration are separate actions.

## Repository responsibilities

| Repository | Owns |
| --- | --- |
| startup-tarot | Browser application, matching implementation, benchmark expectations, saves, drafts and release tooling |
| guide-pack-kit | Canonical research records, claim formats, source/reuse review and distributable packs |
| startup-tarot-chat | Separate scripted chat prototype; it is not the live backend for this app |
| hmc62843u.github.io | Public site and product links; not the matching engine |

## Source modules

| Module | Responsibility |
| --- | --- |
| js/validator.js, js/research-library.js | Shape validation, profile normalization and v2 component adapter |
| js/context.js, js/matching.js | Experiment context and explicitly supported lesson/topic connections |
| js/tasks.js, js/recommendation.js, js/explanations.js | Learning tasks, prioritization and explanations |
| js/evaluation.js, js/analyzer.js, js/lean.js | Experiment evaluation, orchestration and compact view model |
| js/sectors.js, js/investor-fit.js | Editorial sector vocabulary and evidence-based fundraising comparisons |
| js/outreach.js | Saved assessments, review checks, draft templates, exports and storage adapters |
| js/storage.js | Existing experiment storage adapter |
| js/app.js | DOM rendering, navigation, explicit saves, dialogs and downloads |

Matching and assessment functions operate on supplied data and dates. DOM access belongs in app.js. Storage access is confined to adapters and UI coordination. The four main tabs remain Situation, Next move, Investor and Startup; investor fit and shortlist are additional scrollable screens.

## Data contracts

The configured pack is a trusted script assigning STARTUP_GUIDE_PACK. The application validates its data, not arbitrary code in the wrapper. V2 separates research, declarative experiment matching and suggestions. Runtime validation also checks references and allowed operators; schemas alone do not establish research truth or rights.

Optional profile fit_claims are the input to fundraising comparison. Do not infer a mandate from legacy tags, editorial criteria_weights, portfolio patterns or display strings. Typed claim amounts carry explicit currencies. See Guide Pack Kit's INVESTOR_FIT.md for the authoring contract and [METHODOLOGY.md](METHODOLOGY.md) for implemented semantics.

Investor-fit results expose fit, evidenceCoverage, matchedFields, reasons, conflicts, unknowns, evidence and cautions. Sorting is deterministic. The vocabulary is directional: a broad software mandate may include SaaS, while a SaaS mandate does not automatically include every software business. No embeddings, graph database, backend or LLM is required by this implementation.

## Storage and review

| Workspace | Key and identity | Update behavior |
| --- | --- | --- |
| Experiments | founder_gap_data; provider/library/version workspaces | Keeps plans and ownership metadata while isolating pack versions |
| Investor shortlist | startup-guide-outreach plus provider and pack ID, without version | Retains investor notes and snapshots across research versions |

Shortlist entries store startup input, assessment, source claims, pack version, save date, notes, draft, draft review keys and archive state. An assessment key covers the input and relevant result/evidence. Current research, stale evidence, missing profiles or changed input can require review. Founder-detail changes also invalidate a draft's reviewed state.

Explicit saves write before updating in-memory saved state. Quota/access failures remain visible. Corrupt shortlist bytes are preserved and can be downloaded for recovery. A tab refuses to overwrite a shortlist changed by another tab; reload first. Archive/restore retains notes and drafts. Exports save visible edits and include founder text, notes, source snapshots and review warnings.

Do not put real founder details, private research, downloaded shortlist exports or credentials in this repository. Browser storage depends on the browser profile and origin/file path. An export is a user backup; it is not part of the shipped pack.

## Update research

1. Review official sources in Guide Pack Kit. Record dates, unknowns, strict requirements and editorial mappings separately. Keep notices and reviewed record hashes consistent.
2. Update canonical records and the complete pack there. Never add an invented experiment-topic connection to make a fundraising comparison look supported.
3. Copy the reviewed complete JSON and required notices into packs/. Update packs/README.md, including its JSON hash. Preserve pack identity when it is the same research provider and library; change version for content releases.
4. Inspect affected benchmark expectations and rationales. A changed source can legitimately change a result; do not alter expected outcomes merely to silence a failure.
5. Build and run the relevant checks. Confirm changed evidence requests review while founder notes survive. Source refresh is manual; the review window is a product policy, not a scheduled job.

Keep raw source archives and personal data outside public release folders. A gitignore entry does not prevent a web server from exposing a file.

## Verification layers

| Checks | What they establish | What they do not establish |
| --- | --- | --- |
| data/fit-benchmark.json and matcher tests | Agreement with nine authored cases, field boundaries and deterministic behavior | Independent matching accuracy or market-wide recall |
| Outreach domain tests | Storage round trips, source review, draft provenance and export content | Browser layout or successful delivery of outreach |
| Simulated DOM tests | Event wiring for compare/save/draft/reload/archive/export and failure paths | Actual browser, keyboard or assistive-technology behavior |
| Build, release and offline tests | Reproducible assets, local links, source safety and cache behavior | Complete real-browser acceptance |
| Founder pilot | Pending observations about clarity and usefulness | Funding outcomes or guaranteed investor interest |

The matching benchmark has fixed assessment dates and author-defined expectations. Its cases cover geography, missing fields, currencies, initial stages, sector boundaries and stale evidence. Founder-pilot observations belong in private working notes, with versions and expected behavior recorded.

## Documentation and delivery

GUIDE.md, METHODOLOGY.md, RESEARCH_PLAN.md, ARCHITECTURE.md, RESEARCH_SETUP.md, DEVELOPMENT.md, LOCAL_RELEASE.md, EXAMPLES.md and licence documents are rendered through tools/build-docs.mjs. The help navigation provides links between them. The service worker caches the generated help on HTTPS hosting; file URLs read it directly. Add new rendered pages to the document registry, offline assets, export allowlist and reproducibility checks together.

Use readable, keyboard-accessible controls and visible save errors. The original compact experiment screens target small viewports; investor comparison, notes, drafts, source dialogs, enlarged text and long content can scroll. Do not hide overflow to force a fixed-height layout. Real-browser layout, focus restoration, keyboard behavior and the founder pilot remain acceptance checks in [LOCAL_RELEASE.md](LOCAL_RELEASE.md).

## Initial research implementation

The product direction is question-driven LLM research, with deterministic matching and dated snapshots as evidence inputs. Version-1 packet assembly, reference validation, saved runs/feedback/revisions and the loopback OAuth/model adapter are implemented. Real-account inference acceptance and model-quality evaluation are pending. [RESEARCH_SETUP.md](RESEARCH_SETUP.md) explains operation; [RESEARCH_PLAN.md](RESEARCH_PLAN.md) defines contracts and evaluation gates.

| Module | Implemented responsibility |
| --- | --- |
| js/research.js | Five-record/sixty-item/60,000-byte packets, historical source exclusion, founder-assertion labels, output schema and evidence-reference checks, append-only runs and feedback |
| js/research-ui.js | Explicit selection and packet inspection, manual response review, ChatGPT connection UI, transmission consent, cancellation, research-history saves and exports |
| tools/research-oauth.mjs | Fresh state/nonce/PKCE, dynamic registration, JWKS identity validation, actual plan-scope checks, account-specific models, in-memory token refresh and disconnect |
| tools/research-model.mjs | Fixed public Responses endpoint, structured schema, store:false/stream:true, terminal completion/refusal/error handling and reference validation |
| tools/research-server.mjs | 127.0.0.1 static allowlist, Host/Origin checks, bounded JSON, same-origin APIs and one timed research request at a time |
| start-research.cmd | Windows launcher using Node or the Codex bundled Node runtime |

Use OpenAI OAuth via the helper, not tokens extracted from Codex or browser storage. No API key is required or accepted by this adapter. Tokens are memory-only and are lost on helper restart; .local/research-oauth retains non-secret host/client metadata and account labels for returning registrations. Do not serve this directory or include it in releases. API/auth routes must bypass the service worker. See the official protocol references in RESEARCH_SETUP.md when updating this integration.

The research browser key is separate from experiment and shortlist keys. Each saved run retains its exact input/output, model/prompt identifiers, available usage, timestamp, validation and parent ID. Feedback appends. Working findings do not update Guide Pack Kit. Local history has a size limit and stale-tab saves are rejected; exports retain private founder context and should be reviewed before sharing.

Tests cover packet boundaries, cutoff omissions, invented references, model terminal states, signed synthetic identities, token renewal, public-file isolation, cross-origin rejection and simulated packet/response/revision persistence. They never call paid/live inference. Define reviewer thresholds and evaluate supported/missing/conflicting/historical cases before calling the assistant accurate. Reference existence alone does not prove source support.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Graph planner verification

Run tests/graph-research.test.mjs, tests/outreach-ui.test.mjs and tests/research-server.test.mjs for query validation, historical catalog filtering, browser orchestration, consent/cancellation, saved audits and canonical server dataset selection. js/graph-research.js is bundled for direct-file use; OAuth planning requires the loopback helper. Planner and final-answer requests are separate bounded calls. Structured output follows the existing Responses text.format JSON schema adapter; official reference: https://developers.openai.com/api/docs/guides/structured-outputs.

## Incubator graph reference milestone

The optional [Neo4j reference](ENTERPRISE_REFERENCE.md) is now implemented alongside the browser app. It includes fictional investor/startup workspaces, validated imports, versioned storage, organization and private-owner isolation, native graph query parity, scoped model adapters and an adoption guide. Real Neo4j/API integration checks pass. See [reference acceptance](enterprise/ACCEPTANCE.md) for evidence and pending production, live-model and browser gates. This does not make Neo4j a dependency of the browser version.

## Operator browser distributions

See [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md). tools/build-demo.mjs accepts an alternate root so generated scripts, docs and cache files can be rebuilt in an isolated browser edition. exportRelease supports a fresh output directory and a read-only-template copy mode. Distribution tests cover source preservation, exact component hashes, review gates, authenticated revision selection, native browser initialization and custom graph IDs. Run node --test tests/distribution.test.mjs tests/outreach-ui.test.mjs tests/enterprise.test.mjs after relevant changes.

## Contextual research checks

js/research-context.js owns context snapshots and pure plan-application checks. tests/research-context.test.mjs covers source identity, historical omission, prior-plan retention and stale applicability. tests/outreach-ui.test.mjs exercises the four entry points, manual research review, cancellation, edited acceptance, history/source links, reload, cross-tab conflicts and storage failures. Research navigation and proposal dialogs are in index.html; live adapter contracts are unchanged. See [CONTEXTUAL_RESEARCH.md](CONTEXTUAL_RESEARCH.md) for complete acceptance tasks.


Browser-only Research Publisher: run node tools/build-demo.mjs, then node tools/build-publisher.mjs. The latter creates a complete static release/research-publisher-* folder and refreshes ignored local publisher/template.js and publisher/app.bundle.js. Open publisher/index.html from the prepared checkout. Run node --test tests/browser-publisher.test.mjs for portable validation, offline simulated-DOM preview/download and release checks. Do not add runtime fetch calls or shared credentials to Publisher.


Local Services Launcher: node --test tests/launcher.test.mjs checks lifecycle ownership, failures and authenticated loopback control. Its CLI round trip uses a simulated database endpoint and skips if a user launcher already owns the checkout. Docker itself and browser-opening require human acceptance. Do not add arbitrary shell commands, silent seeding, volume removal or credential logging to startup.


Primary operator CLI: enterprise/operator.mjs delegates lifecycle, reuses authenticated Workspace requests and uses publisher/core.js for check/preview/release. Run node --test tests/operator.test.mjs for unapproved proposals, source/preview/summary/template binding, local package identity and maintenance revision boundaries. Keep compatibility scripts out of the main UI and do not add another release engine or automatic publishing step.


Operator adapters call enterprise/operator-service.mjs; keep business rules out of CLI/skill metadata. The repository Research Operator skill references enterprise/OPERATOR.md instead of duplicating it. Test direct service/CLI parity and revision/approval invariants with tests/operator.test.mjs. MCP remains deferred. Export the skill only with the operator reference package, not founder recipient bundles.


## Milestone: Codex-only Research Workspace

One use case: maintain authorized investor/startup research data. Codex maps selected raw local files, validates and summarizes changes, imports against an inspected revision, verifies exports and recovers prior data through a new revision. Publisher handles reviewed bundles separately; delivery is outside Workspace.

Implementation: browser admin routes retired; root provides Codex instructions; operator start avoids opening a browser; legacy UI source retained for tests and shipped only as compatibility-test inputs. Existing CLI/service/revision engine reused; guide owns mapping/recovery instructions. No universal importer, MCP or new UI added.

Verification: synthetic real-HTTP rehearsal checks revisions, scoped access, export, recovery and approval gates using an in-memory store. Actual authorized OpenFor raw files and Neo4j persistence remain adoption gates. Human recipient/browser acceptance remains separately deferred.


## Next milestone: Codex-guided OpenFor pilot

Prepared; not started. Entry: OpenFor agrees, selects an operator and a small authorized local dataset. Follow the six checkpoints in enterprise/OPERATOR.md: scope, live setup, mapped baseline, revision-pinned import/export, correction/recovery, and live durability/usefulness confirmation. Exit: OpenFor confirms a useful traceable maintained dataset, updates/recovery pass, and selected revisions survive the actual service lifecycle. Record outcomes locally with explicit pending/failure states. Synthetic tests do not satisfy live evidence gates.

Publisher approval and delivery are separate. Until participation begins, synthetic demo readiness remains the active presentation objective; actual-data access and operational acceptance do not block that demo.


## Shared live-storage demonstration/pilot workflow

The private demonstration now requires live Neo4j and a dedicated openfor_demo_* organization; the CLI has no simulated fallback. A pilot uses the same infrastructure/schema/operator sequence with a separately provisioned clean organization and authorized data. Retain demo data as a reusable template rather than promoting its invented records. In-memory injection remains only for automated integration tests. The synthetic command resets only an explicitly selected demo namespace through revisioned writes and never accepts a pilot namespace.

Local execution against the existing .local/enterprise/neo4j-test.json configuration failed the read-only readiness query: live Neo4j unavailable. No live acceptance is claimed. Starting/verifying the intended database remains the next demo checkpoint; actual private-data readiness still follows OpenFor participation.

Live verification follow-up: the existing portable instance uses 17474. After starting it and selecting that URL, two ten-checkpoint demonstrations, nine native Neo4j checks and an actual database restart revision/hash comparison passed. See enterprise/ACCEPTANCE.md; actual OpenFor data and human/LLM acceptance remain separate.


## Setup panel implementation

enterprise/setup-panel.mjs hosts the setup-only local bridge; enterprise/setup contains native offline HTML/CSS/JS. Operator setup opens no browser itself: Codex opens the printed URL in its own built-in browser. Only check/start/stop are accepted; no command strings, data mutations or credentials-entry fields. All service actions reuse launchCommand. Configuration and service probes are reused; Node is a bootstrap prerequisite. No OpenUI package, MCP registration or global Codex settings were added.

Run node --test tests/setup-panel.test.mjs for missing configuration, redaction, origin/route/action constraints and concurrency. Source and reference include the same panel. Clean-machine installation is not established by a local browser check or extracted-package missing-config check.
