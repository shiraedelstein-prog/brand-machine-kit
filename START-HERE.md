# Start Here

This is the Brand Machine — an AI that builds and runs a social media brand for you. You'll never need to write code. You just talk to it.

Total setup time: about 15 minutes, once.

---

## Step 1 — Install two free programs

1. **Node** — go to https://nodejs.org and click the big green button that says **LTS**. Run the file it downloads and click Next/Install until it finishes. (You'll never open this. It just needs to exist on your computer.)
2. **Claude Code** — go to https://claude.ai/code and follow the instructions to install the desktop app. Sign in with your Claude account. This needs a paid Claude plan; the free tier won't run it.

Restart your computer after installing Node. This matters — skip it and step 3 may not work.

---

## Step 2 — Get the Brand Machine folder

1. Go to https://github.com/shiraedelstein-prog/brand-machine-kit
2. Click the green **Code** button → **Download ZIP**.
3. Find the ZIP in your Downloads, right-click it → **Extract All**.
4. Move the extracted folder somewhere you'll remember, like your Desktop or Documents.

You now have a folder called `brand-machine-kit`. That folder *is* the product.

---

## Step 3 — Open the folder in Claude Code

Open the Claude Code app and point it at the `brand-machine-kit` folder you just extracted (it will ask you to pick a folder when you start a new project).

Then type this to Claude, exactly as written:

> Start the dashboard.

Claude will start it and give you a link — **http://localhost:5177**. Click it. That's your dashboard: everything you build shows up there.

Leave Claude Code open the whole time you're working. If you close it, the dashboard stops. Just say "Start the dashboard" again to bring it back.

---

## Step 4 — Build your brand

Now just talk to Claude in plain English, one step at a time. Do them in this order the first time. Claude will ask you questions along the way — answer them honestly and with specifics, because everything downstream is built on your answers.

1. > Run the brand identity step for my brand.

   Claude interviews you and writes who you are, who you're for, and how you sound.

2. > Now do the visual identity.

   Your colors, fonts, and image style.

3. > Do the channel strategy.

   Which platforms are worth your time, and how often to post.

4. > Run viral research for my niche.

   Claude searches the web for what's actually working right now.

5. > Build the content plan.

   Your recurring series plus a 30-day calendar.

6. > Write the content batch.

   Real, ready-to-post captions, hooks, and CTAs.

After each step, refresh the dashboard in your browser to see the new work appear.

---

## Step 5 — Use it day to day

In the dashboard you can:

- Read your strategy documents.
- Drag posts through **idea → draft → ready → posted** on the content board.
- Type in how each post performed (views, likes, comments) in the **Results** tab.

And in Claude Code you can ask for anything else in plain English — for example:

> Write me five more TikTok posts for the "myth-busting" series.

> This post flopped. Rewrite the hook.

> Redo the viral research, it's a month old.

---

## Want AI images and video? (optional)

Out of the box you get all the writing, designed image cards, and branded reels. You do **not** get AI-generated photos or video — no product shots, no UGC-style actor holding your product.

Those are possible. They run on a service called Higgsfield, which needs its own account and a one-time connection to Claude. It's a setup step, not something you turn on with a sentence, so don't attempt it while you're still getting started — get your first brand built, then ask whoever gave you this kit to connect it with you. It takes about ten minutes together.

(If you're technical, the setup is documented in `README.md`.)

---

## If something breaks

Tell Claude what happened, in your own words. "The dashboard link isn't loading" or "it says node isn't recognized" is enough — it will diagnose and fix it. You are not expected to solve technical problems yourself.

---

## One rule

Each brand lives in its own folder under `workspaces/`. That folder holds a client's real data — **never send someone else's `workspaces/` folder to anyone.**

There's a demo brand (Lumen Candles) in there so the dashboard isn't empty on your first look. Once you've built your own, you can tell Claude: "Delete the example brand."
