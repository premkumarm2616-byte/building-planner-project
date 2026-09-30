# Presentation features added (performance-safe)

All of the following were added **without a single new npm dependency** —
everything is computed once on the server and drawn as inline SVG/CSS, so the
production bundle grew only ~6 KB gzipped. Web performance is unchanged.

On the Floor Plan page:

- **Furniture inside every room** (beds, sofas, dining set, kitchen counter,
  car, bath fixtures, staircase) — toggle on/off. Makes it read as a real
  interior-design drawing.
- **3D isometric view** of each floor — a 2D/3D switch. Pure SVG (no Three.js),
  so it's a live showstopper with no performance cost.
- **Title block + north arrow + scale** on the drawing, like a real sheet.
- **Vastu compliance** score with per-room ✓ / near / ✗ guidance (facing-aware).
- **Area metrics**: carpet vs built-up vs super-built-up + efficiency %.
- **Sustainability score**: rooftop-solar kW, rainwater-harvesting litres/year,
  EV point, green cover.
- **Material / mood board** that changes with the budget tier.
- **Home-loan EMI calculator** (interactive sliders for down-payment, rate, tenure).
- **Construction timeline** (Gantt) scaled to the built area and floors.
- **Cost-by-room** breakdown bars.
- **Export** the drawing as **SVG or PNG**.

The PDF report also now includes the Vastu score, area metrics, sustainability
figures and the estimated build time.

---



The old plan looked congested because it bin-packed every room into one grid at
100% density with poor (sliver) proportions and no measurements. It has been
rebuilt from scratch (`server/floorplan.js`):

- **Generated per floor you choose.** Living, dining, kitchen, parking and a
  guest room stay on the ground floor; bedrooms are lifted to the upper floors
  for privacy. Each floor is drawn separately (tabs in the UI).
- **Budget-driven tier.** Budget ÷ built-up area picks a tier —
  Economy / Comfort / Premium / Luxury — which decides finish level and which
  rooms appear (Premium+ adds a study, walk-in closet and per-bedroom ensuites).
- **Neat, not congested.** Rooms are placed with a squarified-treemap layout
  (near-square proportions) grouped into public / private / service zones, with
  real circulation (foyer/landing). Habitable rooms grow to use space while
  bathrooms/utility stay small; the building is right-sized to the programme and
  the leftover plot becomes garden / setback.
- **Measurements on everything.** Every room is labelled in feet-inches
  (e.g. 12'-2" × 10'-5") with an area schedule per floor; doors and windows are
  drawn, plus overall dimension lines and a scale note.
- **Export.** The active floor can be exported as an SVG.

Verified by rendering: single-floor, 2-floor, and 4-floor luxury plans all lay
out with no overlaps, in-bounds, and realistic room sizes. The PDF report now
lists every floor with room dimensions and the design tier.

---



## The bug: 2D Floor Plan never rendered (blank / crashed)

`src/pages/FloorPlan.jsx` fetched the project and did:

```js
projectApi.get(id)
  .then((res) => setRooms(res.data.floorPlan?.rooms)) // <- undefined
  .catch(() => setRooms(mockRooms))                   // <- only runs on network error
  .finally(() => setLoading(false));
```

Two things combined to break it:

1. **The backend never sent a floor plan.** `GET /api/projects/:id` returned the
   project fields and `aiSuggestions`, but there was **no `floorPlan` key** and
   **no floor-plan logic anywhere in `server/logic.js`.**
2. So `res.data.floorPlan?.rooms` was `undefined`. Because the request itself
   **succeeded**, the `.catch` (which falls back to `mockRooms`) never ran, and
   `rooms` was set to `undefined`. The component then hit `rooms.map(...)` and
   threw `TypeError: Cannot read properties of undefined (reading 'map')`,
   which blanked the page.

In the frontend-only build the same code "worked" only by accident — with no
backend running the request failed, so the `.catch` fell back to the mock. The
plan you saw was always the static mock, never derived from your inputs.

## The fix

**Backend**
- `server/logic.js` — added `generateFloorPlan(project)`. It builds the room
  list from the actual inputs (bedrooms, bathrooms, floors, parking, balcony,
  garden, facing) and a shelf-packing pass lays the rooms out in a normalized
  0–100 grid that fills the sheet with **no gaps and no overlaps** (verified for
  1–6 bedrooms / 1–5 bathrooms and every add-on combination).
- `server/server.js` — `GET /api/projects/:id` now includes `floorPlan`,
  added `GET /api/projects/:id/floor-plan`, and the PDF report now lists the
  generated rooms.

**Frontend**
- `src/pages/FloorPlan.jsx` — state now starts from a valid mock, validates the
  backend rooms (`validRooms`), and falls back to the mock when the payload is
  missing or malformed **as well as** on a network error, so it can never crash
  on `.map`. The **Export** button now actually downloads the plan as an `.svg`.

---

# Login sometimes says "Invalid email or password"

Three separate things made login look flaky:

1. **Email was case/space sensitive (main cause).** Registering as
   `John@Gmail.com` and later typing `john@gmail.com` (or a trailing space from
   autofill / a phone keyboard capitalising the first letter) did not match the
   stored row, so the backend returned "Invalid email or password" even with the
   correct password. SQLite's `WHERE email = ?` is case-sensitive by default.
2. **A hidden "demo login".** If the backend was unreachable, `Login.jsx`
   silently logged you in with a fake `demo-token` and no real account — so
   "it worked sometimes" often just meant the server was down and it faked a
   session that then couldn't load data.
3. **The database may not survive to the next day** in some setups (re-extracting
   the zip, or an ephemeral host that wipes the filesystem on restart). The code
   itself never deletes `data.db` and uses a stable path, so it persists when you
   reuse the same folder and restart the backend there.

## The fix

- `server/server.js` — emails are trimmed + lowercased on register and looked up
  with `COLLATE NOCASE` on login, so casing/spaces can never mismatch (works for
  accounts created before the fix too). Added a graceful shutdown that closes the
  DB so writes are flushed.
- `src/pages/Login.jsx` / `src/pages/Register.jsx` — removed the silent fake
  demo login; if the server is unreachable it now says so plainly. Email is
  normalized before sending.

Verified: registering `John@Gmail.com` then logging in as `john@gmail.com`,
`  JOHN@GMAIL.COM  `, etc. all succeed; wrong passwords are still rejected;
duplicate registration with different casing is blocked; and the account
survives a server restart.

> If your account still disappears overnight, it's cause #3 (environment). Tell
> me how you run it (local folder vs. a host like Render/Railway) and whether you
> re-extract the zip each time, and I'll give you the exact persistence fix.

## Run it

Backend (terminal 1):
```
cd server && npm install && npm start
```
Frontend (terminal 2):
```
npm install && npm run dev
```
Open the printed Vite URL, register (the first account becomes admin), create a
project, and walk to **Step 5 · 2D Floor Plan**.
