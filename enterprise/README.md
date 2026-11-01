# Research Workspace and operator tools

Start with [Operator workflow](OPERATOR.md). For the setup-only panel inside Codex, ask the skill to run node enterprise/operator.mjs setup and open its printed URL. The repository-scoped $research-operator skill guides Codex through node enterprise/operator.mjs: start services, inspect/check/import/export selected research, prepare a preview and review draft, then package after human approval. No automatic sending or publishing is supplied.

Research Workspace maintains authorized investor/startup research data through Codex. The local API remains; browser administration routes are retired. Research Publisher is an optional browser-only interface using the same validation/release engine. Founder Workspace is the recipient app.

- [Launcher setup](LAUNCHER.md): one-time configuration, start/status/stop and ownership.
- [Technical reference](../ENTERPRISE_REFERENCE.md): backend setup, scoped imports, Neo4j and API contracts.
- [OpenFor data and illustrative scenarios](PUBLISHER.md): sourced context, unknowns and fictional inputs.
- [Acceptance record](ACCEPTANCE.md): implementation evidence and pending human checks.

This is a local adoption reference, not a production deployment. No shared developer ChatGPT login or automatic promotion of LLM output into facts is provided. Browser Publisher and recipient local matching do not require shared backend processes.

Repeat the synthetic OpenFor demo on live storage: node tools/rehearse-openfor.mjs --database-config LOCAL_FILE --organization openfor_demo_NAME. See [the presentation walkthrough](OPERATOR.md#repeatable-openfor-demonstration-and-pilot). Each run creates a linked five-minute presentation script, fresh reports and unapproved proposals; live Neo4j is required; real OpenFor data is not. In-memory runs are automated tests only.

After OpenFor agrees: follow the [Codex-guided pilot checkpoints](OPERATOR.md#next-milestone-codex-guided-openfor-pilot). The pilot is prepared, not started; actual OpenFor data remains pending; the synthetic live-storage demo and restart durability have passed.
