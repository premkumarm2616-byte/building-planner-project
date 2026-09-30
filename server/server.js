// AI Building Construction Planner — backend API
// Express + libSQL (Turso in the cloud, local file for offline dev).
// Serves the exact /api routes the React app calls, and also serves the built
// React site so the whole app runs from this one server.
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { all, get, run, initDb, client } from './db.js';
import {
  estimateCost,
  estimateMaterials,
  generateSuggestions,
  chatReply,
  relativeTime,
} from './logic.js';
import { generateFloorPlan } from './floorplan.js';

const app = express();
const PORT = process.env.PORT || 8000;
// Set JWT_SECRET in the host's environment for production; this is the dev default.
const JWT_SECRET = process.env.JWT_SECRET || 'buildplan-ai-dev-secret-change-me';

app.use(cors());
app.use(express.json());

// Wrap an async route so any thrown error becomes a clean 500 instead of crashing.
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'Server error. Please try again.' });
  });

// ---------- helpers ----------
// Normalize emails so casing / stray whitespace can never cause a login mismatch.
function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, isAdmin: !!u.is_admin };
}

// Auth guard: requires a valid "Authorization: Bearer <token>" header.
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ message: 'Session expired. Please log in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

// Convert a DB project row into the shape the frontend expects.
function projectSummary(row) {
  return {
    id: row.id,
    name: row.name,
    plotLength: row.plot_length,
    plotWidth: row.plot_width,
    floors: row.floors,
    status: row.status,
    updatedAt: relativeTime(row.updated_at),
  };
}

function projectFull(row) {
  return {
    ...projectSummary(row),
    facing: row.facing,
    budget: row.budget,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: !!row.parking,
    garden: !!row.garden,
    balcony: !!row.balcony,
    aiSuggestions: row.ai_suggestions ? JSON.parse(row.ai_suggestions) : null,
    floorPlan: generateFloorPlan(row),
  };
}

async function getOwnedProject(id, user) {
  const row = await get('SELECT * FROM projects WHERE id = ?', [Number(id)]);
  if (!row) return { error: 404 };
  if (row.user_id !== user.id && !user.is_admin) return { error: 403 };
  return { row };
}

// =================================================================
//  AUTH
// =================================================================
app.post('/api/auth/register', h(async (req, res) => {
  const { name, password } = req.body || {};
  const email = normEmail(req.body?.email);
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  const exists = await get('SELECT id FROM users WHERE email = ? COLLATE NOCASE', [email]);
  if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const first = await get('SELECT COUNT(*) AS n FROM users');
  const isFirst = !first || Number(first.n) === 0;
  const info = await run(
    'INSERT INTO users (name, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
    [name, email, hash, isFirst ? 1 : 0, new Date().toISOString()]
  );
  const user = await get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

app.post('/api/auth/login', h(async (req, res) => {
  const { password } = req.body || {};
  const email = normEmail(req.body?.email);
  const user = await get('SELECT * FROM users WHERE email = ? COLLATE NOCASE', [email]);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

app.post('/api/auth/forgot-password', h(async (req, res) => {
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
}));

// =================================================================
//  PROJECTS
// =================================================================
app.get('/api/projects', auth, h(async (req, res) => {
  const rows = await all('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
  res.json(rows.map(projectSummary));
}));

app.post('/api/projects', auth, h(async (req, res) => {
  const f = req.body || {};
  const now = new Date().toISOString();
  const name =
    f.name || `${f.facing || 'North'}-facing ${f.plotWidth || '?'}×${f.plotLength || '?'} ft Plot`;
  const info = await run(
    `INSERT INTO projects
      (user_id, name, plot_length, plot_width, floors, facing, budget,
       bedrooms, bathrooms, parking, garden, balcony, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      name,
      Number(f.plotLength) || null,
      Number(f.plotWidth) || null,
      Number(f.floors) || 1,
      f.facing || 'North',
      Number(f.budget) || null,
      Number(f.bedrooms) || 0,
      Number(f.bathrooms) || 0,
      f.parking ? 1 : 0,
      f.garden ? 1 : 0,
      f.balcony ? 1 : 0,
      'In Progress',
      now,
      now,
    ]
  );
  const row = await get('SELECT * FROM projects WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(projectFull(row));
}));

app.get('/api/projects/:id', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.id, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  if (!row.ai_suggestions) {
    const suggestions = generateSuggestions(row);
    await run('UPDATE projects SET ai_suggestions = ? WHERE id = ?', [JSON.stringify(suggestions), row.id]);
    row.ai_suggestions = JSON.stringify(suggestions);
  }
  res.json(projectFull(row));
}));

app.get('/api/projects/:id/floor-plan', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.id, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  res.json(generateFloorPlan(row));
}));

app.delete('/api/projects/:id', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.id, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  await run('DELETE FROM projects WHERE id = ?', [row.id]);
  res.json({ message: 'Project deleted.' });
}));

// =================================================================
//  AI
// =================================================================
app.post('/api/ai/generate-plan', auth, h(async (req, res) => {
  const { projectId } = req.body || {};
  const { row, error } = await getOwnedProject(projectId, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  const suggestions = generateSuggestions(row);
  await run('UPDATE projects SET ai_suggestions = ?, status = ?, updated_at = ? WHERE id = ?', [
    JSON.stringify(suggestions), 'In Progress', new Date().toISOString(), row.id,
  ]);
  res.json({ aiSuggestions: suggestions });
}));

app.post('/api/ai/chat', h(async (req, res) => {
  const { message } = req.body || {};
  res.json({ reply: chatReply(message) });
}));

// =================================================================
//  ESTIMATION
// =================================================================
app.get('/api/estimation/cost/:projectId', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.projectId, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  res.json(estimateCost(row));
}));

app.get('/api/estimation/materials/:projectId', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.projectId, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });
  res.json(estimateMaterials(row));
}));

// =================================================================
//  REPORTS (PDF)
// =================================================================
app.get('/api/reports/:projectId/pdf', auth, h(async (req, res) => {
  const { row, error } = await getOwnedProject(req.params.projectId, req.user);
  if (error) return res.status(error).json({ message: 'Project not found.' });

  const cost = estimateCost(row);
  const total = cost.items.reduce((s, i) => s + i.amount, 0);
  const materials = estimateMaterials(row);
  const ai = row.ai_suggestions ? JSON.parse(row.ai_suggestions) : generateSuggestions(row);
  const floorPlan = generateFloorPlan(row);
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="BuildPlanAI-Report-${row.id}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(22).fillColor('#0f2942').text('BuildPlanAI', { continued: true });
  doc.fillColor('#e0932f').text('  Construction Plan Report');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#666').text(`Project #${row.id} · ${row.name}`);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`);
  doc.moveDown();

  const heading = (t) => {
    doc.moveDown(0.6).fontSize(14).fillColor('#0f2942').text(t);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0932f').stroke();
    doc.moveDown(0.4).fontSize(10).fillColor('#222');
  };

  heading('Plot Information');
  doc.text(`Dimensions: ${row.plot_width} ft (width) × ${row.plot_length} ft (length)`);
  doc.text(`Plot area: ${((row.plot_length || 0) * (row.plot_width || 0)).toLocaleString('en-IN')} sq ft`);
  doc.text(`Floors: ${row.floors}   Facing: ${row.facing}`);
  doc.text(`Bedrooms: ${row.bedrooms}   Bathrooms: ${row.bathrooms}`);
  doc.text(`Parking: ${row.parking ? 'Yes' : 'No'}   Garden: ${row.garden ? 'Yes' : 'No'}   Balcony: ${row.balcony ? 'Yes' : 'No'}`);

  heading('Cost Estimation');
  cost.items.forEach((i) => doc.text(`${i.label}: ${inr(i.amount)}`));
  doc.moveDown(0.3).fontSize(11).fillColor('#0f2942').text(`Total Estimated Cost: ${inr(total)}`);

  heading('Material List');
  materials.forEach((m) => doc.text(`${m.name}: ${m.quantity.toLocaleString('en-IN')} ${m.unit}`));

  heading('Floor Plan & Design Brief');
  doc.text(`Design tier: ${floorPlan.tierLabel}${floorPlan.budgetPerSqft ? `  (approx. ₹${floorPlan.budgetPerSqft}/sq ft)` : ''}`);
  doc.text(`Plot ${floorPlan.plot.width}′ × ${floorPlan.plot.length}′   ·   Built-up ≈ ${floorPlan.building.totalArea.toLocaleString('en-IN')} sq ft across ${floorPlan.floors.length} floor(s)`);
  doc.moveDown(0.2).fontSize(9.5).fillColor('#555').text(floorPlan.designerNote);
  doc.fillColor('#222').fontSize(10);
  doc.moveDown(0.3).fontSize(10).fillColor('#0f2942').text('Design analysis');
  doc.fontSize(9.5).fillColor('#222');
  doc.text(`   • Vastu compliance: ${floorPlan.vastu.score}% (${floorPlan.vastu.rating})`);
  doc.text(`   • Carpet ${floorPlan.metrics.carpet.toLocaleString('en-IN')} sqft · Built-up ${floorPlan.metrics.builtUp.toLocaleString('en-IN')} sqft · Efficiency ${floorPlan.metrics.efficiency}%`);
  doc.text(`   • Sustainability: ${floorPlan.sustainability.score}/100 (${floorPlan.sustainability.rating}) — ${floorPlan.sustainability.solarKw} kW solar, rainwater ≈ ${floorPlan.sustainability.rainwaterLitresPerYear.toLocaleString('en-IN')} L/yr`);
  doc.text(`   • Estimated build time: ≈ ${floorPlan.timeline.totalMonths} months (${floorPlan.timeline.totalWeeks} weeks)`);
  floorPlan.floors.forEach((fl) => {
    doc.moveDown(0.3).fontSize(11).fillColor('#0f2942').text(`${fl.name} (${fl.widthFt}′ × ${fl.depthFt}′)`);
    doc.fontSize(9.5).fillColor('#222');
    fl.rooms.forEach((r) => doc.text(`   • ${r.name} — ${r.dim}  (${r.areaSqft} sq ft)`));
  });
  doc.fontSize(10).fillColor('#222');

  heading('AI Recommendations');
  doc.text('Suggested room sizes:');
  ai.roomSizes.forEach((r) => doc.text(`  • ${r.name} — ${r.size}`));
  doc.moveDown(0.3).text(`Arrangement: ${ai.arrangement}`);
  doc.moveDown(0.3).text('Optimization tips:');
  ai.optimizationTips.forEach((t) => doc.text(`  • ${t}`));
  doc.moveDown(0.3).text(`Ventilation: ${ai.ventilation}`);
  doc.moveDown(0.3).text('Vastu notes:');
  ai.vastuNotes.forEach((v) => doc.text(`  • ${v}`));

  doc.moveDown().fontSize(8).fillColor('#999')
    .text('This is an AI-generated preliminary estimate. Consult a licensed engineer before construction.', { align: 'center' });

  doc.end();
}));

// =================================================================
//  ADMIN
// =================================================================
app.get('/api/admin/users', auth, h(async (req, res) => {
  const rows = await all(
    `SELECT u.id, u.name, u.email, u.created_at AS joined,
            (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS projects
     FROM users u ORDER BY u.id`
  );
  res.json(rows.map((r) => ({
    id: r.id, name: r.name, email: r.email,
    joined: (r.joined || '').slice(0, 10), projects: r.projects,
  })));
}));

app.delete('/api/admin/users/:id', auth, h(async (req, res) => {
  await run('DELETE FROM users WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'User deleted.' });
}));

app.get('/api/admin/projects', auth, h(async (req, res) => {
  const rows = await all(
    `SELECT p.id, p.name, p.plot_length, p.plot_width, p.status, u.name AS owner
     FROM projects p JOIN users u ON u.id = p.user_id ORDER BY p.id`
  );
  res.json(rows.map((r) => ({
    id: r.id, name: r.name, owner: r.owner,
    plotSize: `${r.plot_width || '?'}×${r.plot_length || '?'} ft`, status: r.status,
  })));
}));

app.get('/api/admin/material-prices', auth, h(async (req, res) => {
  res.json(await all('SELECT id, name, unit, price FROM material_prices ORDER BY id'));
}));

app.put('/api/admin/material-prices/:id', auth, h(async (req, res) => {
  const { price } = req.body || {};
  await run('UPDATE material_prices SET price = ? WHERE id = ?', [Number(price) || 0, Number(req.params.id)]);
  res.json(await get('SELECT id, name, unit, price FROM material_prices WHERE id = ?', [Number(req.params.id)]));
}));

app.get('/api/admin/analytics', auth, h(async (req, res) => {
  const u = await get('SELECT COUNT(*) AS n FROM users');
  const p = await get('SELECT COUNT(*) AS n FROM projects');
  res.json([
    { label: 'Total Users', value: String(u?.n ?? 0), change: 'live count' },
    { label: 'Total Projects', value: String(p?.n ?? 0), change: 'live count' },
    { label: 'Database', value: 'libSQL', change: 'Turso cloud (persistent)' },
  ]);
}));

// ---------- health check ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------- serve the built React app (single-server mode) ----------
const distPath = path.join(__dirname, '..', 'dist');
const hasBuild = fs.existsSync(path.join(distPath, 'index.html'));
if (hasBuild) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ---------- start (after the database is ready) ----------
initDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`\n  BuildPlanAI running:  http://localhost:${PORT}`);
      console.log(`  Database: ${process.env.TURSO_DATABASE_URL ? 'Turso cloud (persistent)' : 'local file (server/local.db)'}`);
      if (hasBuild) console.log('  Mode: single server (frontend + API on one port).');
      else console.log('  Mode: API only. Run "npm run build" for single-server mode.');
      console.log('');
    });

    function shutdown() {
      try { client.close(); } catch { /* ignore */ }
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000).unref();
    }
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('Failed to initialise the database:', err);
    process.exit(1);
  });
