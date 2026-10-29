# App development

Using the prepared app requires no development runtime. Open index.html directly. Only use trusted packs/active-pack.js files: they are local browser scripts.

## Build and verify

~~~sh
node tools/build-demo.mjs
node --test tests/*.test.mjs
node --check js/app.bundle.js
node --check packs/active-pack.js
node --check sw.js
node tools/export-release.mjs
~~~

No package installation is required. The build validates packs/guide-pack.json and writes its browser wrapper, bundles JavaScript, and refreshes styled help and cache versions. A manual active-pack.js replacement is independent of the app bundle; the next build regenerates it from the JSON. The export allowlist excludes browser state, private files and Git metadata.

## Update the included pack

Author and review complete packs in [Guide Pack Kit](https://github.com/hmc62843u/guide-pack-kit). For a development release, copy the reviewed JSON and required notices into packs/ together, update packs/README.md, then rebuild and test. The manual local-file workflow needs only the trusted browser wrapper and notices, followed by refresh. Never append invented connections to research data.

## Extension points and contracts

| Module | Responsibility |
| --- | --- |
| js/research-library.js, js/validator.js | Data validation and v2 adapter; no truth or rights certification |
| js/context.js | Known stage/sector comparisons and context identity |
| js/matching.js | Candidate eligibility and complete/partial source connections |
| js/tasks.js | Accepted adaptations, saved learning and review rules |
| js/recommendation.js, js/explanations.js | Priority and explanations |
| js/evaluation.js | Provider-authored candidate self-tests |
| js/analyzer.js | Domain orchestration and compatibility facade |
| js/lean.js | Configured-pack workspace migration and four-screen view model |
| js/app.js | Four-screen DOM, paging, plan/learning steps and source dialog |
| js/storage.js | Existing browser storage key |

Domain modules do not read the DOM or browser storage. The configured pack owns a provider/library/version workspace. Saving archives previous active work and keeps existing optional startup/plan fields. A newer UI does not change matching operators or invent investor topics. Reference-only records cannot be selected; unconnected records remain explicitly browsing-only.

The retired ui.js renderer and its renderer-only tests have been removed. The old comparison/filter/import interface is absent. Core matching and validation regression tests remain; the old interface-specific tests have been replaced by lean workspace tests. Test real Chrome separately for layout, four support states, explicit save/reload, lens changes, keyboard/dialog behavior and offline use.

## Layout and accessibility

At 320 × 480 and default text size, Situation, the current move, one investor, one snapshot and the compact plan/learning steps fit without page scrolling. Full sources, arbitrary long community content, enlarged text and a virtual keyboard may need scrolling. Never hide overflow to enforce a fixed height. Native dialogs support Escape and restore focus; unsaved edits prompt before leaving. Save failures remain visible.

## Documentation and deployment

GUIDE.md and the fictional EXAMPLES.md are rendered to static docs/ pages. These generated pages keep local help/source links available on file URLs and offline. Pack methodology, authoring and format documentation live in Guide Pack Kit. Runtime schemas remain in data/.

Publish prepared static files; no server runtime is required. HTTPS hosting enables the service worker. Development builds regenerate its cache version. Publishing and GitHub Pages configuration are separate actions. Keep private source archives outside this folder; gitignore is not a web-server access control.
