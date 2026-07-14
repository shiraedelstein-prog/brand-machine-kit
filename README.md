# Brand Machine Kit

An AI-run social-media brand engine. Point **Claude Code** at this folder and it interviews you, builds your brand identity + visual identity, researches your niche, plans a month of content, writes the posts, and renders the visuals — all viewable in a local dashboard.

This is the reusable "engine." One person can run a whole brand from a blank folder.

---

## What you need

- **Node.js** (free) — https://nodejs.org (LTS)
- **Claude Code** — the AI engine that runs the pipeline (claude.ai/code, the desktop app, or the CLI)
- *(optional)* a **Higgsfield** account for AI images/video — see below
- *(optional)* nothing else — the dashboard and reels have zero external services

---

## 1. Start the dashboard

```
node server.js
```
Open **http://localhost:5177**. This is where everything you build appears (strategy docs, content board, results).

## 2. Run the pipeline with Claude Code

Open this folder in Claude Code and just talk to it. It follows the recipe in **`CLAUDE.md`**. Typical flow:

1. `Run the brand identity step for <your brand>` → it asks you the right questions, then writes the identity doc.
2. `Now do the visual identity` → colors, type, image style, do/don't.
3. `Do the channel strategy` → best channels for your niche + cadence.
4. `Run viral research for my niche` → what's working right now (uses web search).
5. `Build the content plan` → recurring series + a 30-day calendar.
6. `Write the content batch` → real posts (hook, body, CTA), graded before you see them.

Everything appears in the dashboard as you go. Move posts idea → draft → ready → posted, and log results in the Results tab.

Each brand is just a folder under `workspaces/<brand>/` — plain text/JSON you can read and edit.

---

## 3. Reels & video (Remotion) — optional

The `remotion/` folder renders branded 9:16 reels.

```
cd remotion
npm install
npm run dev          # opens Remotion Studio to preview
npm run render       # renders out/reel.mp4
```

`src/ReelTemplate.tsx` is a reusable template — edit the **BRAND** and **SCRIPT** blocks (or ask Claude Code to). Drop a `logo.png` in `remotion/public/` to use a real logo instead of the text wordmark.

---

## 4. Higgsfield (AI images & video) — optional

For AI-generated actors, product shots, or video, connect the **Higgsfield** MCP:

- Easiest: add it from your **Claude connector settings**, or run `claude mcp add` in the CLI.
- Or rename `.mcp.json.example` to `.mcp.json` (update the URL/transport to match your Higgsfield connection). You authorize it with **your own** Higgsfield account — no key is stored in this repo.

Once connected, Claude Code can generate images/video into a brand's `assets/` folder during the content step. Without it, the kit still produces all copy, designed image cards, and Remotion reels — just no AI photo/video.

---

## Deploy to a live URL (optional)

This repo includes `render.yaml`. On [Render](https://render.com): **New +** → **Blueprint** → pick this repo → **Apply**. The free tier is fine for viewing; for saved edits + always-on, switch to the Starter plan + disk (see the comments in `render.yaml`).

A demo brand (**Lumen Candles**) is included so the dashboard isn't empty on first run — delete `workspaces/example-brand/` when you start your own.

## Notes

- **One brand per client.** Don't ship a client's `workspaces/<brand>/` folder to anyone else — it's their data.
- The dashboard writes to files on disk. To host it for a team, deploy the Node server (e.g. Render) with a persistent disk so edits save.
- Full pipeline recipe and file contracts live in **`CLAUDE.md`**.
