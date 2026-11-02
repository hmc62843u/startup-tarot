# OpenFor demo: start here

This guide on main is the starting point for the OpenFor demonstration; it does not claim production readiness. It contains application source, operator guidance, public-source research examples and clearly labelled synthetic fixtures. It contains no OpenFor private records, local credentials or database installation. The demo workflow is merged into main; the earlier codex/openfor-demo branch is retained for history.

## Copy this into Codex

```text
Help me set up and run the OpenFor demonstration from:
https://github.com/hmc62843u/startup-tarot/blob/main/OPENFOR_DEMO.md

Use the main branch rather than the older demo branch. If the repository is not present, help me choose a local folder and clone it. Preserve any existing checkout and local changes. Then use the repository's Research Operator skill and setup guide.

Check prerequisites and explain any necessary installation or permission requests. Preserve existing files, credentials and databases. Keep secrets in ignored local configuration, never in chat or Git.

Build the required assets, open the setup panel inside Codex if supported, and verify Neo4j and Research Workspace readiness. Use CLI guidance if this host has no built-in browser panel.

Run the labelled synthetic demonstration in a dedicated openfor_demo_* organization. Show me the generated five-minute presentation, mapping decisions, checkpoint results and founder preview. Clearly distinguish synthetic data from sourced public context.

Do not import real OpenFor private data, sign into an LLM, approve proposals or distribute anything.

Report what passed, what remains pending and the next useful action. If blocked, explain the specific issue without claiming success. Do not substitute simulated storage for the live demonstration.
```

The detailed setup below is for Codex and operators who want to inspect the steps. The [operator guide](enterprise/OPERATOR.md) remains the maintained workflow reference.

## Guided start

1. Clone main from https://github.com/hmc62843u/startup-tarot and open the startup-tarot folder in Codex. For an existing checkout, preserve local changes and update main safely; do not reset or overwrite it.
2. Use the copyable prompt above. Once the project is open, the repository-scoped $research-operator skill guides the remaining steps.
3. Node 24+ is required. Prepare the ignored Publisher assets once: `node tools/build-demo.mjs`, then `node tools/build-publisher.mjs`. These commands do not install dependencies or start a database.
4. Follow [launcher setup](enterprise/LAUNCHER.md) for Neo4j (Docker Compose or an existing installation), local password/access configuration and service ownership. Existing credentials/data must be preserved. Paths under .local/enterprise-runtime describe the development machine only; those binaries and secrets are not shipped. The synthetic demo needs a live database; no simulated fallback is used.
5. Codex runs `node enterprise/operator.mjs setup` and opens its printed URL in this chat's built-in browser panel. Check readiness and use Start services as needed. This native offline setup page is not an OpenUI/MCP app. On hosts without a browser panel, use the CLI. Missing Node must be resolved before the panel can run.
6. With the selected live database ready, run `node tools/rehearse-openfor.mjs --database-config LOCAL_DATABASE_JSON --organization openfor_demo_private`. Keep that database configuration ignored and local (Neo4jStore url/user/password/database fields). The command creates demo-scoped temporary API credentials, preserves live revisions, and prints fresh report, mapping, presentation and preview paths.
7. Open the generated presentation.md. Follow the five-minute script and short optional browser smoke checklist. It separates synthetic maintenance records from the sourced OpenFor-context founder illustration. Both Publisher proposals remain unapproved; nothing is automatically delivered.

Repeating the demo intentionally replaces the dedicated demo organization's active dataset through new revisions. Never use an important working organization. Keep the synthetic dataset as a template; an agreed pilot starts with authorized source records in a separate clean organization. See [pilot checkpoints](enterprise/OPERATOR.md#next-milestone-codex-guided-openfor-pilot).

## Evidence and remaining checks

- Clean staged-tree verification: prepared Publisher assets and all 181 source tests passed without copying local credentials/runtime. This is not a full clean-machine installation.
- Locally verified: synthetic demo on live portable Neo4j, revision correction/recovery and access checks, native graph parity, database restart persistence, setup-panel start/stop in Codex and exported-package checks.
- Second-lab-machine evidence: a fresh checkout at 5ccb59c completed Codex-guided setup on macOS/Apple Silicon with environment-specific corrections; all ten live checkpoints and an explicit service restart/data-hash comparison passed. This was assisted setup, not an unattended installer. See the setup notes below.
- Not yet verified: real Docker startup, actual OpenFor private-data mapping, live-account LLM reasoning and full founder browser acceptance. Native-query parity passed on the Windows development machine, not on the second lab machine.
- Opening the branch on GitHub does not run Neo4j or Workspace. GitHub Pages cannot host those server processes. No shared developer login or automatic data synchronization is provided.

[Operator guide](enterprise/OPERATOR.md) is the maintained procedure; [acceptance record](enterprise/ACCEPTANCE.md) contains checkpoint evidence. Browser testing is deferred unless resumed explicitly. Demo preparation is separate from release approval and sending/hosting a founder bundle.


## Setup lessons from the second lab machine

The lab report identifies macOS 27.0.1 arm64, Node 24.22.2, Neo4j Community 2026.10.1 and Temurin JDK 25.0.5+8. Git/download tools and Homebrew existed; Node, Docker and a usable Java runtime did not. Codex installed selected portable runtimes under ignored .local storage, built the assets and used external Neo4j on loopback HTTP/Bolt 17474/17687. No tracked application file changes were reported.

- **Version-specific settings:** an unsupported fleet-management setting was corrected locally. The supplied report does not identify its exact key. Use the installed distribution's configuration validation/help and change only the setting named in its diagnostics. Do not copy every Docker environment setting into portable neo4j.conf or disable strict configuration validation. Keep runtime corrections local and record the exact setting/version in future setup reports.
- **Credential-safe initialization:** the lab encountered a failed initialization that printed a newly generated demo password; it replaced that password before successful initialization. Future Codex setup must keep generation and initialization values in memory or ignored local files, capture sensitive command output privately, and print only redacted outcomes. Do not echo secrets, paste initialization command lines containing them into chat, or include raw logs in reports. On failure, inspect/redact privately; do not reset an existing initialized database password. If a generated credential was exposed, follow its actual state and replace it appropriately before use.
- **Local service permissions:** this lab required elevated execution permissions to listen locally. Request the narrow permission needed to run the selected loopback service; preserve sandbox/network protections and existing service ownership. This is environment-dependent, not a requirement for administrator/root installation.
- **Repeatability:** do not reinstall or reset a working environment for browser tests. Pull the branch safely, rebuild generated assets and reuse the selected database. Restart verification already passed; computer-reboot/autostart was not tested or required for the demo.

## Next lab pass: founder browser and presentation

Use a freshly generated sourced OpenFor-context preview for matching/navigation, and the normal unsandboxed Founder Workspace index.html for saved-input and offline behavior. Preview memory is deliberately temporary; refreshing it is not a persistence test. The fixture assessment in founder-fit.json is dated 2026-10-31, not a new source review.

Follow [the browser checklist](publisher/README.md#second-lab-browser-pass) and rehearse the generated presentation.md. Save a redacted report with tested commit, OS/browser versions, date/timezone, artifact identities, observed outcomes, screenshots and unresolved issues. Preserve the original results.json; add later evidence separately. Do not approve either sourced proposal, share data or upload local artifacts as part of this pass. A recipient ZIP requiring genuine release review can remain Pending while normal-app persistence checks proceed. In particular, no synthetic review authorizes redistribution of the sourced OpenFor context.

After UI/preview updates, rebuild both demo and Publisher assets and run a fresh rehearsal. Existing preview files do not update automatically; changed preview-engine receipts require fresh review. The latest polish labels temporary preview storage explicitly and presents network summaries as readable text while retaining structured JSON exports.

Navigation polish: the Founder Workspace now has three footer tabs (Next move, Investor, Startup), with Situation on first use and Edit situation on Next move. Open Research from the header or contextual investigation links. When checking the updated preview, verify both the header action and saved research history; earlier five-footer-tab lab screenshots describe the prior layout.

The current main screens emphasize one next action; evidence/source and contextual research controls remain visible in secondary groups. Investor prioritizes Explore investor fit; choosing a perspective remains a separate secondary action. Refresh the presentation preview after rebuilding to see this hierarchy.

Saved research inspection now displays feedback text and recorded dates, not only its count. Recheck this with an actual saved run after refresh; no schema or existing history migration is required. Historical lab reports describe the tested commit, not every later UI change.
