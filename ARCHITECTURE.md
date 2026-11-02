# Architecture

Current interface: Research Workspace maintains authorized investor/startup data through Codex only. Browser administration routes are retired; backend APIs remain. Old browser-workbench descriptions below concern retained source compatibility, not the current interface. Research Publisher prepares reviewed recipient bundles separately; delivery is manual/explicit. See enterprise/OPERATOR.md for raw-data mapping and revision recovery.

Startup Tarot is a static browser application with deterministic matching, local persistence and an offline release build. Research is authored in Guide Pack Kit, distributed as a complete pack and evaluated in the browser. Direct-file mode needs no server. An optional loopback helper now implements OpenAI OAuth, model discovery and structured research requests. The default browser app requires no database service or vector index. An optional incubator reference now implements a separate Node backend and Neo4j adapter; see ENTERPRISE_REFERENCE.md. Real-account model acceptance is still pending.

The product direction is to use LLM reasoning over investor criteria, dated startup snapshots and founder context to drive research. This document describes the static foundation and initial research implementation, then identifies later components. Packet assembly, research history and the OAuth/model adapter exist in code; semantic research quality is not validated. [RESEARCH_PLAN.md](RESEARCH_PLAN.md) defines the first flow and its contracts.

## System context

```text
Official sources
      |
      v
Guide Pack Kit: author, review, date and package research
      |
      | reviewed complete JSON + notices
      v
Startup Tarot repository: build and verify
      |
      | static release files
      v
Founder browser: index.html + active-pack.js + app.bundle.js
      |
      +--> experiment rules --> next move --> plan and learning
      |
      +--> mandate comparison --> shortlist --> editable outreach draft
      |
      +--> localStorage: saved work
      +--> local download: evidence, notes and draft export
```

The founder supplies startup information and decides what to verify, save and use. Sources and additional conditions remain visible. A relevant investor perspective for an experiment and a potentially relevant fundraising prospect are different outputs.

## Repository boundaries

| Repository | Source of truth | Relationship to this app |
| --- | --- | --- |
| guide-pack-kit | Research profiles, snapshots, claim contracts, source/reuse review and packaged content | Its reviewed pack and notices are copied into Startup Tarot |
| startup-tarot | Matching code, user interface, authored benchmark, storage, templates, docs and release tooling | The implemented local product |
| startup-tarot-chat | Fictional scripted chat prototype | Separate project; not the runtime interface or backend for this app |
| hmc62843u.github.io | Public pages and product links | Presentation/distribution context; does not execute the matching engine |

There is no automatic synchronization service between repositories. Research updates are an explicit review, copy, build and verification process.

## Browser components

```text
index.html: main tabs, comparison form, shortlist and source dialog
    |
    +-- packs/active-pack.js --> STARTUP_GUIDE_PACK
    |                              |
    |                         validate + adapt
    |                              |
    +-- js/app.bundle.js -----------+
            |
            +-- experiment domain: context, lessons, tasks and explanations
            +-- investor-fit domain: sectors, mandate claims and ranking
            +-- outreach domain: snapshots, review, templates and exports
            +-- UI coordination: forms, dialogs, explicit saves and downloads
```

The generated bundle contains the editable source modules in dependency order. It is a classic script so prepared files can run without a module server on direct-file URLs. The build strips the supported module declarations; it is not a general JavaScript transpiler. Browser features such as structuredClone, native dialogs and Blob downloads require a suitable modern browser.

| Component | Implementation | Responsibility |
| --- | --- | --- |
| Validation and pack adapter | js/validator.js, js/research-library.js | Validate shapes and references; adapt v2 research/matching/suggestion components |
| Experiment domain | js/context.js, js/matching.js, js/tasks.js, js/recommendation.js, js/explanations.js, js/evaluation.js | Apply authored contexts, assemble supported lessons and maintain learning tasks |
| Experiment orchestration | js/analyzer.js, js/lean.js | Build the view model and preserve versioned workspace ownership |
| Fundraising comparison | js/sectors.js, js/investor-fit.js | Normalize controlled vocabulary, assess dated claims and order results |
| Shortlist and drafting | js/outreach.js | Retain assessments, detect review needs, prepare templates and export Markdown |
| Research domain | js/research.js | Bounded packets, historical cutoff handling, structured/reference validation and immutable runs/feedback |
| OAuth/model helper | tools/research-server.mjs, tools/research-oauth.mjs, tools/research-model.mjs | Loopback static allowlist, signed OAuth identity checks, in-memory token rotation and streamed structured inference |
| Persistence adapters | js/storage.js and outreach storage functions | Read/write the two browser workspaces |
| UI coordinator | js/app.js, js/research-ui.js | Read forms, render safe text, handle navigation, coordinate saves and create downloads |

Domain assessment functions take explicit inputs and dates. They do not fetch research or access the DOM. Storage adapters and UI coordination handle browser side effects.

## Research and comparison flow

1. The trusted browser pack assigns its complete data object before the app bundle runs.
2. Startup validation checks the pack. Invalid configured data produces a visible load error rather than an assessment.
3. The v2 adapter supplies profiles and snapshots to the experiment and fundraising domains. Optional fit_claims do not create experiment-topic connections.
4. The founder enters sector, stage, region and a desired individual check with currency. Comparison reads these fields without automatically saving them.
5. Investor-fit assessment excludes historical, fictional and non-equity records; examines usable declared claims; and returns matches, mismatches, unknowns, cautions and evidence.
6. Results are grouped and ranked deterministically. The UI displays source links and checked dates. Full semantics are defined in [METHODOLOGY.md](METHODOLOGY.md).

The research pack is a distribution unit, not a queryable remote service. Structured claims are held in JavaScript objects and arrays. Legacy editorial compatibility weights do not contribute to fundraising ranking. Matching itself does not traverse the graph. A separate optional JSON relationship artifact supports browser graph traversal, network analysis and LLM-planned public research queries. No semantic retrieval is implemented.

## Saved shortlist and draft flow

```text
Compare --> explicit save --> input + result + evidence snapshot
                                  |
                                  +--> notes and verification answers
                                  |
Current input + current research --+--> review comparison
                                           |
                              changed -----+---- unchanged, stage/sector align
                                 |                         |
                          preserve old work         template preparation
                          request review                   |
                                                founder edits and saves
                                                          |
                                                  Markdown download
```

An assessment key serializes the input and relevant result/evidence fields. It is a change detector, not a cryptographic signature or independent evidence certification. Reassessment can request review when inputs, source claims, classification, exclusions or freshness change. Reviews run on relevant UI actions; there is no background monitoring job.

Draft preparation requires an unchanged saved assessment with stage and sector alignment. It selects a current matching sector claim and combines its attributed paraphrase with founder-provided facts. Missing facts remain placeholders. Founder details and the assessment have separate draft-review keys. Older edited drafts are retained when an assessment updates.

Export creates a local Blob download containing profiles, questions, notes, saved sources and drafts. For shortlist outreach, no email, CRM write, contact lookup or model call occurs. The separate research screen can invoke the configured model through the helper.

## Persistence and isolation

| Store | Identity | Contents | Update policy |
| --- | --- | --- | --- |
| Experiment localStorage | founder_gap_data with provider/library/version workspaces | Situation, selected perspective, plans, progress and learning | Versioned workspaces retain prior experiment ownership |
| Shortlist localStorage | startup-guide-outreach plus provider and pack ID | Saved fundraising query, founder details, assessment snapshots, notes, drafts and archive flags | Version-independent identity retains notes across updates to the same research library |
| Research localStorage | startup-guide-research plus provider and pack ID | Exact packets, outputs, feedback, source dates and revision links | Append runs; preserve earlier conclusions; explicit failures and a local history size limit |
| Service-worker cache | Build-versioned static assets | Prepared app, configured pack and offline documentation | Available on HTTPS after installation; not used for direct-file execution |
| User download | Founder-selected local file | Markdown evidence summary or raw saved-data recovery file | User-managed backup, outside the release source |

The shortlist UI writes before accepting new in-memory saved state. Storage failures remain visible. Unreadable data is preserved and can be downloaded for recovery. A tab checks the last-read serialized value before saving and refuses to overwrite a detected change from another tab. This is best-effort stale-tab protection, not transactional multi-user synchronization.

Archive/restore is reversible and retains notes and drafts. There is no export-import restoration interface, cloud backup, cross-device account or server-side persistence. Browser profile and origin/file location affect access to localStorage.

## Build, help and release

| Tool | Output |
| --- | --- |
| tools/build-demo.mjs | Validated pack wrapper, compiled app script, rendered help, icons and content/cache version |
| tools/build-docs.mjs | Static HTML from the Markdown documentation registry; local links rewritten for nested docs pages |
| tools/release-policy.mjs | Checks registered original fictional fixtures and their declared provenance |
| tools/export-release.mjs | Explicit allowlist of prepared assets, docs, source and checks in a new local release directory |

README.md is the documentation entry point. [GUIDE.md](GUIDE.md) explains user tasks, [METHODOLOGY.md](METHODOLOGY.md) defines matching behavior, [DEVELOPMENT.md](DEVELOPMENT.md) describes maintenance, and [LOCAL_RELEASE.md](LOCAL_RELEASE.md) records acceptance gates. Generated HTML is derived output.

Private founder data lives in browser storage or user exports and must not enter the release allowlist. Keeping a file out of Git alone does not prevent static hosting from exposing it.

## Trust and verification boundaries

- The pack wrapper is executable JavaScript and must come from a trusted source. Validating its assigned object does not sandbox arbitrary wrapper code.
- Source shape, dates and references can be checked mechanically; source truth, rights and founder usefulness still require review.
- UI content is inserted as text, and generated help escapes raw HTML. Source links open external pages when the user follows them.
- Direct-file mode reads prepared assets. The optional loopback helper exposes same-origin account/model/research endpoints and sends inspected packets to OpenAI after user consent. Authentication and API routes bypass the service-worker cache. Tokens are never returned to browser code.
- Unit tests cover matching boundaries and review logic. Simulated DOM tests cover event wiring and persistence. Neither is a substitute for real-browser layout/accessibility acceptance or a founder pilot.

The authored benchmark is a regression specification with fixed dates and expected outcomes. Its passing result does not establish independent accuracy. [LOCAL_RELEASE.md](LOCAL_RELEASE.md) lists remaining validation.

## Initial LLM research architecture — live acceptance pending

The initial output contract expands from investor matching to cited research findings, hypotheses, knowledge gaps and proposed investigations. Deterministic matching supplies context and explicit constraints; an LLM must not silently replace documented exclusions with semantic similarity.

```text
Founder question + startup context + selected records
                    |
             packet assembler
       evidence IDs, dates, limits, gaps
                    |
          founder-inspectable packet
                    |
       research UI/orchestrator
                    |
        loopback OAuth/model adapter
                    |
    structured output + reference validation
                    |
      findings / hypotheses / investigations
                    |
          founder review and feedback
                    |
      new finding --> new packet and revision
```

| Component | Responsibility | Boundary |
| --- | --- | --- |
| Evidence selection and packet assembler | Select bounded investor claims and snapshot facts, retain source dates, omissions, conflicts and limitations | Initially deterministic with explicit record selection; no hidden automatic web search |
| Research orchestrator | Submit a scoped question and packet, optionally coordinate a validated public graph plan, track run status and revisions | Data from sources is not permission to execute instructions or tools |
| Secure model adapter | Call the configured model through a local helper or controlled server-side service | Credentials remain outside browser assets, browser storage and research packs |
| Output validator and review presentation | Validate structure and evidence IDs; separate factual findings, interpretations, hypotheses and actions | Schema and citation existence do not establish semantic support |
| Research session store | Implemented in browser storage: retain packets, model/prompt versions, outputs, feedback and revision links | Separate working research from canonical pack facts and existing experiment/shortlist records |
| Reviewed promotion workflow (manual) | Consider new sourced findings for canonical data updates | Requires source/reuse review; model output never becomes a declared investor criterion automatically |

OpenAI Sign in with ChatGPT is the implemented connection. The helper is bound to 127.0.0.1, verifies signed identity tokens and actual plan scope, discovers account-available models, and uses the public Responses endpoint with store:false and stream:true. No API-key fallback exists. Tokens stay in helper memory; only non-secret host/client registration metadata is persisted under an unserved, ignored .local directory.

Research contract version 1 and a separate research browser-history store are implemented. Run records retain input packets, model/prompt identifiers, timestamps, usage metadata when available, validated structured outputs, feedback and revision links. New evidence creates a new run; canonical research is not changed automatically. The UI can also validate a manually supplied model response.

The public OAuth discovery endpoint was checked, and synthetic OAuth/model/server tests pass. Real sign-in, completed live inference and model-quality assessment remain pending. See [RESEARCH_SETUP.md](RESEARCH_SETUP.md) for actual setup, consent and limits.

The static app remains usable without a model or helper. The initial research flow stays in this repository; split out a service only when deployment or multiple clients justify it. See [RESEARCH_PLAN.md](RESEARCH_PLAN.md) for packet/output contracts and [DEVELOPMENT.md](DEVELOPMENT.md) for proposed implementation responsibilities.

## Current graph architecture

The graph is part of startup-tarot, not a separate app or repository. Public entities and sourced edges load from JSON through a generated JavaScript wrapper. Browser JavaScript performs bounded traversal and network analysis; private founder-entered connections persist separately in browser local storage. The LLM proposes supported public queries and interprets returned evidence, while JavaScript validates and executes the queries. Deterministic investor matching remains independent.

```text
Founder question -> inspect evidence packet and public catalog
                 -> consent -> local OAuth helper -> LLM query plan
                 -> browser validates and executes public queries
                 -> inspect expanded packet and query audit
                 -> consent -> local OAuth helper -> LLM final research
                 -> validate references -> save run and founder feedback
```

Graph storage and computation are in-browser today; OAuth and model requests use the local helper server, and inference runs at OpenAI. A future shared graph database would typically sit behind a server API. It would improve persistence, concurrent editing and query scale, rather than establish the truth of relationships. The current browser implementation already supplies the bounded graph capabilities described in [RELATIONSHIPS.md](RELATIONSHIPS.md).

## Later production infrastructure — conditional

| Addition | Justification required | Boundary to preserve |
| --- | --- | --- |
| Shared backend and relational database | Private research, accounts, coordinated updates or multiple clients require it | Canonical claims retain dates, provenance and stable IDs; founder data has explicit access controls |
| Semantic retrieval | Reviewed cases show material misses beyond bounded selection and controlled vocabulary | Retrieve candidates without converting similarity into eligibility |
| Source acquisition tools | The first reasoning flow proves useful and research needs new external evidence | Actions stay within the founder's research scope and findings retain source provenance |
| Production graph database adoption | A local Neo4j reference is implemented; production adoption requires scale, security and operational acceptance | Keep a clear source of truth and a tested rebuild/update process |

The research assistant does not require a graph database to begin. Evaluate one complete reasoning-and-revision flow before selecting additional retrieval infrastructure.

## Relationship capabilities

[Relationships and introduction paths](RELATIONSHIPS.md) documents the implemented local milestones: traceable edges, bounded multi-hop research, investor network projections and private introduction-path research. Local algorithm checks do not replace live model acceptance, independent source review or founder validation. A Neo4j incubator reference is implemented separately; adoption as the primary production store remains conditional.

## Public graph planning boundary

js/graph-research.js constructs a date-filtered public catalog, validates the closed query contract, and executes bounded plans. The research UI sends a prepared packet to /api/graph-plan; the helper supplies its own canonical public dataset and uses the OAuth structured-output adapter. The browser independently validates the plan, traverses its matching public artifact and rebuilds the evidence packet. A second explicit consent precedes final reasoning through /api/research. Query audits are labelled computed context and model proposals, while sourced edges retain evidence IDs. Public graph reads and packet assembly cannot access private-contact storage. No graph database or separate repository is needed.

## Incubator reference boundary

[ENTERPRISE_REFERENCE.md](ENTERPRISE_REFERENCE.md) describes the optional enterprise/ component. It stores immutable organization/owner-scoped revisions and native Neo4j nodes/edges. Native bounded paths and investment-pair projections are checked against browser semantics; centrality, date/permission policies and evidence assembly share JavaScript implementations. Organization credentials and private-owner permissions are server-derived. Per-user model adapters are explicit integrations, and the default fictional planner is scripted. The original static app and loopback OAuth helper continue independently.

## Operator distribution bridge

The [manual distribution milestone](DISTRIBUTION_GUIDE.md) connects the incubator reference to the main browser application through data, not a continuous server connection. The authenticated admin export selects an immutable organization revision. tools/distribute-incubator.mjs validates approval and builds a manifest plus separate Guide Pack/relationship files. tools/incubator-distribution.mjs configures a fresh browser directory and regenerates wrappers/cache metadata there, leaving the developer pack intact. The browser can then traverse its own copy without Neo4j. File hashes establish integrity, not provenance authentication; source review and recipient access/revocation remain operator responsibilities.

## Contextual research and explicit plan acceptance

[CONTEXTUAL_RESEARCH.md](CONTEXTUAL_RESEARCH.md) documents the shared workspace across Situation, Next move, Startup and Investor. Optional source_context data extends research packet version 1; historical packets omit undated context. Saved run metadata retains its origin and captured inputs. The research engine still only returns structured findings/proposals. js/research-context.js validates saved outputs and current situation/lens/fit/task/plan/pack applicability before a human-reviewed plan update. js/app.js performs the explicit browser-state write and retains previous experiment/learning snapshots plus run IDs in taskProgress.researchApplications. No model output directly mutates source data or overrides investor matching. Global Research navigation and contextual return links make the same engine accessible without routing through Investor.


## Browser-only Publisher boundary

Research Workspace export or independently prepared JSON → browser-only Research Publisher → reviewed ZIP → Founder Workspace. The shared backend is an optional data source, not a publishing runtime dependency. js/publishing.js provides browser/Node validation contracts; publisher/core.js provides local preview, hashing, release assembly and ZIP32. tools/build-publisher.mjs prepares a static template and classic entry at developer build time. Runtime uses no network requests or browser storage. Workspace Node filesystem, database, credential and permission concerns stay in enterprise/ and Node tools.

Publisher preview uses srcdoc with inline trusted code, an opaque sandbox, in-memory storage and restrictive CSP. Imported data is validated; HTML/script boundaries are escaped. Parent CSP permits inline scripts/styles because srcdoc inherits it. Preview helper connections and service workers are disabled. Normal recipient releases retain optional helper support and normal browser persistence. Browser manifests explicitly identify browser-local-files and local review declarations; no centralized authorization or audit is implied. A static folder is implemented; installable PWA packaging is not implemented. The Local Services Launcher is now supplied separately for repeatable shared Workspace startup.


## Local Services Launcher

enterprise/launch.mjs and the Windows start-workspace.cmd wrapper start a detached local supervisor. The supervisor embeds an owned Workspace server, checks authenticated database readiness and optionally starts the fixed Docker Compose service. Exact live handles and container start identity govern shutdown; an external database or reused Workspace is never terminated. A private token-protected loopback endpoint exposes status/stop only and rejects browser origins. Ignored state is not exported. Startup never seeds data or rewrites access/password configuration. Publisher's local-file runtime remains independent. See [launcher operation](enterprise/LAUNCHER.md).


## Operator command as the primary pilot interface

enterprise/operator.mjs is one thin entry point for start/status/stop (delegating to the launcher), shared-data inspect/import/export (reusing the authenticated request helper), and check/prepare/package (reusing publisher/core.js). It does not introduce another validation or ZIP engine. Proposals live under ignored .local/operator with source, sandboxed preview, summary, review draft and hash receipt. Package checks exact source/preview/summary/template identity and explicit review declarations, then emits the same manifest as browser Publisher. No sharing command is supplied.

The browser-only Publisher remains optional. Research Workspace now focuses on shared data and an advanced research workbench; duplicate server publishing forms were removed. Old server publishing APIs and the original Node CLI remain compatibility implementations, not required steps in the primary flow. One operator guide owns the recommended procedure; launcher, data reference and technical distribution docs supply details. Human approval is a workflow rule and local declaration, not an authenticated second-person signature.


## Skill, service and adapters

.agents/skills/research-operator/SKILL.md is a thin repository-scoped guide to the existing operator procedure. It adds no scripts or copied reference files. enterprise/operator-service.mjs exposes structured check/inspect/import/export/prepare/package operations, sharing validation and release assembly with browser Publisher. enterprise/operator.mjs is a compatibility-preserving CLI adapter; lifecycle still delegates to the existing launcher. MCP is deferred rather than implemented as a parallel workflow. Local review declarations, revision checks and proposal binding remain in code. Global Codex settings and user skills are not changed.
