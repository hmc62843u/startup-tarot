# What to do next

Start with one question. Choose a small experiment. Record what you learn.

![Your situation leads to a next move, then an experiment and learning.](assets/how-it-works.svg)

## Start here

1. **Describe your situation.** On Home, choose your business model, stage and learning question. “Not sure yet” is fine. Choose **Show my options**.
2. **Explore an example or review a move.** Home labels complete connections, startup-only examples and general exercises separately. Choosing an investor connects it only when matching topic evidence exists; it does not imply endorsement.
3. **Try it and learn.** Make an experiment plan from an example, or write your own without a connection. The editor opens immediately. Start with **What will you try?** and **What will you look for?** Open **Progress & notes** to choose Trying, then Save progress. Record what happened in My moves.

## Where to go

| I want to… | Open | Do this |
| --- | --- | --- |
| Find a next step | Home | Review the suggested move and its reason. |
| Change my situation | Home → Edit | Update and save your choices. |
| Compare perspectives | Explore | Browse investor profiles or startup snapshots. Expand filters when needed. |
| Focus on an investor | Home → Investor lens → Choose | Select investors, then Use selected investors. Choose Change to edit later. |
| Track an experiment | My moves | Your chosen plans appear first. Open Experiment plan & learning or Edit plan, then Save progress. |
| Switch libraries | Libraries & settings in the header or sidebar | Import and preview a pack in the panel, then choose whether to use it. |

**Libraries & settings** opens a focused panel. Select **Close**, press **Escape** or click outside it to return to your current page. Closing a preview does not activate it. Help and optional pack downloads are inside the panel.

## Try one example

**Situation:** Marketplace · Idea · Test demand.

1. Open **Libraries & settings → Try demo scenarios**. The scenario chooser opens directly; no setup form is needed.
2. Select **Both connected**. The chooser closes and the result comes into view.
3. The selected situation is **Marketplace · Idea · Test demand**, with **Fictional Discovery Fund** as the investor lens. These choices are set automatically; you do not need to select the investor again.
4. Expect **Explore demand with a bounded reservation test**, with **Connected through your selected investor** visible. Click **Review this move**, then **Make an experiment plan**.
5. Edit **What will you try?** and **What will you look for?**. Optional: open **More plan details** for the learning question, decision conditions and review date.
6. Open **Progress & notes**. Set **Move status → Trying**, put **TEST-CONNECTED-01** in the notes, then **Save progress**. Expect **Progress saved.**
7. Refresh. On Home, expect **Your current experiment**, **What you’ll try** with your saved action, and **Continue editing**. Choose it, open **Progress & notes** if collapsed, and confirm **TEST-CONNECTED-01** and Trying remain. More plan details keeps any optional values you entered, even while collapsed.


Use the optional fictional demo for this example. New workspaces start with the included research; existing saved library choices are kept. Without a selected investor, Home says **An example to explore** and **Preview from the library. No investor selected.** This preview does not select anyone or create a plan.

In My moves, chosen plans and exercises with saved work appear first. Untouched general tasks stay collapsed under **Other exercises** and remain optional. **More plan details** holds the learning question, conditions and review date. **Progress & notes** holds status, notes and the checkpoint decision. **Why this plan?** keeps explanations and sources available below the editable fields. The Save progress bar stays reachable while you edit; saving leaves the editor open.

| Question | Your experiment could say… |
| --- | --- |
| What am I learning? | Will people request this service? |
| What will I try? | Offer one clearly scoped reservation test. |
| What will I record? | Requests, cancellations and practical obstacles. |
| What happens next? | Continue, change or stop based on what I learn. |

Choose your own scope. The examples' invented quantities are not targets.

### Try all four support states

In the fictional demo, Home → **Try demo scenarios** opens directly when you enter demo mode. Choose a scenario: the chooser collapses and its result comes into view. It changes your situation and lens. All records and connections in this mode are invented.

| Button | Situation / investor | Expected support |
| --- | --- | --- |
| Both connected | Marketplace · Idea · Demand / Discovery Fund | Startup approach and investor topic connect. Review, then adapt an experiment. |
| Investor interest only | Hardware · Idea · Demand / Discovery Fund | Customer-learning interest is documented, but no hardware startup approach is encoded. Inspect the interest; the suggested exercise is general. |
| Startup example only | Marketplace · Idea · Demand / Formation Studio | Reservation examples fit; no matching investor interest is documented. Adapt the example without claiming investor alignment. |
| Neither | Hardware · Idea · Demand / Formation Studio | General exercise, without a supporting library connection. |

These buttons keep saved plans and notes. An ongoing plan can remain the main action; inspect My moves for other examples. To test from scratch, use a fresh browser profile. Partial support does not prove an investor is uninterested or that no startup ever tried an approach; it describes this library's evidence.

Saved plans remain editable when the lens changes. The connection notice may change while your fields, notes and reported progress remain. Review and save to acknowledge the new context. **About your saved plan** explains when no source connection is active. A startup-only plan retains its snapshot sources and explicitly lacks investor alignment.

## Methodology

The app connects three things when the active library supports them:

| Your situation | A startup lesson | An investor topic |
| --- | --- | --- |
| Model, stage and learning question | A documented action or fictional exercise that fits | A stated interest relevant to that lesson |

JavaScript checks the encoded connections; it does not call an LLM, search the web or fill in missing evidence. A selected investor must also pass the modeled stage/sector checks. Without a selected lens, Home may preview a complete connection from the active library. If only a matching startup lesson is available, it can be adapted as a startup-only example. An investor interest alone stays a separate perspective beside a general exercise.

| Label on a move | How to read it |
| --- | --- |
| An example to explore | A library preview with no investor selected; it does not create a plan. |
| Connected through your selected investor | The encoded context/topic connection uses your selection. It does not imply investment interest or endorsement. |
| Based on fictional examples | An invented exercise to demonstrate the workflow. |
| Based on research sources | An editorial interpretation with attached research evidence. |
| Startup example only | A rule fits a snapshot to your situation, without documented investor alignment. |
| Investor interest only | A relevant investor topic, without a matching startup approach. |
| General exercise | A prompt without supporting library connections. The visible notice explains the gap; About this exercise gives details. |

A match does not predict funding or explain why a startup survived. [Detailed matching rules and behavior](REFERENCE.md#methodology).

Suggestions depend on both research quality and matching rules. Repeatable results are not a guarantee of correctness or success. [How to assess quality](REFERENCE.md#how-to-assess-quality).

## What changes when you activate research?

**New workspaces start with the researched Guide Pack. You can switch in Libraries & settings.**

| Library | What is available now |
| --- | --- |
| Fictional demo | Invented snapshots, profiles and connected learning topics. |
| Current research Guide Pack | Nine investor/program records and three snapshots; seven profiles are reference-only. Browsing, limited comparisons and matching startup-only examples work. Investor-linked next moves are not yet supported. |

For example, you can compare your stage/sector with firstminute's recorded focus and browse DoorDash's launch lesson. The package does not yet support connecting that lesson to firstminute's priorities. [Research evidence and authoring details](GUIDE_PACKS.md#authoring-research-connections).

A v2 package contains research, matching criteria and suggestion content. The preview shows provider and self-declared quality information; these claims are not independently verified. Optional provider self-tests show expected versus actual suggestions and coverage, not a quality score. [Try a Fictional Guide Pack](packs/demo-guide-pack.json) or [read the provider contract](GUIDE_PACKS.md#package-contract-version-2).

The included research is ready for new workspaces. Existing users can choose **Libraries & settings → Use included research**; no download or re-import is needed. Other packs require preview and explicit activation.

## Try a researched example

This is the research walkthrough shown in the README animation. Use a fresh browser profile for a clean test, or keep existing work and look in My moves if an ongoing plan remains the Home action.

1. Open **Libraries & settings → Use included research**. If Research Guide Pack is already active, close settings.
2. On Home, choose **Edit** (or complete setup), then **A marketplace · Testing with users / pre-seed · Test demand**. Choose **Update workspace** or **Show my options**.
3. Open **Investor lens → Choose** or **Change**. Select only **firstminute capital**, then **Use selected investors**.
4. Expect **Try a bounded local service**, labeled **Startup example only. No matching investor interest is documented.**
5. Expand **Based on research sources** to inspect the **DoorDash (launch service in Palo Alto) · 2013-01-12** snapshot, source dates and limitations. The snapshot uses a later recollection; the authored interpretation does not establish causality or investor alignment.
6. Choose **Explore this example**, inspect **Startup evidence & limits**, then **Make an experiment plan**. Adapt the two main fields.
7. Open **Progress & notes**, choose **Trying**, add **TEST-RESEARCH-01**, then **Save progress**. Refresh, choose **Continue editing**, and confirm the note, status and your edited fields remain.

The animation shows steps 2–5; the save/refresh check above is a separate test. The researched pack currently has no encoded investor topics for complete investor-linked suggestions. Use the fictional Both connected scenario to test that state.

## Read your progress

| To explore | Trying | Learning recorded |
| --- | --- | --- |
| A move to consider | An experiment in progress | Notes and, for an accepted experiment plan, a continue/change/stop decision |

These are your records of learning, not a startup score. Updating your situation may reopen a move for review while keeping your notes.

## Fictional libraries

The optional demo examples are invented, not masked real companies or investors. [Browse the scenario specifications](EXAMPLES.md) or [see the full library reference](REFERENCE.md#fictional-libraries).

## Your data and sources

Your situation, imported library and notes stay in this browser. Import does not upload them. Followed source links open external pages; updates are manual.

[Data and licence scope](DATA_LICENSE.md) · [Research import guide](GUIDE_PACKS.md) · [Detailed behavior reference](REFERENCE.md).

## A short path through the app

**Three choices → Show my options → Review an example → Make a plan → Save progress.**

A saved plan appears on Home as **Your current experiment → Continue editing**. **What you’ll try** shows your saved action. The support label still distinguishes investor context, startup-only evidence or no current connection. Extra fields stay available; hiding them never clears their values.
