# Your next small experiment

![Your situation leads to a next move, then an experiment and learning.](assets/how-it-works.svg)

## Start here

1. **Situation:** choose your business model, stage and question. Select **Show my next move**.
2. **Next move:** read one action and its support label. Select **Make a plan**, write what you will try and look for, then **Save plan & continue**. The next screen confirms **Plan saved**.
3. **Record learning:** after saving the plan, choose progress, write a note and **Save progress**. Return with **Edit plan**.

## Four screens

| Screen | What you can do |
| --- | --- |
| Situation | Update three choices. Existing optional startup details stay saved. |
| Next move | Adapt the current suggestion or continue your saved plan. |
| Investor | Browse one profile at a time. Use one perspective, or clear your choice. Reference-only profiles cannot be selected. |
| Startup | Browse all snapshots one at a time, with related examples first. Others say Browsing only · no matching lesson. |

Use the four tabs at the bottom. The normal flow fits 320 × 480 at default text size; source dialogs, enlarged text, long content and notes can scroll. **Why this fits & sources**, **Profile & sources** and **Full snapshot & sources** retain dates and limitations. Close them or press Escape to return.

## Try a researched example

1. Set **A marketplace · Exploring an idea · Test demand** and show your next move.
2. Expect **Try a bounded local service**, labelled **Startup example only**. The included pack has no encoded investor-topic connections.
3. Open **Startup**. Expect DoorDash's launch-service snapshot dated **2013-01-12**, first of three snapshots. Use the arrows to browse Airbnb and GitLab; those are labelled browsing-only for this move. Open its full snapshot and sources; the account was published later, not on the historical snapshot date.
4. Open **Investor**. Selecting firstminute adds that perspective; it does not create a documented link to DoorDash.
5. On **Next move**, make a plan. Change the action to **Offer one local test — TEST-LEAN-01** and save. On the Plan saved screen, select **Trying**, enter **TEST-LEAN-01** in the notes, then save progress.
6. Refresh. Continue the plan and confirm the custom action, Trying and note remain. Change investor choice, then confirm the saved plan remains editable; its evidence status may change.

**Learning recorded** requires a note and a continue/change/stop decision. This records your judgement, not an independent assessment. Optional fields from earlier versions (question, conditions and review date) are retained when compact plans are saved.

## Methodology

| Available support | Meaning |
| --- | --- |
| Both sides | A startup lesson and investor topic connect through encoded rules. |
| Startup only | A relevant example without documented investor alignment. |
| Investor only | An interest without a matching startup approach; the exercise is general. |
| Neither | A general exercise without source support for a connection. |

With no selected investor, a complete connection is only a preview. Choose the investor explicitly before adapting it. Sources support limited facts; suggested experiments are authored interpretations. They do not predict funding or explain survival. The app applies rules locally and never calls an LLM.

[Methodology and quality assessment](https://github.com/hmc62843u/guide-pack-kit/blob/main/CONTRIBUTING.md).

## The local pack

There is no library or settings screen. The app reads **packs/active-pack.js** beside its other local files. The included research has nine investor/program records and three snapshots; seven profiles are reference-only. To replace it manually:

1. Obtain a trusted browser pack file from its author, then copy it into the app's packs/ folder as **active-pack.js**. Retain its source/licence notices.
2. Refresh with **Ctrl + R**. The header identifies research or fictional examples. Use the same browser profile and app path to retain your notes.
3. To restore the included research, copy packs/active-pack.js from a fresh app download.

For a complete JSON pack without a browser file, save a UTF-8 active-pack.js containing only the assignment below, with the full JSON object in place of the comment:

~~~javascript
globalThis.STARTUP_GUIDE_PACK = /* complete JSON object here */;
~~~

The comment is a placeholder, not a working pack. A script can execute code: accept only trusted reviewed files containing that data assignment. The app validates the assigned data, not arbitrary JavaScript. [Guide Pack Kit](https://github.com/hmc62843u/guide-pack-kit) contains the authoring contract and example JSON packs.

JSON alone copied beside index.html does not load. The browser script wrapper is needed for direct-file use. Keep the repository in the same location to retain browser notes; use the same browser profile. Packs keep separate workspaces by provider/library/version. Replacing a pack does not erase the other workspaces.

## Pack terms and sources

The research keeps its [licence](packs/LICENSE.md), [source bases](packs/SOURCES.md), [third-party notices](packs/THIRD_PARTY_NOTICES.md) and [data notice](packs/DATA_NOTICE.md). Fictional examples remain [invented scenarios](EXAMPLES.md). The [data scope](DATA_LICENSE.md) distinguishes the two.

Your situation, plans and notes stay in this browser. Saving can fail if storage is unavailable; keep the tab open and try again. Merely typing does not save. Source links open external pages only when followed. Detailed contributor documentation in Guide Pack Kit needs an internet connection.
