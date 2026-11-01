# Local reference acceptance

Assessment date: 2026-10-30 (America/Los_Angeles). This records implementation checks, not independent validation or production certification.

## Milestone checklist

| Checkpoint | Local evidence | Status |
| --- | --- | --- |
| Database/backend setup | Neo4j Community 2026.10.1 running from a portable distribution with Java 21; authenticated loopback Query API; Docker Compose alternative supplied | Exercised portable setup; Docker recipe not run on this machine |
| Fictional examples | Alpha/beta Guide Packs plus graph topology; overlapping IDs test scope boundaries | Implemented and validated |
| Organization data import | Validated Guide Pack v1/v2 and separately bound relationships; lossless JSON/native graph storage | Round-trip tested with fictional profiles/snapshots |
| Atomicity and revisions | Immutable import records, active pointer, stale-write comparison and concurrent import checks | Tested against real Neo4j |
| Query equivalence | Native path traversal and native investment-pair projection checked against browser algorithms | Tested on real Neo4j; centrality remains shared JavaScript |
| Organization isolation | Different credentials and scopes cannot read another organization's revision with identical node IDs | HTTP and database checks |
| Private permissions | Separate owner scope, no administrator bypass, directional consent/confirmation, current revocation and stale-version rejection | Tested with synthetic contact aliases |
| LLM query contract | Same bounded schema, inspected packets, per-principal adapter boundary, prompt export/manual response validation | Scripted demonstration and injected model tests; live account acceptance pending |
| End-to-end demonstration | Authenticated import/read, native query, expanded packet and structured response review | Real database/API round trip; web UI supplied for manual use |
| Adoption documentation | Setup, import contract, permissions, model provisioning, operations and packaging | Documented |

The standalone integration suite creates isolated fictional namespaces. Exact import JSON is compared after storage; unsupported or malformed imports fail before mutation. Shared-company overlap is tested separately from shared-round membership. Across the unit, contract and integration suites, negative checks cover cross-organization revisions, stale writes, private owner isolation, revocation, historical availability and invented/unsupported graph queries.

The portable test download's Neo4j SHA-256 matched the vendor checksum: 675655653b16fe2f300dae8686d6afe6fef902ef2550be14d4facd289f6ae295. Runtime downloads, test credentials, database files and contact aliases are ignored local material and excluded from release packages.

## Recorded verification: initial reference milestone (2026-10-30)

- Main application and reference unit/API suite: 137 passing tests.
- Standalone packaged reference contract: 1 passing test.
- Real Neo4j acceptance suite: 9 reported passing tests, including the parent suite and eight scenario checks; no skips in the recorded run.
- Exported reference: contract and real database suites passed from the package itself; all 29 allowlisted file hashes matched its manifest.
- Running demo API: two selected investor/snapshot records, nineteen evidence items and two executed graph queries; planner metadata explicitly reported scripted-demo-not-an-LLM.

Legacy research Guide Pack v1 provider binding is also covered. Browser workspace switching clears founder context and previous outputs in a simulated DOM test; this does not replace actual browser usability review.

## Adoption gates still open

- Independent security review, enterprise identity provider and membership/session lifecycle.
- Real incubator import mapping and rights/quality review.
- Actual per-user OAuth/inference and semantic model evaluation.
- Real-browser layout, keyboard and accessibility acceptance.
- Docker-path execution, backup/restore exercises, retention/deletion policy and scale/load testing.

The implementation provides a local adoption reference. These gates must be assessed before presenting it as a production enterprise service.

## Operator distribution milestone (2026-10-31)

Implemented administrator-only export of an explicit organization revision, a modular hashed data manifest, privacy/rights approval gates and a branded browser build in a fresh directory. The distribution builder preserves the developer pack and validates file identities, hashes, source references and required notices. It excludes private-owner stores, access configuration, research history and known reserved sensitive fields. Human review is still required for confidential text and actual redistribution rights.

Source tests total 142 passing checks at this checkpoint. New cases cover administrator scope, private-owner exclusion, explicit revision selection, review approval, modified components, source-checkout preservation, custom graph IDs, and browser initialization/querying with backend requests unavailable. A real authenticated export from the persisted example_alpha revision was successfully built through the same operator command into a fictional 1.0.0 browser edition. No model inference or external publication was part of that demonstration.

See DISTRIBUTION_GUIDE.md for the repeatable process and the limits of updating or revoking local copies. Independent recipient-browser acceptance and customer data/rights review remain operator gates.


## OpenFor publisher checkpoint (2026-10-31)

The local operator page now stages a public-source sample or editable fictional template, checks schema/provenance gaps, imports explicitly and downloads a blank release-review JSON. The sample contains two current investor profiles, two attributed historical startup snapshots and three sourced historical edges. It asserts no OpenFor affiliation or introduction paths. Staging is memory-only and resets when credentials change. Admin authorization applies to sample/check API routes; these routes do not mutate Neo4j.

Source validation: 152 passing tests, including two new publisher tests for unknown criteria, initial versus follow-on check size, graph separation, reserved credential rejection, sample path allowlisting and authenticated administrator routing. Existing simulated-DOM workspace switching checks remain passing. Real browser/operator acceptance is pending. Browser packaging continues to use the documented CLI; browser preview and one-click ZIP download are not implemented. No real-data distribution approval, live model inference or external publication occurred.


## Private OpenFor presentation dataset expansion (2026-10-31)

The separate OpenFor fixture is now v0.2.0: two investor profiles, three OpenFor-listed startup observations (ad-dice, Citadel AI and Asenion), two historical teaching snapshots and six graph edges. The three added edges map snapshots to startup identities only. Source metadata records directory presence; no partner, investment or introduction link is inferred. Current startup funding, customer counts, team sizes and fundraising needs remain unknown. The main public Guide Pack was not replaced.

The operator page and PUBLISHER.md document private presentation intent, source selection, hypothetical scenario separation and a repeatable walkthrough. The selected fixture remains included in standalone reference exports; private intent does not itself enforce access restrictions or clear wider distribution.

Validation: 153 source tests passed. The new regression verifies null publication dates remain unknown, invalid/missing dates are rejected and current undated startup observations are omitted from historical-cutoff evidence. Browser/operator acceptance and actual OpenFor-supplied nonpublic data remain pending. No database import, external sharing or release approval was performed.


## OpenFor illustrative-scenario companion (2026-10-31)

Added three fictional founder journeys based on the existing sourced product context of ad-dice, Asenion and Citadel AI. The companion JSON individually marks invented stages, sectors, geographies, fundraising amounts, monthly revenue, customer counts and planning dates as illustrative_unverified with confirm/replace/remove guidance. Fictional startup identities prevent these inputs from being attributed to the real source companies. Investor profiles remain unchanged; comparisons do not assert funding or introduction relationships.

The administrator page can load, inspect, apply and separately download scenarios. Applying selects sourced context and updates the research form only; no database write or canonical fact change occurs. Labels travel in startup_context for prepared packets and prompt exports. Source-revision and browser data exports exclude form inputs; the labelled companion JSON must be carried separately, and is included in the standalone reference. The founder app does not automatically import the companion file.

Validation: 155 source tests passed. New tests verify reference identity, unknown canonical financial fields, per-value labels, packet preservation, administrator permission, simulated-DOM application without database mutations and disconnect clearing. Real-browser/operator acceptance and live LLM inference remain pending. Nothing was published, externally shared or approved for wider distribution.


## Automated preview / reviewed ZIP implementation — acceptance pending

Local implementation now includes revision-pinned founder preview with temporary in-memory storage, an opaque sandbox, persistent illustrative notices and no helper/backend connections; administrator-scoped reviewed builds and ZIP downloads; expiry/revocation; and the full browser build template in new standalone reference exports. ZIP files exclude preview work and hypothetical scenario inputs. Hypothetical scenarios remain a separate labelled download.

The implementation turn recorded 13 passing focused tests covering publisher/enterprise routes, preview scope and isolation controls, approval gates, ZIP structure/contents, expiry and revocation. This is not a new full-suite or real-browser acceptance claim. The automated browser attempt stopped because Computer Use could not determine the current browser URL confidently enough for policy enforcement. No human browser pass has been recorded.

Use the **Human real-browser acceptance checklist** in enterprise/PUBLISHER.md. Record tester, date/timezone, OS, browser/version, app build, selected revision, scenario, release identity, each step's result and reproducible issues. Pending results remain pending; an API check must not be substituted for a browser usability result. The local milestone stays open until the human checklist passes and blocking issues are fixed.


## Lean browser-only Publisher refactor (2026-10-31)

Three interfaces are now explicit: Research Workspace for shared imports/revisions/permissions and Neo4j research; Research Publisher for local-file check, preview and reviewed ZIP download; Founder Workspace for founder matching and research with an optional local LLM helper. The shared interface prioritizes data import/export and collapses legacy server publishing controls. Browser-only Publisher has three sections and no credentials, server connection or persistent browser storage. Node remains a developer build dependency and the shared Workspace runtime, not a publishing runtime dependency. No new launcher or installable PWA is claimed.

The pure js/publishing.js contracts are reused by Node and the browser. Source exports retain declared organization/revision; independent local imports carry explicit local provenance. Browser ZIP format is distinct from the existing Node CLI manifest. Scenarios and preview edits are excluded from the release. Preview script/HTML escaping, opaque sandbox, no connections, no service worker and in-memory work are exercised in automated checks. Normal recipients retain their own browser persistence and optional helper support.

Verification at this checkpoint: 160 source tests passed, including four new browser-only tests, an operator simulated-DOM flow with network and storage unavailable, portable validation parity, invalidated preview/review checks, script-boundary escaping, ZIP content hashes and no-backend graph queries. An independent Python ZIP reader also accepted the smoke archive. These are not real-browser or operator usability acceptance; use publisher/README.md for the human checklist. Do not close the local milestone until actual results are recorded and blockers resolved.


## Repeatable Local Services Launcher (2026-10-31)

Implemented start-workspace.cmd and enterprise/launch.mjs start/status/stop/publisher. One-time ignored configuration and existing credentials are required. A local supervisor reuses healthy services, waits for authenticated database readiness, starts a missing fixed Docker Compose Neo4j when configured, and embeds the Workspace server when needed. The launcher never seeds records, overwrites passwords/access files or removes database volumes. Stop targets only live owned server/container handles; exact Docker start identity prevents stopping a subsequently restarted container. External/portable databases remain externally managed. Publisher opens independently.

Nine launcher tests passed: ownership/reuse/order, rollback, port conflict/external failure, timeout, Docker identity checks, loopback control authorization and Origin rejection, configuration/state boundaries, and a real detached supervisor/CLI start-repeat-status-stop round trip against a simulated Neo4j endpoint. Docker startup was mocked because Docker is unavailable in this environment; real image/Compose and default-browser opening remain pending. Human launcher and browser checklists are in enterprise/LAUNCHER.md and publisher/README.md. This milestone is locally implemented, not a production deployment or recorded human pass.

Final verification for the launcher checkpoint: all 169 source tests passed, including the nine launcher cases. Human default-browser and real Docker startup checks remain pending.


## Lean Codex-primary operator workflow (2026-10-31)

The recommended pilot path now uses one enterprise/operator.mjs command family: lifecycle delegates to the existing launcher; shared-data inspect/import/export reuses the authenticated request helper; check/prepare/package reuses publisher/core.js and portable validation. There is no new release engine and no automatic sending/publishing action. The optional browser Publisher emits the same manifest format. Old Node CLI/server publishing APIs remain compatibility paths, but duplicate server publishing and import forms were removed from the shared Workspace UI.

Prepare produces an exact source copy, sandboxed founder preview, summary, false-by-default review draft and hash receipt under ignored .local/operator. Package requires explicit preview/rights/privacy/approval declarations and detects changes in source, preview, summary, template or packaging code. These local declarations cannot authenticate a human conversation or replace genuine approval. Sending needs separate explicit artifact/destination instructions. Real-data rights, human browser and live model acceptance remain pending.

Documentation now has one primary operator guide, a shorter OpenFor data/scenario reference and a concise Workspace README. Launcher, technical backend and older CLI distribution documents are supporting references. Root product documentation points to this single workflow rather than repeating parallel instructions. New operator tests cover unapproved proposals, hash binding, shared release format, expected import revision, scoped export and redacted server errors.

Final checks for this checkpoint: all 172 source tests and 19 exported-reference checks passed. These include a simulated data service and human-review declarations; they do not establish a real browser, Docker or live-model acceptance pass.


## Operator guide walkthrough and screenshots (2026-10-31)

Added a use-case/actor/outcome table, a four-step inspect/prepare/review/package walkthrough and three actual in-app browser captures using the fictional alpha fixture. Workspace capture used a temporary in-memory service; the file-listing image is an explicitly labelled documentation viewer of actual proposal/release output. No credentials or private capability URLs are shown. Images and capture context are under assets/operator and included in offline/help exports.

The browser capture exposed blocked JavaScript form submission in preview frames. Frames now allow forms while retaining an opaque sandbox, CSP form-action none, no connections and in-memory storage. The actual operator-generated preview was observed saving a fictional situation and navigating to Next move after the fix. This is a narrow browser observation, not a completed human/operator, Neo4j, Docker or live-model acceptance pass.


## Thin Research Operator skill and shared service (2026-10-31)

Added a repository-scoped .agents/skills/research-operator/SKILL.md that routes the operator use cases to the existing guide and command. It includes no scripts, copied reference documents or MCP server. User/global Codex configuration and credentials are unchanged. Open the startup-tarot or prepared reference project to discover the skill. Metadata validation passed using the skill-creator validator; automatic invocation in a fresh operator session is not claimed as tested.

Moved reusable data/proposal operations to enterprise/operator-service.mjs. The CLI retains its arguments/results and compatibility prepare/package exports, while file loading/argument parsing/output remain in the adapter. Service/CLI parity, explicit expected revisions, redaction, proposal hash binding and false-by-default approval are exercised by operator tests. The existing launcher and browser release engine are reused. The packaging fingerprint now identifies the shared service rather than CLI presentation code; older proposal receipts need a fresh preparation/review after this refactor.

The operator guide remains the single procedure reference. MCP stays deferred until structured tool discovery has a demonstrated need. Human browser, real Docker and live-model acceptance remain separate pending checkpoints.

## Human fictional operator rehearsal — partial results (2026-10-31)

The operator explicitly invoked the repository skill, reported reviewing all five preview tabs and the proposal summary, and approved the exact proposal for a local ZIP for internal fictional testing only. Package integrity checks passed. No external distribution was authorized or performed. This confirms explicit invocation in this conversation, not automatic skill discovery in a fresh project session.

Release: research_release 0.1.0; source local_operator/local_file, enterprise/fixtures/alpha.json (4 investor profiles, 1 startup snapshot, 11 relationship edges). Source SHA-256: de85966af698a5bbcca59206889dce13f0984d4a32d77a0a573133353728ea8e. ZIP SHA-256: ffce4364fb660fdc5db444bc000253f67a029c71c66af96c97f2bddb3f18767e. The local manifest and review record remain with the ignored proposal artifacts.

The operator extracted the ZIP and opened the recipient app from a local file on Windows. Supplied screenshots confirm the release/audience notice, fictional labels, investor-fit input form, investor profile/source detail dialog and Relationship research page render. The profile dialog explicitly identifies invented criteria. Screenshots show forms before submitting queries; they do not establish correct matching or graph results. Browser/version and exact execution time/timezone were not recorded; the heading is the documentation checkpoint date.

Pending: submit Compare investor criteria, Find evidence paths and Analyze included network and inspect their results; verify saved inputs after refresh; repeat matching/graph checks offline with the helper stopped; complete the remaining keyboard, narrow-window and Publisher-specific checklist. No live LLM, real Neo4j/Docker or complete human acceptance pass is claimed. See publisher/README.md for the canonical checklist.

## OpenFor demo correction (2026-10-31)

Follow-up screenshots showed all four alpha profiles excluded, even with sector empty. This is the deliberate fictional-profile policy, not a sector mismatch. The initial alpha-only matching walkthrough was unsuitable for the intended OpenFor presentation. Investor fit now displays each excluded profile and its explanation, plus guidance to use a research collection when none qualify. Fictional profiles remain excluded; no invented investor evidence was promoted into research.

Prepared a fresh unapproved OpenFor research proposal with the building_ai fictional preview scenario. Proposed audience is a private presentation to OpenFor operators and invited reviewers; no wider sharing is authorized. The prior alpha approval does not apply. The source retains two investor profiles, three current observations, two historical snapshots and six evidence edges. Rich fictional topology remains a separate alpha demonstration. enterprise/PUBLISHER.md now contains the audience-specific walkthrough and distinguishes preview scenario inputs from recipient data.

Automated verification: 175 source tests passed, including a new simulated-DOM regression for explicit fictional exclusions. Direct assessment dated 2026-10-31 with invented hardware/pre-seed/Japan/USD 150,000 inputs returns four-field alignment for Monozukuri Ventures and insufficient evidence for Geek Ventures. These are criterion comparisons, not eligibility or funding promises. No fresh web source verification, OpenFor release approval, packaging or human pass on the corrected preview is claimed.


## Human testing deferred at operator request (2026-10-31)

The operator requested skipping the remaining human tests and returning later. Human acceptance is deferred, not passed; no additional release approval or distribution is implied. Preserve the partial fictional rehearsal and OpenFor observations above.

Latest supplied OpenFor preview screenshots show two assessed investor profiles: Monozukuri Ventures with four-field alignment and Geek Ventures with insufficient evidence. The Monozukuri profile/source dialog renders, and the historical relationship form is reachable. The compact preview notice is visible. No path result was supplied.

Resume at enterprise/PUBLISHER.md, OpenFor demonstration walkthrough step 4: submit Find evidence paths for Y Combinator (2017 government reference) to Airbnb user visits (documented historical activity), maximum 4 links, with both checkboxes unchecked and historical cutoff blank, then inspect the result below the form. Network results, extracted-package persistence/offline checks, keyboard/narrow-window checks and remaining Publisher acceptance remain unverified. OpenFor proposal approval and packaging remain pending. Real Neo4j/Docker and live-model acceptance remain separate outstanding checks.


## Codex synthetic private-data workflow rehearsal (2026-10-31)

Executed tests/operator-rehearsal.test.mjs and documented the repeatable steps in enterprise/OPERATOR.md. No default Workspace was responding. The rehearsal therefore used the actual authenticated reference HTTP server and real operator command adapter on a temporary loopback port with an explicitly in-memory test store. It did not connect to Neo4j or access actual OpenFor private data. Synthetic alpha records supplied realistic structure, not real investor matching evidence.

All eight rehearsal checkpoints passed: validate counts/warnings; first import; inspect; correct a record with a new revision and reject a stale write while retaining the original; deny cross-organization export and researcher import/export and organization-body overrides; export the exact corrected revision without credentials or a separately scoped owner-data sentinel; reject credential-bearing input; prepare a proposal and reject packaging without genuine preview review/approval. The owner sentinel tests storage-scope separation, not a validated private-contact import. Server closed and saved test connection credential redacted after execution.

The first successful report is .local/operator-rehearsal/run-Pafg6x/results.json. Later test runs create separate reports and proposals. Reports identify the storage simulation and pending checks. There was no release approval, archive generation, external sharing, real Neo4j persistence/native-query verification, browser acceptance or live LLM call in this rehearsal. Human testing remains deferred. Packaging after approval remains a separate checkpoint; existing packaging tests exercise the engine with fictional test review declarations.


## Codex-only Research Workspace milestone (2026-10-31)

Workspace now has one operator use case: maintain authorized investor/startup research data through Codex. The server no longer serves browser admin HTML/JS/CSS; root returns concise API/Codex instructions. Operator start defaults to no browser opening; direct legacy launcher calls remain compatible. Browser Publisher and backend research/publishing APIs remain separate and unchanged. Old UI source is retained only for compatibility tests, including in reference exports.

The operator guide now documents selected raw local file mapping, evidence/unknown handling, private/shared boundaries, revision-protected import, exact export verification and recovery as a new revision. The thin skill links this workflow; no universal importer or MCP was introduced. The repeatable synthetic rehearsal now also verifies retired UI routes and recovery while preserving intervening revisions. All 176 source tests passed after runtime changes. Real OpenFor raw-data conversion and real Neo4j durability remain pending adoption checks; human recipient/browser review remains deferred. No new actual-data approval or distribution occurred.


## Repeatable OpenFor demo rehearsal (2026-10-31)

Extracted the existing real-HTTP rehearsal into tools/rehearse-openfor.mjs; the test now calls the same function. Added a labelled synthetic raw JSON input with five investor rows including an exact duplicate, a startup observation, missing dates, conflicting stage notes, an unconfirmed introduction, a private note and a correction. A fixed demo adapter maps selected names/notes onto the fictional alpha contracts, logs omissions and retains the separate invented fixture topology. It is not a general raw importer or actual OpenFor data conversion. Omitted raw metrics, conflict assertions and relationship guesses do not become canonical facts.

First command run: .local/operator-rehearsal/run-H5PMWC/results.md, ten passed checkpoints, mapping.json and a fresh unapproved proposal. The shared dataset export excludes the mock private-note marker and owner sentinel. Repeated runs use fresh folders/ephemeral credentials and close their loopback server. No browser, live database, external model, real private data, release approval or delivery occurred. These are repeatable demo checks; actual private-data readiness belongs to a post-demo pilot after OpenFor agrees to try. The operator guide includes the command, prerequisites, artifact interpretation and presentation sequence.


## Codex-guided OpenFor pilot prepared (2026-10-31)

Added the next milestone and six operator-guide checkpoints: participation/scope, live setup, mapped baseline, exact import/export, correction/recovery, and actual durability plus operator usefulness. Included a reusable Codex start prompt and a minimal ignored local outcome-record format. Corrected a stale launcher instruction that referred to signing into the retired browser administration page.

Status is prepared, not started. No actual OpenFor operator/files/permissions were supplied and no real-data import, live service restart or new release approval occurred. Demo readiness remains separate and is not blocked by pilot access. Synthetic rehearsal results remain synthetic; all live pilot checkpoints require actual evidence after OpenFor agrees. Publisher preparation/approval and delivery are outside this maintenance milestone.


## Live-storage demo/pilot transition (2026-10-31)

Updated the existing skill and operator guide: use one maintenance sequence and live infrastructure, separate demo/pilot organizations, retain synthetic template records, and build the pilot from authorized inputs rather than inherited invented facts. The rehearsal CLI now requires explicit database configuration and an openfor_demo_* namespace, checks live readiness and has no simulation fallback. Repeated demo runs retain prior revisions. In-memory service injection remains for automated tests only.

Attempted the live command with the existing local Neo4j test configuration and openfor_demo_private. Readiness failed; no simulated fallback or successful live run is claimed. The updated in-memory ten-checkpoint test passed, labelled automated-test in its report. Actual live demonstration verification remains pending database availability. No pilot organization was seeded, real data imported, credential shared or package approved/distributed.


## Live private demonstration verified (2026-10-31 client checkpoint)

The Research Operator workflow located the existing portable Neo4j 2026.10.1 and JDK in ignored .local/enterprise-runtime. Its configured loopback HTTP port is 17474 (Bolt 17687), not the default 7474. The selected ignored neo4j-test.json originally contained only the existing password; added its matching URL without replacing the password. Started the existing database through its vendor console command; no installation, password reset, data deletion or configuration of public listening was performed.

Two full synthetic demonstrations passed on live Neo4j in openfor_demo_private: .local/operator-rehearsal/run-ZaOmWf/results.json and run-kkn49p/results.json, each with ten passed checkpoints. The second run safely reused the demo organization using new revisions. The ephemeral API servers closed after each run; database revisions remain. No pilot organization or actual OpenFor private data was used. Publisher proposals remain unapproved and no archive was distributed.

Additional live evidence: all nine checks in enterprise/tests/neo4j.integration.mjs passed against isolated fictional test namespaces, including native path/projection parity, organization/owner separation, concurrent-write protection and HTTP research packets. Separately saved the demo revision/hash, stopped the owned database console, confirmed no Java/listener remained, restarted the same database and compared the persisted revision and payload SHA-256: both matched. Evidence is .local/operator-rehearsal/live-durability.json and live-neo4j-checks.log. Runtime logs use UTC and may show the following calendar day relative to the client checkpoint date.

The database was left running on loopback for subsequent local work. This verifies the live synthetic demo, not real OpenFor permissions/data quality, human recipient usability or live LLM behavior. Those remain distinct. The earlier unavailability checkpoint is superseded for this local configuration by the successful live runs.


## Presentation rehearsal and cleanup (2026-10-31 client checkpoint)

The live command now generates presentation.md with run-specific links, a five-minute sequence, expected outcomes and a short deferred browser smoke checklist. It prepares a separate OpenFor-context building_ai preview and founder-fit.json. Fixed-date (2026-10-31) comparisons verify Monozukuri strong four-field alignment and Geek insufficient evidence; they are not a fresh source review, funding promise, or the synthetic maintenance dataset. Both proposals remain unapproved. Live run .local/operator-rehearsal/run-W2ap8f passed ten maintenance checkpoints plus the sourced comparison assertions.

Cleanup: the guide marks its old Workspace browser screenshot historical/retired, names the short packaging walkthrough as Publisher handoff, removes duplicated rehearsal/presentation tables in favor of generated run links, and corrects the README's stale implication that live database verification is still pending. Preserved prior artifacts and source compatibility inputs; no bulk deletion, credential change, publication or real-data import. Browser interaction testing remains deferred; expected-results JSON and existing screenshots do not constitute a new browser pass.


## Codex setup panel checkpoint (2026-10-31 client date)

Implemented operator setup, setup-panel.mjs and three native HTML/CSS/JS files. Reuses launcher start/stop and authenticated readiness probes; has no data admin, credential forms, OpenUI dependency or MCP server. Supported host presentation is Codex's built-in browser panel; it is not technically restricted to Codex browsers. The local bridge uses a random session path, strict Host and same-origin/custom-header POST checks, bounded fixed actions, busy serialization, no-store and redacted failures. No external network dependency is added.

Three focused tests passed for missing/ready status, typed action boundaries, cross-origin denial, invalid/bounded inputs, concurrency and redaction. Real Codex in-app browser observation: Node/config/database ready, Workspace initially absent; Start services changed all four checks to Ready; Stop owned services returned Workspace to absent while external Neo4j stayed Ready. Screenshot .local/operator-rehearsal/setup-panel-ready.png captures the ready state without credentials. Prepared ignored local external launcher config using the already selected 17474 database/password file and existing access hashes; no credentials overwritten.

Panel process remains available for the displayed page. After verifying stop, started Workspace again through the panel and confirmed all four checks Ready; external Neo4j remains running. Full setup on a separate clean machine, real Docker startup and installations remain pending. This narrow setup UI browser test does not complete founder/browser acceptance or authorize distribution.

Final setup-panel verification: all 181 source tests and seven exported-package panel/operator checks passed. A fresh extracted reference correctly reports missing local configuration without bundled credentials. The in-app panel was left open and Ready.


## Demo branch publication preparation (2026-10-31 client checkpoint)

Prepared codex/openfor-demo and OPENFOR_DEMO.md with guided setup, prerequisites, live synthetic rehearsal, pilot boundary and remaining checks. Bulk dataset/ collections are ignored and excluded, along with existing local credentials, databases, generated Publisher files and run artifacts. Common credential-pattern scan found no matches in the candidate source. CI now builds ignored Publisher assets before operator tests so a fresh checkout has the required template.

A clean tree reconstructed from staged files, with no local runtime/configuration copied, built Publisher assets and passed all 181 source tests. This verifies source completeness and generated-asset preparation, not full prerequisite installation or deployment on another machine. Whitespace cleanup normalized the launcher batch file and removed trailing blank lines in retained compatibility source. No baseline/main deployment or real-data distribution is authorized by this branch publication.


## Supplied second-lab evidence and next browser pass (2026-11-01)

Reviewed user-supplied result.md, results.json, restart-verification.json and presentation.md from the second lab machine. Reported environment: macOS 27.0.1 arm64, Node 24.22.2, Neo4j Community 2026.10.1, Temurin 25.0.5+8; fresh checkout of codex/openfor-demo at 5ccb59cc8cc3e02894214ca011a1dc3a724a6b0a. Git/download tools/Homebrew existed; Node/Docker/usable Java were absent. Assisted setup used portable runtimes and external loopback Neo4j; no tracked application changes reported.

Generated results record ten PASS checkpoints. Separate restart evidence checked_at 2026-11-01T09:38:59.390Z records identical before/after current revision, four revision/hash pairs and 48 stored graph nodes. Those 48 nodes span stored revisions, not 48 unique current business entities. The original not_tested restart entry predates that evidence; restart durability is subsequently supported, while native query parity remains untested on this second machine. This is supplied lab evidence, not an independently rerun verification on that host.

Setup deviations: corrected an unspecified unsupported fleet-management setting; replaced a generated password exposed during a failed initialization before successful initialization; used elevated local execution permissions. Guides now document version-aware configuration diagnosis, private capture/redaction of initialization output and narrow host permission handling. No exact offending setting was supplied, and no generic installer code fix is claimed.

Added a second-lab browser/presentation checklist: sourced preview interactions and evidence, historical path/network results, normal unsandboxed app persistence/offline checks, keyboard/narrow layout and six presentation links. Source-preview memory deliberately resets; no unapproved sourced ZIP is required to claim the normal app check. Browser/recipient ZIP acceptance, live LLM and actual OpenFor data remain pending. No second-machine instructions were sent automatically, no approval declaration changed, and no supplied local paths/credentials were copied into the branch.


## Founder preview and network wording polish (2026-11-01)

Visually reviewed all fifteen copied second-lab screenshots and related text captures. They support the report's investor alignment/unknowns, evidence dialogs, historical path, empty/source-limited network, normal app comparison/network and narrow-layout observations. Persistence and backend-off claims rely on the reported action sequence plus supporting captures, not a still screenshot alone. Offline, approval-dependent recipient ZIP and independent human acceptance remain pending. Copied lab evidence stays ignored/local rather than being published wholesale.

Preview-only initialization injects a temporary-session marker. Initial and subsequent successful footer status messages identify temporary memory; the preview profile hint no longer claims browser persistence. Normal recipient app persistence wording remains unchanged. Network output now uses readable projection labels, included-evidence counts, coverage scope, omission explanations and a specific empty-state explanation. The underlying graph analysis and downloadable JSON retain their existing structure.

Focused checks: twenty tests passed, including new regressions for preview load/save versus normal-app persistence wording, readable nonempty/empty network summaries and unchanged structured exports. These are automated checks, not a new lab browser run. Rebuild Publisher assets and prepare fresh proposals after updating; old previews are static and prior receipts are invalidated by the changed preview engine.


## Four-tab founder navigation (2026-11-01)

Moved Research from the footer to a compact header action; Situation, Next move, Investor and Startup remain in the footer. Contextual research, history, optional helper connection and the existing workspace/storage are unchanged. Header active state uses the same navigation handler; it makes no automatic model request. Four-column footer and a wrapping small-screen header retain the pack-kind label.

Updated current guides/checklists and generated proposal review wording to describe four footer tabs plus header Research. Earlier lab screenshots remain historical evidence of the five-footer-tab layout. Added a simulated-DOM regression for footer/header structure, opening Research and returning through contextual actions without model calls; focused operator/UI tests passed (21). In the real Codex in-app browser, header Research opened the existing workspace and footer Investor returned correctly; 390px screenshot .local/operator-rehearsal/four-tab-navigation.png verifies the revised layout. This narrow navigation check does not complete offline/ZIP acceptance. Prepare fresh proposals after rebuilding; no data migration, approval or distribution occurred.


## Founder primary-action hierarchy (2026-11-01)

Situation and plan-step primary actions are retained; Investor now emphasizes Explore investor fit rather than selecting an experiment perspective, while Startup emphasizes comparison with the founder situation. Supporting sources, perspective choice and research/relationship actions remain visible in labelled wrapping groups. The experiment evidence/research group remains outside the step-specific card so plan/learning views can still reach contextual research. Fit results place their prominent shortlist action before grouped evidence. No matching, storage, relationship or research request contract changed.

Automated UI checks cover the primary fit action, save/evidence behavior and retained perspective/research controls alongside existing contextual and plan-history checks. Browser layout verification and final test results are recorded separately; this change does not grant distribution approval or complete offline/ZIP acceptance.

Action-hierarchy browser follow-up: at 390px, Investor shows one prominent Explore investor fit action and wrapped secondary groups. Clicking it opens the prefilled fit form. Startup comparison opens Research with its snapshot context and comparison question retained. Screenshots are .local/operator-rehearsal/primary-investor.png and primary-startup.png. Temporary browser viewport was reset; no model request or data approval occurred.
