# Deploy BuildPlan AI for FREE (Render + Turso) — permanent, shareable link

This app now uses a **Turso** cloud database (SQLite-compatible) so your data
(users, projects) is saved permanently, and runs on **Render's free web
service**. Total cost: ₹0.

You will create 3 free accounts: GitHub, Turso, Render.

Note: a free Render service "sleeps" after 15 min of no visitors and takes
~30–60 seconds to wake on the next visit. Just open the link a minute before
your demo. Your data is NOT lost when it sleeps — it lives in Turso.

--------------------------------------------------------------------------
## STEP 1 — Put the project on GitHub
--------------------------------------------------------------------------
1. Create a free account at https://github.com  (skip if you have one).
2. Click the "+" (top-right) → "New repository".
   - Name: buildplan-ai   → Create repository (keep it Public or Private).
3. Upload the code (easiest, no commands):
   - On the new repo page click "uploading an existing file".
   - Drag in EVERYTHING inside the `ai-building-planner` folder
     (package.json, vite.config.js, index.html, the `src` and `server`
     folders, render.yaml, etc.).  Do NOT upload node_modules or dist.
   - Click "Commit changes".

--------------------------------------------------------------------------
## STEP 2 — Create the free Turso database
--------------------------------------------------------------------------
1. Go to https://turso.tech  → Sign up (sign in with GitHub is fastest).
2. Create a database:
   - Click "Create Database" (or "New Database").
   - Give it a name, e.g.  buildplan-db  → choose the nearest region
     (e.g. Bangalore / Mumbai / any India-nearby) → Create.
3. Get the two secret values (you'll paste these into Render):
   - Open the database → find "Connect" / "Connection details".
   - Copy the **Database URL** — it looks like:
        libsql://buildplan-db-yourname.turso.io
   - Create a **token**: click "Create Token" / "Generate Token"
     (choose read & write, longest expiry) → copy the long token string.
   - Keep both safe for Step 3.
   (If you prefer the CLI: `turso db show buildplan-db --url` and
    `turso db tokens create buildplan-db`. The website buttons do the same.)

--------------------------------------------------------------------------
## STEP 3 — Deploy on Render
--------------------------------------------------------------------------
1. Go to https://render.com → Sign up with GitHub.
2. Click "New +" → "Web Service".
3. Connect your GitHub and pick the `buildplan-ai` repository.
4. Fill in the settings:
   - Name:            buildplan-ai  (this becomes your URL)
   - Region:          Singapore (closest to India)
   - Branch:          main
   - Runtime:         Node
   - Build Command:   npm run render-build
   - Start Command:   node server/server.js
   - Instance Type:   Free
5. Click "Advanced" → "Add Environment Variable" and add these THREE:
   - Key: TURSO_DATABASE_URL   Value: (the libsql://... URL from Step 2)
   - Key: TURSO_AUTH_TOKEN     Value: (the token from Step 2)
   - Key: JWT_SECRET           Value: (any long random text, e.g. buildplan-9f3k2p7q1z)
6. Click "Create Web Service".
7. Wait for the build to finish (~2–4 min). When it says "Live", click the
   URL at the top — it looks like  https://buildplan-ai.onrender.com

--------------------------------------------------------------------------
## STEP 4 — Use it
--------------------------------------------------------------------------
- Open the Render URL. Click Register — the FIRST account becomes admin.
- Everything you create is saved in Turso and stays forever (even after the
  service sleeps or is redeployed).
- Share the same URL with anyone / put it in your report.

--------------------------------------------------------------------------
## Updating the app later
--------------------------------------------------------------------------
Upload changed files to GitHub again (or push). Render auto-rebuilds and
redeploys. Your Turso data is untouched.

--------------------------------------------------------------------------
## Running on your own computer still works
--------------------------------------------------------------------------
Without the Turso variables it falls back to a local file (server/local.db):
    npm run setup      (first time)
    npm start          → http://localhost:8000
Node 18+ is enough now (the old --experimental-sqlite flag is no longer used).
