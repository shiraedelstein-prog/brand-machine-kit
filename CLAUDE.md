# Brand Machine — pipeline playbook

This project is a **personal social media brand engine**. The web app (`server.js` + `public/`) is a read/write dashboard over `workspaces/`. **Claude Code is the AI engine**: when the user asks to run a pipeline step, follow the recipes below and write files in the exact formats the dashboard reads.

Start the dashboard with `node server.js` → http://localhost:5178

## Workspace file contract

```
workspaces/<slug>/
  brand.json               { name, slug, niche, createdAt }
  brand-identity.md        step 1 output
  visual-identity.md       step 2 output
  channel-strategy.md      step 3 output
  research/viral-research.md   step 4 output (re-run periodically)
  content-plan.md          step 5 output — series architecture + 30-day calendar
  content/<id>.json        one file per content piece (step 6)
  campaigns/<id>.json      one file per campaign (step 8) — goal, offer, dates, results
  assets/                  generated images/videos referenced by content items
  metrics.json             array of result entries (user-entered via dashboard)
  signals.json             COMPUTED by the server from metrics + content — never hand-write it
```

### content/<id>.json schema

```json
{
  "id": "kebab-case-unique-id",
  "title": "Short internal name",
  "channel": "tiktok | instagram | youtube | x | linkedin | pinterest",
  "format": "reel | carousel | short | post | story | thread",
  "status": "idea | draft | ready | posted",
  "hook": "First line / opening beat",
  "body": "Caption or main copy, ready to paste",
  "cta": "Call to action line",
  "hashtags": ["#tag1", "#tag2"],
  "script": "Full video script if format is video (optional)",
  "series": "Which recurring series from content-plan.md this belongs to",
  "job": "credibility | shareability | conversion",
  "campaign": "campaign id if this piece belongs to a campaign burst (optional)",
  "assets": ["assets/filename.png"],
  "sourceInsight": "Which viral-research finding inspired this",
  "createdAt": "ISO date",
  "scheduledFor": "", "postedAt": "", "postUrl": ""
}
```

`assets` paths are relative to the workspace root; the dashboard serves them at `/files/<slug>/assets/...`.

### metrics.json entry schema

`{ date, channel, contentId, views, likes, comments, shares, saves, clicks, followersGained, notes }` — usually entered by the user in the dashboard Results tab (manual form or CSV import). Only write this file directly if the user asks you to log results.

### campaigns/<id>.json schema

```json
{
  "id": "kebab-case-unique-id",
  "name": "Father's Day 2026",
  "goal": "What business outcome this push is for, in the owner's words",
  "offer": "25% off the SPF spray",
  "code": "DAD25",
  "redemption": "how a sale gets attributed: discount code | booking link | 'found us on social' | DM keyword",
  "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD",
  "status": "planned | running | ended",
  "angle": "The one creative idea the burst hangs on",
  "results": [],
  "createdAt": "ISO date"
}
```

`results` entries (`{ date, redemptions, revenue, cost, notes }`) are entered by the user in the dashboard Campaigns tab. Never invent or estimate them.

## Pipeline steps (what to do when the user asks)

Run steps in order for a new brand, but any step can be re-run; overwrite the doc when re-running. Interview the user briefly if key inputs are missing (product, audience, price point, personality), then write the file.

### 1. Brand identity → `brand-identity.md`
Interview first (ask each section's questions in ONE message, not one at a time; push for specifics; one follow-up max per section): identity, audience, voice. Then write sections:
- **Focus statement** — `I help [person] who feels [tension] by showing them [path]`. Person specific enough that a real individual recognises themselves; tension = what they feel but can't say; path = a destination, not vibes. Offer 3–4 candidate directions (each with audience, tension, path, 90-day monetisation angle) and let the user lock one.
- **Positioning** (one-liner) and **What we're against** — the patterns/beliefs the brand refuses; this is what stops drift.
- **Target audience** — primary + secondary personas as real people, their main frustration, what they actually want underneath, and **2–3 verbatim phrases they'd actually say** (from DMs/comments/Reddit, not invented).
- **Brand feel + boundaries** — 3–5 feel words, plus NOT-boundaries ("bold but not aggressive").
- **Voice rules** — Always / Never lists, 3 in-voice example lines and 3 OFF-voice lines, CTA style.
- **Brand story** — origin, the shift, one-sentence through-line, receipts (proof it's real).
- **Messaging pillars** (3–5 with example angles), **Words we use / avoid**, **Proof points & offers** (codes, links).

### 2. Visual identity → `visual-identity.md`
Builds ON TOP of brand identity — reference its feel words and audience when proposing. Sections:
- **Color system** — hex codes (dashboard renders swatches from any `#rrggbb`) **with usage rules per color**: primary dark bg, primary light bg, headline/emphasis, CTA/highlight; overlay color + opacity for text-on-image.
- **Typography hierarchy** — display font + body font (Google Fonts), per-role weight/case/size: headline, subhead, body, CTA. Every designed slide combines ≥2 fonts.
- **Text caps** — hook slide ≤8 words, any slide ≤15 words.
- **Imagery direction** — visual energy, photo/AI/stock mix, color grade, mood per slide role (hook vs body vs CTA), and an explicit **anti-style / never-use list** (the most valuable part — it prevents generic output).
- **Layout & composition** — text position rules, margins/safe zones, text-on-image rules, max elements per slide.
- **Visual rhythm** — background alternation pattern across carousel slides, image cadence, energy arc.
- **Slide architecture** — role per carousel position: hook → context → value → tension → CTA; CTA slides feel designed, not empty.
- **Signature element** — ONE recurring motif (character, frame device, color wash) that makes any post recognisable from a thumbnail. Suggest one if the user has none.
- **Brand marks** — handle, watermark position, sign-off phrase.
- Video style (pacing, captions, framing) and template notes per channel. Keep it executable — a freelancer could produce on-brand content from this doc alone.

### 3. Channel strategy → `channel-strategy.md`
Decide the best channels **for this niche** (research if needed; WebSearch is available). Sections: Channel ranking table (channel, fit score, why, role: primary/secondary/repurpose), Cadence per channel, Format mix, What we will NOT do (and why), 30-day rollout plan.

### 4. Viral research → `research/viral-research.md`
Use WebSearch (and browser tools if useful) to find what's currently working in the niche on the chosen channels. For each finding: what the post/format is, the numbers if visible, **why it works** (hook mechanics, emotion, structure), and **how we'd adapt it** for this brand. End with a "Patterns" section (recurring hooks, formats, angles) and a ranked "Opportunities" list. Date-stamp the doc — it goes stale; re-run on request.

### 5. Content plan → `content-plan.md`
Series beat random topics: recurring formats build a binge loop (someone finds post 17, scrolls back through the series) and make output predictable. Read the four docs above first, **then read `signals.json` (see "Closing the loop" below) and let real results override the plan's assumptions.** Then write:
- **Series architecture** — 2–3 recurring series, each with a name, format, and a JOB: one for **credibility** (depth/expertise), one for **shareability** (saves/shares/screenshot bait), one for **conversion** (link-in-bio, DM keyword, code). Two strong series beat three weak ones. Every piece of content belongs to a series — no orphan posts.
- **30-day calendar** — table with real dates: date, series, channel, hook angle, format, job.
- **Binge loop** — how the series connect and what the month builds toward by day 30.
- **Anchor posts** — the 2–3 posts to batch and over-deliver on first.
- **CTA distribution** across the month: ~50% save/share, ~25% comment/DM keyword, ~15% link in bio, ~10% no CTA.

### 6. Content batch → `content/*.json` (+ `assets/`)
Read ALL five docs first, **plus `signals.json`** — context compounding is what makes output specific instead of generic. Two phases, like a creative director:
1. **Plan checkpoint:** propose the batch (titles, hooks, angles, which series/calendar slots they fill) and get the user's approval BEFORE generating any visuals. Redirecting strategy is cheap; rebuilding finished assets isn't.
2. **Build:** write each piece as a JSON file — copy in brand voice ready to paste, `series` + `job` from the plan, `sourceInsight` tracing to a research finding. New pieces start as `draft` (`idea` for concept-only). Media via Higgsfield MCP into `assets/` (referenced in the item's `assets` array), following the visual identity's signature element, text caps, and anti-style list — if an image comes back generic, regenerate with the anti-style named explicitly. Confirm before spending credits on video. Vary caption length; respect the plan's CTA distribution.

### 7. Results → `metrics.json` (user-entered) → `signals.json` (computed)
The user logs each post's numbers in the dashboard's Results tab. The server then recomputes `signals.json` automatically — it joins every logged result back to that post's `series`, `format`, `channel`, and `job`, and works out what actually performs against the brand's own baseline. You never compute this by hand, and you never estimate it.

### 8. Campaign → `campaigns/<id>.json` + tagged content burst

A campaign is a short push with a goal, an offer, and a deadline — a holiday sale, a product launch, a slow-month push. It is NOT the standing content plan: it borrows the brand's voice and visuals but exists to move a number in a window of time. Run it any time after step 1 exists (the more docs exist, the better the output).

**Interview (ONE message, five questions):** the occasion or goal; the offer (discount, freebie, bundle — push back if there's no real offer, "check us out" doesn't convert); the deadline/window; the product or service being pushed; how a sale will be attributed (discount code, booking link, "how did you hear about us?", DM keyword). If they sell in person with no codes, default to the "found us on social" count — never leave attribution undefined.

**Then write:**
1. `campaigns/<id>.json` per the schema above, `status: "planned"`, `results: []`.
2. The content burst as normal `content/*.json` pieces, each with `"campaign": "<id>"`. Default shape for a 2-week window (scale to the window): 2 teasers → 3–4 offer posts (different hooks, same offer) → 1–2 proof/demo posts → 1 last-day urgency post. **Every piece must carry the campaign's code or link in its body or CTA** — attribution dies the moment a post forgets the code. Follow brand voice, visual identity, and the campaign's `angle`; plan checkpoint before generating visuals, same as step 6.

**Analysis (when the user asks, or when the campaign ends):** read the campaign's `results` plus `metrics.json` entries for the tagged pieces. Report: total redemptions/revenue/cost against the goal; which piece drove redemptions (by post dates vs. result dates and per-post engagement); what to repeat or drop next campaign. Write the takeaways into the next campaign's `angle` when you run one. If `results` is empty, say the scoreboard is blind and point the user to the Campaigns tab — do not analyze engagement as if it were sales.

## Closing the loop — `signals.json` is not optional

**Steps 5 and 6 MUST read `signals.json` before writing anything.** This is what makes the kit a loop rather than a content generator: the next round is built on what this brand's audience actually did, not on what generally works.

How to use it:

- **`ready: false`** — there are fewer measured posts than `minSample`. There are **no findings**. Say so plainly, plan from the strategy docs alone, and do not let the numbers steer anything. Do not soften this into "early signs suggest…".
- **`ready: true`** — use `actionable[]`. Each entry names a `dimension` (series / format / channel / job), its `value`, a `verdict` of `over` or `under`, and the `index` (how it performed against the brand's baseline, so 2.1 = double).
  - `over` → give it more slots in the next batch. Say which one and why.
  - `under` → fix it or cut it. Name the change.
  - Anything marked `insufficient` is **not** a finding. Never cite it as one.
- **`unloggedPosted[]`** — posted content with no numbers logged. The loop is blind to these. Tell the user to log them.
- Always state the sample you are reasoning from ("across 11 measured posts…"). Never dress up a thin sample as a trend.

When the user asks why something changed in the plan, point at the specific signal that caused it.

## Using the brand docs as a decision filter

The docs aren't just generation input — they're a filter. When the user pastes a draft, a thumbnail concept, a sponsorship offer, or an idea, check it against brand identity (positioning, what we're against, voice Always/Never) and visual identity (anti-style, signature) and **push back honestly** if it doesn't fit. When the user produces a strong piece of writing, offer to fold it into the voice examples in `brand-identity.md` — voice sharpens over time. If output starts sounding generic, the fix is more detail in the docs, not a longer prompt.

## Conventions

- New brand = `POST /api/brands` from the dashboard home page, or create the folder structure by hand (see contract above).
- Never invent metrics. Sample/seed data must be clearly marked as sample.
- Keep discount codes, URLs, and product claims consistent with `brand-identity.md`.
- The Slam Lotion workspace was seeded as a working example; its research and metrics files are marked SAMPLE where the data is illustrative.
