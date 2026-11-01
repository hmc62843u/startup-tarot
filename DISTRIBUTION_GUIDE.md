# Distribute an incubator revision to browser users

## Recommended path

Use [the operator workflow](enterprise/OPERATOR.md): Codex prepares a concrete preview/review proposal, the operator approves the exact source and release terms, and the command packages locally. It shares the release engine and manifest format with the optional [browser Publisher](publisher/README.md). Neither path sends or publishes automatically.

The sections below describe the **older Node distribution CLI format**, retained for compatibility and --verify. New operators need not follow both paths. Browser/operator manifests use startup_tarot_browser_distribution; the older CLI uses startup_tarot_distribution. Do not run the old --verify against the new format.

## One release, modular data

```text
incubator-distribution-.../
  data-bundle/
    manifest.json
    guide-pack.json
    relationships.json
    DISTRIBUTION.md
  browser-package/
    index.html
    release-manifest.json
    DISTRIBUTION.md
    packs/active-pack.js
    packs/guide-pack.json
    packs/relationships.js
    data/relationships.json
    docs/distribution.html
    ...application assets and optional local research helper
  browser-files.json
```

The data manifest records release ID/version, component IDs/versions, provider binding, dataset kind, compatibility, byte counts, SHA-256 hashes, selected database revision and operator review declarations. Guide Pack v1/v2 and the optional relationship artifact remain separate contracts; they are not merged into an oversized JSON document. Individual-record authoring remains a Guide Pack Kit concern.

The browser package contains the configured data and generated direct-file scripts, with a visible operator brand/release banner and edition-specific notices. Its service-worker cache changes with the build. The file checksum list in browser-files.json covers the generated browser files; the data manifest covers the three data/note components. Checksums detect content changes, not publisher authenticity or independent rights approval. Use a trusted distribution channel.

## 1. Select and export a revision

Choose an organization revision you are authorized to distribute. In the reference web interface, load an administrator credential and the workspace, then choose Export loaded organization revision (admin). The downloaded JSON is an export envelope with schema_version, organization, revision and bundle. Store it in an ignored imports directory or another private working location. The UI exports the revision it loaded; it does not silently switch to a newer one.

The underlying route is POST /v1/distribution/export with JSON {"revision":"EXPLICIT_REVISION"} and the administrator bearer credential. A researcher credential cannot use this route, and a revision from another organization is rejected. The server reads only the selected organization bundle; separate private-owner graphs, access configuration and research runs are not selected.

For a direct authenticated command, create an ignored connection JSON file with only origin and token, for example .local/enterprise/distribution-connection.json. Keep the actual credential out of chat, source control and release-review files. Use HTTPS for remote endpoints; HTTP is allowed only for loopback. The supplied reference server itself remains local; remote deployment requires separate host/authentication work.

## 2. Review and approve the release

Copy enterprise/fixtures/distribution-review.json to a private working file such as imports/release-review.json. The fixture is approved only for its fictional example; it is not a customer distribution approval.

Fill in all fields:

| Field | Operator responsibility |
| --- | --- |
| id, version | Stable simple release ID and a new major.minor.patch version for a changed edition |
| brand | Incubator/product label shown to recipients; one line, up to 100 characters |
| audience | Who may receive this copy and any distribution restrictions |
| reviewed_by, reviewed_date | Reviewer identity/role and real review date |
| distribution_statement | Exact scope being approved and material source/rights limitations |
| attribution_notice | All required attribution, copyright and third-party notices; do not assume linked sources grant redistribution |
| update_instructions | How users obtain corrections and replace files while preserving their own work |
| approved | True only after the operator approves this release |
| private_data_reviewed | True only after checking public/organization text for sensitive information |
| rights_reviewed | True only after checking reuse rights, notices and the intended audience |

The workflow refuses missing/false approvals, mismatched pack/provider IDs and incompatible kinds. It also rejects known credential/private-history field names. That check cannot classify all personal or confidential text: operators must inspect investor/startup descriptions, source annotations and review notes themselves. Do not add credentials to the approval file.

No private-contact dataset is exported. If a founder manually placed confidential information in an organization field, excluding the private graph does not remove that text. Do not distribute personal connections, model history or tokens as pack metadata.

## 3. Build from an exported envelope

From the full checkout:

```sh
node tools/distribute-incubator.mjs --input imports/approved-export.json --release imports/release-review.json
```

Or fetch the explicitly selected revision directly:

```sh
node tools/distribute-incubator.mjs --connection .local/enterprise/distribution-connection.json --revision EXPLICIT_REVISION --release imports/release-review.json
```

The tool creates a fresh ignored release directory and prints its browser/data-bundle paths, release identity, source revision and build identifier. It never overwrites the developer's configured pack or an existing recipient release. Invalid data, missing local evidence anchors or inconsistent manifest notes fail the build; do not distribute an incomplete output directory after a failure. No source URL is automatically fetched, and no model call is made.

For an entirely fictional rehearsal, export the example_alpha revision and use enterprise/fixtures/distribution-review.json. Fictional graphs remain fictional, are selected as the browser's demonstration graph and cannot be added as live research evidence. The distribution wrapper does not relabel fictional data as real research.

## 4. Verify and distribute

```sh
node tools/distribute-incubator.mjs --verify path/to/data-bundle
```

Verification checks the exact component file set, hashes/byte counts, component identities/versions, pack/graph references, compatibility and consistency between operator notes and the manifest. Extra files or modified components are rejected. The data directory intentionally contains exactly four regular files, with no symlinks or private working files.

Open browser-package/index.html while the reference backend is stopped or unavailable. Confirm the release brand/version, expected investor/snapshot selections, graph entity names and a known path/network query. Inspect docs/distribution.html and the source dates. Direct-file graph use needs no Node process, database connection or extension. Offline reload through a hosted service worker requires an initial successful load; file-based use does not install a service worker.

Use the operator page to build and download a reviewed ZIP, or distribute the approved CLI-built release directory using your normal trusted tooling. Recipients open browser-package/index.html after extraction. Do not include the private export staging inputs, connection file, database volume or credential files. The generated data-bundle and release metadata contain only the approved release; their organization labels and reviewer names are themselves part of the distributed information.

Optional live LLM research still requires each recipient's own local helper and explicit model-transmission consent. The package does not contain the operator's ChatGPT account and does not connect recipients to a helper running on the operator's computer.

## Updates and revocation limits

Preserve entity IDs and provider/pack identity when publishing updates; advance component versions when their contents change and advance the distribution version for a changed edition. Keep recipients informed through the stated manual update channel. Export their personal browser notes before replacing a folder. Storage depends on browser profile and origin/file location, so changing locations can make older work unreachable without restoring the old location/profile. No data import/migration of personal notes is added by this milestone.

Downloaded copies are independent. Later access revocation, database edits, deletion or a withdrawn relationship does not automatically remove information from them. Use this workflow only for data you may let recipients retain. Live authorization requirements need an authenticated online architecture, not a downloadable browser bundle.

## Verification boundary

Tests cover administrator/organization scope, explicit revisions, approval gates, component tampering, reserved private fields, hash checks, source-checkout preservation and browser initialization/querying with no backend. The documented reference example is a fictional rehearsal. Actual distribution rights, recipient usability, customer data quality and real-account LLM acceptance require operator/adopter review.

See [incubator setup](ENTERPRISE_REFERENCE.md). In a full checkout, RELATIONSHIPS.md and ARCHITECTURE.md describe the browser graph and component boundaries.


## OpenFor example

See [the data/scenario reference](enterprise/PUBLISHER.md). Sourced company context, hypothetical founder inputs and completely fictional graph simulations remain distinct. Human acceptance is pending; an automated check does not supply operator privacy, rights or distribution approval.
