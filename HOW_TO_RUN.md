# How to run BuildPlanAI

> Requirement: Node.js 22.5 or newer (`node -v`). The backend uses Node's
> built-in SQLite, which needs that version.

You can run this **two ways**. Option A is the simplest — one command, one
server, one URL.

---

## Option A — Single server (recommended)

Frontend + backend + database all run from **one** process on **one** port.

First time only, install dependencies for both parts:

```
cd ai-building-planner
npm run setup
```

Then start it:

```
npm start
```

This builds the React app and launches the server. When you see
`BuildPlanAI running: http://localhost:8000`, open **http://localhost:8000**
in your browser. That's it — no second terminal.

- Made code changes to the frontend? Run `npm start` again to rebuild + serve.
- Already built and just want to start the server: `npm run serve`.

---

## Option B — Two terminals (only if you want hot-reload while developing)

Terminal 1 — backend:

```
cd ai-building-planner/server
npm install
npm start
```

Terminal 2 — frontend dev server (auto-reloads on edits):

```
cd ai-building-planner
npm install
npm run dev
```

Open the link Vite prints (http://localhost:5173). It proxies `/api` to the
backend on :8000.

---

## Using it

1. Click **Register** and create an account (saved in the database). The FIRST
   account registered becomes the admin.
2. Log in, then create a project by entering plot size, floors, budget,
   bedrooms/bathrooms, etc.
3. The app generates AI suggestions, cost, materials, a budget-and-floor-based
   **2D floor plan** (with room dimensions), and a downloadable PDF — all backed
   by the database.
4. Everything you create stays saved in `server/data.db` even after you close
   the app.

## Handy to know

- **Stop the server:** click that terminal and press `Ctrl + C`.
- **Reset all data:** stop the server and delete `server/data.db`, then start
  again — a fresh empty database is created automatically.
- **Login says "invalid email or password" the next day:** your account still
  exists as long as `server/data.db` is kept. If you re-extract the zip fresh
  each time, that file (and your account) starts empty again.
