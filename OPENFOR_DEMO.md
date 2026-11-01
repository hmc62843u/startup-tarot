# OpenFor demo: start here

This branch is a reviewable demonstration, not a production release. It contains application source, operator guidance, public-source research examples and clearly labelled synthetic fixtures. It contains no OpenFor private records, local credentials or database installation. The published main baseline is separate.

## Guided start

1. Clone the codex/openfor-demo branch and open the startup-tarot folder in Codex.
2. Ask: `$research-operator — follow OPENFOR_DEMO.md. Check this machine, guide local setup, open the setup panel inside Codex and run the synthetic live-storage demo in a dedicated demo organization. Keep credentials local. Do not seed a pilot organization or distribute anything.`
3. Node 24+ is required. Prepare the ignored Publisher assets once: `node tools/build-demo.mjs`, then `node tools/build-publisher.mjs`. These commands do not install dependencies or start a database.
4. Follow [launcher setup](enterprise/LAUNCHER.md) for Neo4j (Docker Compose or an existing installation), local password/access configuration and service ownership. Existing credentials/data must be preserved. Paths under .local/enterprise-runtime describe the development machine only; those binaries and secrets are not shipped. The synthetic demo needs a live database; no simulated fallback is used.
5. Codex runs `node enterprise/operator.mjs setup` and opens its printed URL in this chat's built-in browser panel. Check readiness and use Start services as needed. This native offline setup page is not an OpenUI/MCP app. On hosts without a browser panel, use the CLI. Missing Node must be resolved before the panel can run.
6. With the selected live database ready, run `node tools/rehearse-openfor.mjs --database-config LOCAL_DATABASE_JSON --organization openfor_demo_private`. Keep that database configuration ignored and local (Neo4jStore url/user/password/database fields). The command creates demo-scoped temporary API credentials, preserves live revisions, and prints fresh report, mapping, presentation and preview paths.
7. Open the generated presentation.md. Follow the five-minute script and short optional browser smoke checklist. It separates synthetic maintenance records from the sourced OpenFor-context founder illustration. Both Publisher proposals remain unapproved; nothing is automatically delivered.

Repeating the demo intentionally replaces the dedicated demo organization's active dataset through new revisions. Never use an important working organization. Keep the synthetic dataset as a template; an agreed pilot starts with authorized source records in a separate clean organization. See [pilot checkpoints](enterprise/OPERATOR.md#next-milestone-codex-guided-openfor-pilot).

## Evidence and remaining checks

- Clean staged-tree verification: prepared Publisher assets and all 181 source tests passed without copying local credentials/runtime. This is not a full clean-machine installation.
- Locally verified: synthetic demo on live portable Neo4j, revision correction/recovery and access checks, native graph parity, database restart persistence, setup-panel start/stop in Codex and exported-package checks.
- Not yet verified: installation from a clean checkout on another machine, real Docker startup, actual OpenFor private-data mapping, live-account LLM reasoning and full human founder acceptance.
- Opening the branch on GitHub does not run Neo4j or Workspace. GitHub Pages cannot host those server processes. No shared developer login or automatic data synchronization is provided.

[Operator guide](enterprise/OPERATOR.md) is the maintained procedure; [acceptance record](enterprise/ACCEPTANCE.md) contains checkpoint evidence. Browser testing is deferred unless resumed explicitly. Demo preparation is separate from release approval and sending/hosting a founder bundle.
