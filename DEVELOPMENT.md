# Development and publishing

These instructions are for contributors to startup-guide. Using the prepared app and importing research require no Node or Python.

## Styled documentation

App links open styled, static HTML pages: [guide and methodology](docs/guide.html#methodology),
[research-library guide](docs/guide-packs.html), [data-license notice](docs/data-license.html)
and [MIT license](docs/license.html). They share the app stylesheet and work on direct-file
URLs and offline PWA hosting. GUIDE.md is the editable source for docs/guide.html. Original Markdown and license files remain the editable
sources and are rendered normally by GitHub. Run the existing build command after
changing them; generated HTML is refreshed automatically. Source-file links are
explicitly labeled, while JSON schemas, templates and code remain developer files.

## Run locally

Open [index.html](index.html) in a modern browser. The generated classic JavaScript entry embeds the validated included research pack and separate fictional libraries, so direct-file use requires no server or installation.

For development and PWA offline support:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open [localhost](http://127.0.0.1:8000/). Remote PWA hosting requires HTTPS. The interface uses warm paper surfaces, sketch accents and readable controls. Focus indicators, labeled states and reduced-motion support remain available.

## Publish the app

Node and Python are not required to upload the prepared files to a GitHub
repository or to use the hosted app. The generated browser entry and documentation
are included. Node is a development/checking tool; Python is an optional local
preview server. There are no third-party runtime packages to install.

Publish this app directory as its own repository, keeping the research repository
and private archive outside it. Commit the source, included research with its separate notices, fictional records, generated
browser entry, styled documentation, licenses and configuration. The generated
release/ folders are local exports and are ignored by Git; do not upload the whole
parent backup directory. Browser notes and imported research are not project files.

For a GitHub Pages site, configure branch deployment from main and the repository
root after the files are committed and pushed. The included .nojekyll file keeps
the prepared static files from being processed as a Jekyll site. No app build
command, Node server or Python server is needed on the hosting side. See
[GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

The App checks workflow runs the dependency-free Node test suite, syntax checks,
and a rebuild comparison on GitHub. It checks changes but does not publish the
site or modify repository settings. Line endings are normalized for repeatable
Windows/Linux builds. Rebuild and commit generated files when editing the source
or documentation. Local checks do not mean the workflow has already run on GitHub.

Before public release, manually check the current layout and controls on target
browsers and small screens. Automated tests exercise a simulated DOM and do not
establish visual layout correctness. Source/data checks do not certify third-party
reuse rights. This app ships an included research pack under its separate notices and an optional fictional demo; the authoring workspace
remains subject to its own review and publication decision.

## Contributing examples

1. Copy a maintained [fictional profile](profiles/demo_workshop.json) or start with the draft [blank template](templates/blank_investor.json). Follow [data/schema.json](data/schema.json) and [js/validator.js](js/validator.js).
2. Write an original scenario. Do not rename a real profile or lightly edit copied prose and call it fiction. Label the name and metadata explicitly fictional.
3. Describe the scenario in EXAMPLES.md with a unique local anchor. Keep source links local and use real authoring dates; do not invent external citations.
4. Use distinct stable IDs. Register every profile or snapshot in the corresponding index. Unregistered library files fail the public build.
5. Keep stage and sector tags explicit, unknown facts null, and metrics tied to scenario references and dates. Weights total 1.00 and do not act as requirements.
6. Lessons must specify supported contexts, known fields, references, an existing target task, interpretation and limitations. Preserve the same meaning when sharing a lesson ID.
7. Run the checks below. Review every contribution for originality and appropriate reuse rights; metadata alone does not establish rights.

Real-world records need a separate research-library review with source-by-source checks for access terms, copyright, database rights where applicable, permissions and notices. Public availability, attribution, masking names and local use do not by themselves establish redistribution rights. See the [US Copyright Office guidance](https://www.copyright.gov/fair-use/). No project license grants third-party rights. The included research download retains its separate editorial licence, source-specific terms and limitations.

## Build, test and export

Edit source modules and JSON, then rebuild the generated entry:

```sh
node tools/build-demo.mjs
node --test tests/*.test.mjs
node --check js/app.bundle.js
node --check sw.js
node tools/export-release.mjs
```

The bundler enforces [release-policy.mjs](tools/release-policy.mjs), which rejects non-fictional records, external scenario sources, invalid specification anchors and unregistered library files. Fictional-library loading rejects non-fictional records. The build validates the included research Guide Pack before embedding it as the fresh-workspace default. Custom imports require explicit activation. These are composition checks, not legal clearance.

The generated classic entry embeds the validated included research pack and registered fictional examples for file use. Served mode loads the same fictional JSON files. Build hashes refresh script, stylesheet and offline cache versions. The service worker precaches the specifications and license notices too.

The export command creates a fresh folder under `release/` from allowed source directories and public files, including code, tests, build tools, examples and licenses. It does not copy browser state, private archives, git metadata or arbitrary project-root files. Inspect the output before deployment. Nothing is automatically uploaded or published.

Regression tests cover navigation in file and HTTP modes, unknowns, comparison filters/groups, explicit lens selection, progress persistence, experiment checkpoints, fictional provenance and release rejection rules. They use a simulated DOM; they do not establish live browser layout correctness. Manually check all tabs, expandable filters, narrow-screen tables, source links, saving/reloading and offline behavior before release.

## Project structure

```text
index.html / EXAMPLES.md    App shell and fictional specifications
css/                         Field notebook styles
js/                          Editable source and generated classic bundle
data/                        Indexes and investor schema
profiles/ / startups/        Original fictional demo records only
README.md                    Quick start, research default and optional demos
GUIDE.md                     Visual walkthrough and methodology overview
REFERENCE.md                 Detailed matching rules and app behavior
DEVELOPMENT.md               Developer workflow and publishing
assets/                      Workflow diagrams and README research recording
packs/                       Guide Pack downloads, canonical format and separate notices
GUIDE_PACKS.md         Optional local research import format and behavior
templates/                   Fictional authoring examples
tools/                       Build, release policy and allowlisted export
tests/                       Workflow, data and release checks
icons/ / manifest.json       PWA assets
sw.js                        Offline caching
LICENSE / DATA_LICENSE.md    Software license and demo-data scope
```

Maintained by Andrew Leung and contributors.

## Compatibility names

The JSON contract, provider/library IDs, browser storage keys and existing parser/module names remain compatible. Some internal names still say research; those are implementation details. Package filenames do not determine whether v1/v2 JSON imports. Use Guide Pack terminology for new user-facing instructions.

## Extension points and contracts

Improve pack content in the companion Guide Pack Kit; its `CONTRIBUTING.md` maps research, matching and suggestion goals to authoring stages. Improve app behavior here. The pack schema, existing analyzer exports, stable IDs and workspace keys remain compatible.

| Module | Responsibility | Inputs → outputs |
| --- | --- | --- |
| `js/research-library.js`, `js/validator.js` | Validate and adapt pack data | Pack JSON → errors or internal profile/snapshot records. Validation does not establish factual accuracy. |
| `js/context.js` | Context identity, stage/sector compatibility and comparison filters | Startup/profile records → compatibility questions, comparisons and evidence key. |
| `js/matching.js` | Candidate eligibility and evidence merging | Startup + eligible profiles + snapshots → connected candidates. A separate wrapper applies saved choices. |
| `js/tasks.js` | Task generation, accepted adaptations and progress validity | Context + selected profiles + accepted suggestions + records → tasks and progress. |
| `js/recommendation.js` | Home prioritization | Prepared tasks + candidates + focus → selected move. |
| `js/explanations.js` | Action and context explanations | Selected move + library/lens context → readable action, provenance and situation labels. |
| `js/evaluation.js` | Provider-authored matching self-tests | Cases + profiles + snapshots → expected/actual ID sets, agreement and coverage. |
| `js/analyzer.js` | Workspace orchestration and compatibility facade | Existing workspace inputs → existing view model consumed by the app. |
| `js/ui.js` | DOM presentation and interactions | View model → interface. Keep eligibility and prioritization in their owning modules. |

### Candidate matching

`matchHistoricalCandidates(startup, profiles, snapshots)` returns candidate objects with `id`, `title`, `targetTaskId`, `basis`, `reason`, `learningQuestion`, `relevance`, `caution`, `sources`, `interpretations` and `evidenceKey`. IDs retain the internal `historical:` prefix. The function does not read storage or the DOM, mutate input records, apply saved decisions or choose Home priority. Inputs are validated internal records; project v2 packs through `researchRecords` first. Callers supply the selected lens, or comparable profiles for an explicitly unselected-lens preview.

`buildHistoricalSuggestions(..., decisions)` applies existing accept/dismiss decisions after candidate matching; changed context/evidence resets them to pending. Provider evaluations call the candidate function directly, independently of progress and Home ranking. `connectionGapReason` diagnoses absent connections using shared context/compatibility predicates; explanations distinguish missing topics, missing rules, unknown context and unconfirmed sector fit. It never creates a candidate or changes the pack.

### Prioritization and explanations

`selectNextMove(tasks, suggestions, libraryPreview, validationFocus)` returns `{next, candidate, pending}` without mutating inputs. Tasks must already have progress and source arrays. Suggestions carry decision state; preview entries must already be filtered to pending. The preserved priority is ongoing sourced work, accepted adaptations, other sourced work, ongoing generic work, the selected learning focus, then fallback work. Completed tasks are skipped. An ongoing sourced task takes precedence over a new candidate.

In `explanations.js`, `describeNextAction` turns that result and library/lens context into existing action labels, reasons and provenance text. `describeSituation` supplies readable context labels. Home preview and connected states are carried in the action view model as heading and connectionNote; changing wording does not change candidate eligibility. `ui.js` renders these outputs; browser persistence stays in `storage.js` and app orchestration.

### Make and assess a change

1. Identify whether the fault is research content, rule conditions, candidate eligibility, prioritization or explanation. Change the smallest responsible extension point.
2. For engine changes, establish supported matches, nonmatches and unknown-context expectations. For ranking changes, include conflicting candidates and ongoing/completed work. For explanation changes, check research/fictional/fallback labels and inspect the live interface.
3. Run the build and test commands above. `tests/extensions.test.mjs` exercises the separate candidate, decision, priority, presentation and evaluation boundaries; existing workflow tests protect imports and persistence.
4. New rule operators require an explicit app implementation, format/schema updates, validation, evaluation cases and compatibility documentation. Imported packs remain declarative; do not add dynamic evaluation or provider callbacks.

The dependency order is context → tasks/matching → evaluation/recommendation/explanations → workspace → UI/app. Storage and DOM are excluded from the domain modules. The classic build includes these modules in dependency order; add new public source files to both the bundler and release allowlist. Existing consumers may continue importing the compatibility API from `analyzer.js`. No executable plugin system or new runtime dependency is introduced.

The plan renderer keeps task identity and progress separate from layout. Untouched optional tasks render in Other exercises; plans and saved work render first. openTaskEditor expands the containing section, opens the task and restores editor/save focus. Supporting evidence remains in Why this plan? after the form. Reviewed examples retain decision controls and provide a separate Edit plan route. None of these UI states changes imported facts or workspace keys.

Saved experiment fields belong to workspace records, independently of current task.experimentPlan. The latter is an active-library adaptation template, not the user's sole plan store. UI editors support both saved plans and blank optional-exercise plans. Progress records retain taskKey and startupKey and add basisLensKey plus planTitle on new saves. Legacy records remain compatible; a lens transition stamps missing lens metadata only when the saved startup and evidence basis still match the observed old lens. Review reasons distinguish context, lens, connection and checkpoint changes. Saved experiments retain reported status across connection-only changes; context or checkpoint issues still reopen them. No pack format or provider workspace identity changes.

## Research default and partial support

New browser workspaces use the included Research Guide Pack; saved library selections are preserved. Settings → Try demo scenarios switches to a separate fictional workspace. Use included research restores the bundled pack. Fictional scenario controls never add invented claims to research records.

| Evidence available | Behavior |
| --- | --- |
| Investor topic and compatible startup lesson on the same topic | Connected suggestion, subject to context rules. |
| Relevant investor topic only | Show the source-linked interest separately; any exercise is general. |
| Compatible startup lesson only | Startup-only suggestion with snapshot sources and no investor alignment; users can adapt it. |
| Neither | General exercise. |

The complete matcher and provider self-tests still require both sides. Startup-only candidates use separate snapshot-prefixed decision IDs and retain their evidence; they are not complete connections. Raw snapshots without an authored context rule remain browseable, not automatically relevant suggestions. Investor-only relevance uses an explicit app topic map: demand/customer problems → customer_learning, operations → operations, technical feasibility → technical_feasibility. Unknown topics are not inferred. Other custom topics can still form complete connections when a matching rule exists.
