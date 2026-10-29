# Configured local Guide Pack

Startup Guide loads **active-pack.js**, a trusted local browser wrapper containing the complete configured pack. It works when index.html is opened directly. No app settings or import screen is provided.

The build writes that wrapper from [guide-pack.json](guide-pack.json). For manual replacement without development tools, see [the local pack instructions](../GUIDE.md#the-local-pack). A later build overwrites the wrapper from JSON.

The included Research Guide Pack 0.7.0 has nine investor/program profiles, three startup snapshots and three actions. Seven profiles are reference-only; no investor topics are documented. Matching startup-only examples work without asserting investor alignment. [demo-guide-pack.json](demo-guide-pack.json) is a separate fictional pack for testing.

Authoritative source: Guide Pack Kit. Research JSON SHA-256: 177e0f66577306a96fc860d32d7605574794347ad4d6745ccf62ad6d76d7dc92. Required notices remain [LICENSE.md](LICENSE.md), [SOURCES.md](SOURCES.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [DATA_NOTICE.md](DATA_NOTICE.md). The fictional JSON carries its own MIT notice. Passing shape validation or provider self-tests does not certify quality or rights.
