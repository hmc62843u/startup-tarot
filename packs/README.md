# Configured local Guide Pack

Startup Guide loads **active-pack.js**, a trusted local browser wrapper containing the complete configured pack. It works when index.html is opened directly. No app settings or import screen is provided.

The build writes that wrapper from [guide-pack.json](guide-pack.json). For manual replacement without development tools, see [the local pack instructions](../GUIDE.md#the-local-pack). A later build overwrites the wrapper from JSON.

The included Research Guide Pack 0.9.0 has fourteen investor/program profiles, three startup snapshots and three actions. Five equity profiles carry a dated current-fund timing claim. Seven profiles are reference-only; no investor topics are documented. Matching startup-only examples work without asserting investor alignment. [demo-guide-pack.json](demo-guide-pack.json) is a separate fictional pack for testing.

Authoritative source: Guide Pack Kit. Research JSON SHA-256: 93c14bf432da56d8652cf25219f35c846aa9c05658f41f117973a2bc148c0cf9. Required notices remain [LICENSE.md](LICENSE.md), [SOURCES.md](SOURCES.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [DATA_NOTICE.md](DATA_NOTICE.md). The fictional JSON carries its own MIT notice. Passing shape validation or provider self-tests does not certify quality or rights.

Version 0.7.1 adds four dated mandate claims for the separate investor-fit prototype. It does not add experiment-topic connections.
