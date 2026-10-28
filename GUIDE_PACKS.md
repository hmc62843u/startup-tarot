# Guide Packs

**Import a Guide Pack → review it → activate it.** No Node or Python is needed. The included researched pack is the default for new workspaces; fictional demos are optional, and only one pack is active at a time.

| A pack supplies | Startup Guide does |
| --- | --- |
| Research facts, sources and limits | Validate and display records; compare supported stage/sector focus. |
| Declarative decision recipes and self-tests | Apply app-owned matching operators and check expected results. |
| Suggestion text, interpretations and cautions | Explain matching moves and let you adapt an experiment. |

A Guide Pack contains data and constrained criteria, not executable provider code. Compatible format is not proof of good research, sound rules or useful advice.

## Try a pack

1. Download the [Fictional Guide Pack](packs/demo-guide-pack.json) to test connected moves, or export the already included [Research Guide Pack](packs/guide-pack.json). The included pack supports browsing, limited comparisons and startup-only examples.
2. Open **Libraries & settings** in the header or sidebar. In the panel, select the JSON and inspect the provider, version, dataset kind, licence, sources, quality declarations and self-test results.
3. Choose **Use this Guide Pack**. Downloading or selecting a file does not activate it.
4. For the fictional pack, use Marketplace · Idea · Test demand and open Home → Investor lens → Choose, check Fictional Discovery Fund, then Use selected investors. Try hardware or a growth stage to see the connection disappear.

## Included research download

| Pack | What it demonstrates |
| --- | --- |
| Fictional Guide Pack 1.2.0 | Two invented investor profiles, one scenario, two action candidates and seven self-tests. No real company or investor is represented. |
| Research Guide Pack 0.7.0 | Nine investor/program records, three snapshots and three action candidates. Seven profiles are reference-only. Four no-match self-tests; no positive connection coverage. |

The included real pack still has no supported investor-topic connections, so it cannot produce investor-linked next moves. No missing evidence was invented during the redesign.

The authoring source is **Guide Pack Kit** (`guide-pack-kit`). Distribution copies and provenance are in [packs/README.md](packs/README.md). The real pack retains its [editorial licence](packs/LICENSE.md), [source bases](packs/SOURCES.md), [third-party notices](packs/THIRD_PARTY_NOTICES.md) and [data notice](packs/DATA_NOTICE.md). The fictional pack carries its own MIT notice. The app's licence does not replace pack terms or third-party rights.

## Package contract: version 2

Providers identify themselves and declare version, sources, licence, rights review and quality for research, matching and suggestions. Identity and quality declarations are not independently verified. The app accepts only its supported rule operators and checks references, dates, dataset kind, context values and file limits. Unknown or executable rule fields are rejected.

| For authors | Reference |
| --- | --- |
| Fields, operators and limits | [Canonical pack format (Markdown)](packs/PACK_FORMAT.md) |
| Complete working example | [Fictional Guide Pack](packs/demo-guide-pack.json) |
| Shape schemas | [Import contract](data/guide-pack.schema.json), [v2](data/guide-pack-v2.schema.json), [legacy v1](data/guide-pack-v1.schema.json) |

The canonical format is maintained in Guide Pack Kit and copied here, rather than maintained as a second independent specification. JSON schemas describe shape; runtime validators enforce additional reference/date/source checks. Neither establishes truth or reuse rights.

## Provider evaluation cases

Packs may include up to 50 hypothetical input cases with expected suggestion IDs. During preview the app runs its actual candidate matcher and shows each case's context, lens, expected/actual actions and rationale. It also shows how many cases expect suggestions versus none.

These are provider-authored self-tests, not independent accuracy ratings. They do not evaluate your saved startup, Home ranking, progress decisions, source truth or startup outcomes. Passing only no-match tests does not demonstrate positive coverage. A compatible pack with failed expectations remains a user choice; malformed cases cannot be imported. See the [case format and limitations](packs/PACK_FORMAT.md#portable-recipe-self-tests).

## Authoring research connections

Use Guide Pack Kit's **AUTHORING_PROMPT.md** with Codex or another assistant. Maintain facts selected by catalog.json, the matching component and suggestion text; review sources and reuse bases, preserve unknowns and update exact-byte review hashes. Write the complete dist/guide-pack.json directly and increase its version when content changes. The kit requires no Node or Python.

Test supported matches, nonmatches, unknown context, missing topics and reference-only investors. Do not invent an investor priority to make a test pass. When authorized, refresh the app's pack downloads, notices and PACK_FORMAT.md together. App development checks are in [DEVELOPMENT.md](DEVELOPMENT.md); separate research, matching and usefulness evaluation is explained in [the reference](REFERENCE.md#how-to-assess-quality).

## Compatibility, storage and privacy

Existing v1 and v2 files still import regardless of their filename. Provider/library IDs, JSON field names and browser workspace keys remain stable; branding does not define compatibility. New versions have separate workspaces. Reimport an older package to recover its notes rather than silently merging them.

Only one installed pack slot and one active library are supported. Switching or removing a pack preserves separate notes and lens choices. Storage errors roll back activation. The 5 MB input cap does not guarantee browser storage capacity.

Imports run no provider code, fetch no sources and upload no data. Followed source links open normally. There are no background updates. Private/raw source archives do not belong in deployment inputs. A pack may be compatible but stale, incomplete or wrong—inspect the actual evidence as well as its declarations.

See [support states and demo scenarios](GUIDE.md#try-all-four-support-states) and the [partial-support methodology](REFERENCE.md#research-default-and-partial-support).
