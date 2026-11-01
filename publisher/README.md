# Research Publisher

This is the optional visual operator interface. The primary Codex-assisted pilot workflow uses enterprise/operator.mjs and enterprise/OPERATOR.md; both paths share this Publisher release engine.

Open index.html in a modern browser. Keep this folder's five files together. No Node, Neo4j, account or network connection is needed while using Publisher. Its prebuilt template is included. Web Crypto is required; locally opened files or HTTPS hosting are supported.

## Three steps

1. **Choose data.** Open a Research Workspace export, a complete bundle, or separate Guide Pack and relationship files. The two demo buttons provide a sourced OpenFor sample and a clearly fictional template. Inspect Sources and checks.
2. **Preview.** Choose an empty founder situation or a labelled illustrative journey, then open the Founder Workspace preview. Test Situation, Next move, Investor, Startup and Research. Work stays in temporary memory; helper/model/backend access is disabled. Mark this exact preview reviewed.
3. **Download.** Supply release identity, audience, reviewer, scope, updates and attribution. Review privacy, rights and approval declarations. Build and download ZIP. Extract the whole ZIP and open browser-package/index.html. Nothing is uploaded or published.

The public OpenFor context does not make the fictional scenario numbers true. Scenarios are a separate labelled download, excluded from the research release. Unknown canonical fields remain unknown. Use scenarios only with compatible OpenFor research data.

## Boundaries

Research Workspace is the optional server-backed application for shared imports, revisions, permissions and Neo4j queries. Export its selected revision to Publisher. Publisher also accepts independently prepared local files, so Workspace does not need to be running. Local-file imports are labelled local_operator/local_file; a Workspace export retains its declared organization/revision. Source labels are not an authenticated proof of origin.

Publisher uses memory only and makes no network requests. It has no shared user roles, centralized approvals or audit history. Local review declarations are operator statements. Imported text still needs review for confidential information and actual distribution rights; detecting reserved field names cannot detect every confidential sentence.

Preview runs in an opaque sandbox with in-memory storage, no service worker and no live LLM connection. Changing data or scenario closes it and invalidates the review. Preview data/notes do not enter the ZIP. The recipient Founder Workspace normally saves its own work in the recipient browser and may use a separately run LLM helper.

Browser-built ZIPs contain browser-package/, data-bundle/ and browser-files.json. Their manifest kind is startup_tarot_browser_distribution and source method is browser-local-files. Node CLI distributions keep their existing manifest format; the Node --verify command does not validate this new format. Files are hashed using SHA-256 and the ZIP uses standard uncompressed ZIP32. Bundle checks validate structure and references, not truth. A local ZIP cannot enforce recipient access, synchronize corrections or revoke copies.

## Human browser acceptance

Status: remaining human tests deferred at the operator’s request (2026-10-31), not passed. Resume the OpenFor walkthrough at enterprise/PUBLISHER.md step 4; observations are preserved in enterprise/ACCEPTANCE.md. Partial fictional operator rehearsal recorded there. The extracted recipient app renders the investor-fit form, profile/source details and relationship controls with fictional/release notices. Matching/graph query results, refresh persistence, offline behavior and the remaining Publisher checks are pending. Automated checks are not a substitute for actual browser acceptance.

- With Node, Neo4j and helper stopped, open Publisher locally and load a demo or exported source file.
- Check counts, source links, unknown warnings and the distinction between real context and hypothetical inputs.
- Launch preview, visit all five tabs, edit/save a plan and close/reopen it. Check that preview work disappears and source data is unchanged.
- Change source/scenario and confirm the previous preview/review is invalidated. Attempt an unreviewed release and confirm it is rejected.
- Complete a genuine release review, download the ZIP and extract it. Open browser-package/index.html and test matching and graph queries without any backend. Review notices and source/release identity.
- In Investor, open Explore investor fit, enter fictional criteria and submit Compare investor criteria. Inspect result explanations and unknowns. Open Profile & sources for the displayed evidence. Relationships & introduction paths opens Relationship research (there is no separate Graph tab): submit Find evidence paths and Analyze included network and inspect results or explained empty states. Leave private contacts empty unless testing them deliberately with invented data.
- Save fictional inputs, refresh and check persistence. With the helper stopped, disconnect the network, refresh and repeat matching and relationship queries. Record these results separately from merely opening their forms.
- Confirm the ZIP excludes preview notes, scenario assumptions, credentials and private-owner graph records. Downloaded data itself still needs human privacy review.
- Test keyboard navigation and a narrow browser window. Record browser/version, OS, date/timezone, source revision, release identity, each result and reproducible issues.

Use fictional data to rehearse approvals. Do not treat a fictional review as approval of real company data. Keep the local milestone open until the human checks pass and blocking issues are resolved.

### Step-by-step extracted-package test

Open the extracted browser-package/index.html. Keep the LLM helper stopped and use invented inputs only. This tests the recipient app; it does not replace the Publisher checks above.

| Step | Action | Pass condition | Result |
| --- | --- | --- | --- |
| 1 | Open Investor → Explore investor fit. Select pre-seed, leave unknown fields blank and click Compare investor criteria. | Results or an explained empty state appear without an error or blank page. | Pending |
| 2 | Inspect a result and open Profile & sources. If no results appear, open a library profile from Investor. | Reasons, unknowns and fictional labels are clear; profile/source details open. | Pending |
| 3 | Open Relationships & introduction paths. Keep the displayed fictional start and target and click Find evidence paths. | Paths with supporting evidence, or an explained absence of paths, appear. | Pending |
| 4 | Click Analyze included network. | An analysis or explained empty state appears. | Pending |
| 5 | Return to investor fit, enter sector software, select pre-seed and click Save startup profile. Refresh and reopen the form. | Saved sector and stage remain. | Pending |
| 6 | Disconnect the internet and refresh. Repeat steps 1, 3 and 4, then reconnect. | The app and local queries still work with the helper stopped. | Pending |
| 7 | Navigate with Tab, Shift+Tab and Enter. Narrow the browser window. | Controls remain reachable, readable and usable. | Pending |

An empty result is not automatically a failure: inspect its explanation and whether it agrees with the included data. A successful form render alone does not establish query correctness. For each step, record Pass/Fail/Pending, observed behavior and any screenshot or reproduction steps. Record tester, date/timezone, OS, browser/version and release identity once for the run. Current observations are recorded in enterprise/ACCEPTANCE.md; the rows above remain a reusable test template.

## Developer build

In the source checkout, run node tools/build-demo.mjs and then node tools/build-publisher.mjs. This rebuilds the local Publisher and creates a ready-to-open release/research-publisher-* folder. Node is a developer build dependency, not a Publisher runtime dependency. This is a static browser tool, not an installable PWA yet.
