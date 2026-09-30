# BuildPlanAI — Backend API

Node + Express + **SQLite** (using Node's built-in `node:sqlite`, so nothing needs
to be compiled and no database software has to be installed).

## Run

```
npm install
npm start        # http://localhost:8000
```

Needs **Node 22.5+** (the `start` script passes `--experimental-sqlite`).

The database is a single file, `data.db`, created automatically on first run.

## What's stored

| Table             | Holds                                              |
|-------------------|---------------------------------------------------|
| `users`           | name, email, hashed password, admin flag          |
| `projects`        | plot details + generated AI suggestions per user  |
| `material_prices` | editable price list (seeded on first run)         |

Passwords are hashed with bcrypt. Login returns a JWT that the frontend sends on
every request as `Authorization: Bearer <token>`.

## API routes (all under `/api`)

Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`
Projects: `GET /projects`, `POST /projects`, `GET /projects/:id`, `DELETE /projects/:id`
AI: `POST /ai/generate-plan`, `POST /ai/chat`
Estimation: `GET /estimation/cost/:projectId`, `GET /estimation/materials/:projectId`
Reports: `GET /reports/:projectId/pdf`
Admin: `GET /admin/users`, `DELETE /admin/users/:id`, `GET /admin/projects`,
`GET /admin/material-prices`, `PUT /admin/material-prices/:id`, `GET /admin/analytics`

## Files

- `server.js` — all API routes
- `db.js` — database connection, schema, seed data
- `logic.js` — cost/material calculations, AI suggestions, chatbot replies

## Notes

- The first user to register becomes the admin.
- Cost and material numbers are calculated from the plot area using simple
  per-square-foot rates in `logic.js` — adjust those to fit your local rates.
- The chatbot is keyword-based (no external AI service). Swap `chatReply()` in
  `logic.js` for a real API call later if you want.
