# OpenFor capability video: script and storyboard

A short companion to the executive video ([EXECUTIVE_VIDEO.md](EXECUTIVE_VIDEO.md)). The executive video says why to pilot and what the safeguards are. This one shows what the system answers today, what it can't answer yet, and what the pilot would add.

- **Audience:** OpenFor executives and organizers.
- **Length:** about 50 seconds; 16:9.
- **Style:** stickman-video-director B1 Minimal Hand-Drawn, plain tone, matching the executive video.
- **Narration:** English, Gemini Bodi at native speed, with burned-in captions and a .vtt file.
- **Status:** produced 2026-11-04 as a 52.9-second video (50.9 s with narration plus a 2 s end card): [openfor-pilot-questions.mp4](https://github.com/hmc62843u/hmc62843u.github.io/blob/master/media/startup-tarot/2026-11-04-openfor-questions/exports/openfor-pilot-questions.mp4), with project files in that hmc62843u.github.io folder. No contact line yet.
- **Provisional:** it uses only facts already in the demo fixture. Re-render once OpenFor approves using its directory records (see "Later version").
- **Not for the public funnel page** until the pilot is accepted.

## Script (about 125 words)

1. Here's a fictional founder: a hardware startup in Japan, at pre-seed, looking for about a hundred and fifty thousand dollars from one investor.
2. Today, Startup Tarot compares that with two real investors' public criteria. Monozukuri Ventures matches all four: stage, sector, location and check size.
3. For Geek Ventures, only the stage matches. Its sector and check size aren't documented, and it focuses on US businesses. The app says so instead of guessing.
4. Now ask: who in our network could introduce this founder to Monozukuri? Today the answer is: no connection documented. We don't guess relationships from public pages.
5. In the pilot, your team adds connections it can confirm, each with a source and a date.
6. Then the same question gets a real answer: a good fit, and a sourced path to someone who can make the introduction.

## Storyboard

| # | Part | Picture and motion | Scene text | Sound |
| --- | --- | --- | --- | --- |
| 1 | Today | Founder figure with a hardware gadget; three tags pop in: JAPAN, PRE-SEED, $150K | A FICTIONAL FOUNDER | pop per tag |
| 2 | Today | Founder beside a result card "Monozukuri Ventures"; four green ticks arrive on the spoken words | WHAT IT ANSWERS TODAY | tap per tick |
| 3 | Today | Second card "Geek Ventures": one green tick, two grey question marks, a small US flag note | UNKNOWN, NOT GUESSED | tap |
| 4 | Can't yet | Founder on one side, Monozukuri card on the other, an empty dashed gap between them with a question mark; label "No connection documented" | WHAT IT CAN'T ANSWER YET | quiet |
| 5 | Pilot | Operator figure adds a yellow line into the gap; a small tag "source · date" attaches | WHAT THE PILOT ADDS | paper |
| 6 | Pilot | Complete path founder → mentor figure → Monozukuri card, a green tick | A REAL ANSWER | chime |

End card (2 seconds): "OpenFor pilot · prepared, not started".

## Claims to keep accurate

Checked 2026-11-04 in the founder preview from `operator.mjs prepare --input enterprise/fixtures/openfor-research.json --scenario building_ai`, with the scenario's inputs (hardware, pre-seed, Japan, USD 150,000).

| Claim | What the app showed |
| --- | --- |
| The founder is fictional | Preview banner "Fictional scenario"; the scenario is Harbor Building AI in openfor-illustrative.json |
| Monozukuri matches all four | "Strong documented alignment · Evidence coverage: complete": stage, sector, geography and investor check all align with documented criteria |
| Geek: only stage matches; sector and check undocumented; US focus | "Insufficient evidence · Evidence coverage: partial": stage aligns; sector and investor check "no recent declared criterion"; geography "outside stated focus… US-focused businesses" |
| No connection documented | Investor tab card for Monozukuri Ventures: "No connection documented" |
| The pilot adds sourced connections | OPERATOR.md pilot checkpoints; the app's Relationships & introduction paths shows evidence for each link |

Avoid:

- Names of people (investor partners, mentors). Use roles only in anything recorded.
- Naming the real startups (ad-dice, Citadel AI, Asenion) next to funding talk. The founder on screen is fictional.
- Facts from OpenFor's member directory (via the connector) until OpenFor approves their use.
- "Monozukuri would invest" or "eligible". The app says alignment with documented criteria and to confirm availability before outreach.
- Implying the introduction path in scene 6 exists today. It is what the pilot would make possible.
- OpenFor's logo on screen.

## Later version

With OpenFor's approval, re-render scenes 3 and 4 using its directory records: Geek Ventures' stated criteria (pre-seed and seed, US-focused, any sector), which investors backed which listed startups, and investors who spoke at OpenFor events. Keep people's names out unless they agree.

## Production notes

- Reuse the executive project's art helpers (draw-art.mjs) and the Autopilot B1 renderer, 1920×1080, captionSize 38.
- Follow the sample-then-approve step before the full film.
