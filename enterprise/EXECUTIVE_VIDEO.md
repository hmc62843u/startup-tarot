# OpenFor executive video: script and storyboard

A short stickman explainer for OpenFor leadership deciding whether to try the pilot. It answers why, what the safeguards are and what we need. The operator walkthrough ([PILOT_VIDEO.md](PILOT_VIDEO.md)) shows how it works on real screens, and the capability companion ([CAPABILITY_VIDEO.md](CAPABILITY_VIDEO.md)) shows what it answers today, what it can't yet and what the pilot adds.

- **Audience:** OpenFor executives and organizers.
- **Length:** about 50 seconds; 16:9 for email and meetings.
- **Style:** stickman-video-director B1 Minimal Hand-Drawn, plain tone. No hooks, jokes or social-media framing.
- **Narration:** English, Gemini Bodi at native speed, with burned-in captions and a .vtt file.
- **Status:** produced 2026-11-03 as a 44.7-second video (42.7 s narration plus a 2 s end card): [openfor-executive-pilot.mp4](https://github.com/hmc62843u/hmc62843u.github.io/blob/master/media/startup-tarot/2026-11-03-openfor-executive/exports/openfor-executive-pilot.mp4), with project files in that hmc62843u.github.io folder. No contact line yet.
- **Not for the public funnel page** until the pilot is accepted.

## Script (about 110 words)

1. Every cohort needs current investor and startup research. Keeping it up to date by hand is slow.
2. With Startup Tarot, one operator keeps that research current, with Codex doing the careful groundwork.
3. Founders get a ready-to-open copy of the app to choose their next small experiment.
4. People stay in charge. Every release needs human approval, and nothing is published or sent automatically. Private contact data stays out of releases, and every change is versioned, so earlier versions can be restored.
5. We've demonstrated it with synthetic data on a local setup. It hasn't been tried with OpenFor's data yet.
6. We're asking for one operator and a small, authorized dataset to run a pilot.

## Storyboard

| # | Time | Picture and motion | Scene text | Sound |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:07 | A row of founder figures; an operator figure behind a growing stack of paper that wobbles | CURRENT RESEARCH, BY HAND | paper |
| 2 | 0:07–0:15 | The operator at a laptop; a small sparkle "assistant" sorts papers into neat cards beside it | ONE OPERATOR + CODEX | tap |
| 3 | 0:15–0:23 | A founder opens a small box; the familiar app card and sticky note pop out | A READY-TO-OPEN COPY | pop |
| 4 | 0:23–0:37 | Four safeguards arrive one at a time on the spoken words: approval stamp, closed envelope with a cross, locked folder, stack of versions with a back arrow | PEOPLE STAY IN CHARGE | tap per item |
| 5 | 0:37–0:44 | A test flask labelled SYNTHETIC beside the app card; the OpenFor data folder stays closed | DEMONSTRATED · NOT YET PILOTED | quiet |
| 6 | 0:44–0:52 | One operator figure and one small folder, side by side; a handshake line between them | ONE OPERATOR · A SMALL DATASET | chime |

End card (2 seconds, after scene 6): "OpenFor pilot · prepared, not started" and a contact line to fill in before sharing.

## Claims to keep accurate

| Claim | Source |
| --- | --- |
| Human approval before every release | OPERATOR.md: review declarations start false; package requires them |
| Nothing published or sent automatically | OPERATOR.md: package reports published:false; no sharing command |
| Private contact data stays out of releases | OPERATOR.md: private owner data has a separate API and is not merged into imports or releases |
| Versioned changes; earlier versions restorable | OPERATOR.md: recovery creates a new revision and preserves history |
| Demonstrated with synthetic data, not yet piloted | OPENFOR_DEMO.md evidence; pilot is "prepared, not started" |

Avoid:

- "Data never leaves your machine." Codex is a hosted model and reads the files it works on. Say only what is listed above.
- "Releases are automatically cleaned of private data." Owner contacts are kept separate, but shared free text is not redacted automatically; the operator's privacy review covers it (OPERATOR.md, mapping step 3).
- Time saved, funding outcomes, user counts or testimonials. Nothing has measured them.
- Implying the app is finished, hosted or production-ready.
- OpenFor's name or logo on screen beyond plain text, unless OpenFor approves.

## Production notes

- Reuse the stickman pitch project: draw art locally with draw-art.mjs and the Autopilot B1 renderer, 1920×1080.
- Narration: gemini-3.8-flash-tts with voice Bodi worked on the free tier; image generation did not.
- Follow the tool's sample-then-approve step: render about 20 seconds for review before the full film.
- Keep the project in its own folder, in hmc62843u.github.io under media/startup-tarot/.
