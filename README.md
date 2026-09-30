# BuildPlanAI — Frontend

React + Tailwind frontend for the AI Building Construction Planner project.
Covers all 11 modules from the spec: Landing, Login/Register/Forgot Password,
Dashboard, Plot Details, AI Suggestions, Cost Estimation, Material Estimation,
2D Floor Plan, AI Chatbot, PDF Report, and Admin Panel.

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Requests to `/api/*` are proxied to
`http://localhost:8000` (see `vite.config.js`) — point that at your
FastAPI/Flask backend.

## Project structure

```
src/
  api/client.js          # Axios instance + all backend endpoint calls
  components/
    Navbar.jsx            # Top nav (public + authenticated states)
    Sidebar.jsx            # In-project workflow sidebar (steps 1-5)
    ProtectedRoute.jsx     # Redirects to /login if no auth token
  pages/
    LandingPage.jsx        # Module 1
    Login.jsx               # Module 2
    Register.jsx
    ForgotPassword.jsx
    Dashboard.jsx           # Module 3
    PlotDetails.jsx         # Module 4
    AISuggestions.jsx       # Module 5
    CostEstimation.jsx      # Module 6
    MaterialEstimation.jsx  # Module 7
    FloorPlan.jsx           # Module 8
    Chatbot.jsx             # Module 9
    PDFReport.jsx           # Module 10
    AdminPanel.jsx          # Module 11
  App.jsx                  # Route definitions
  main.jsx                 # Entry point
  index.css                # Tailwind + design tokens
```

## Connecting the backend

Every page currently falls back to realistic mock data if the API call
fails, so the UI is fully clickable without a backend running. To wire up
real data, implement these routes on your FastAPI/Flask server (all
referenced from `src/api/client.js`):

- `POST /api/auth/login`, `/register`, `/forgot-password`
- `GET/POST /api/projects`, `GET/DELETE /api/projects/:id`
- `POST /api/ai/generate-plan`, `POST /api/ai/chat`
- `GET /api/estimation/cost/:projectId`, `/materials/:projectId`
- `GET /api/reports/:projectId/pdf` (binary PDF, built with ReportLab)
- `GET /api/admin/users`, `/projects`, `/material-prices`, `/analytics`
- `DELETE /api/admin/users/:id`, `PUT /api/admin/material-prices/:id`

Auth uses a JWT stored in `localStorage` under `bp_token`, attached
automatically to every request via an Axios interceptor.

## Design notes

Visual language is a "blueprint/drafting" theme — deep blueprint-navy
(`#0F2540`), a fine grid background evoking technical drawings, safety-amber
accent for primary actions, and dimension-line tick marks (see `.dim-line`
in `index.css`) used wherever a measurement or quantity is displayed, since
the subject matter (plot dimensions, floor plans) is literally architectural
drafting.
