import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Loader2, Download, Image as ImageIcon, Home, Ruler, Compass,
  Leaf, IndianRupee, CalendarClock, Sofa, Box, Palette,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { projectApi } from '../api/client.js';

const WALL = '#2A3442';

/* ----------------------------- fallback plan ----------------------------- */
const FALLBACK = {
  tierLabel: 'Comfort', budgetPerSqft: null, builtAreaTotal: 884, facing: 'North',
  designerNote: 'Sample layout shown (backend unavailable).',
  scaleNote: 'Sample layout.',
  plot: { width: 30, length: 40, area: 1200 },
  building: { width: 26, length: 34, setback: 3, area: 884, totalArea: 884, gardenMarginW: 2, gardenMarginL: 3 },
  legend: [
    { type: 'living', label: 'Living', fill: '#DCEAF7' }, { type: 'kitchen', label: 'Kitchen', fill: '#FBE7C6' },
    { type: 'master', label: 'Master Bedroom', fill: '#DDE7F6' }, { type: 'bath', label: 'Bath', fill: '#E9E1F4' },
  ],
  floors: [{
    level: 0, name: 'Ground Floor', widthFt: 26, depthFt: 34,
    rooms: [
      { name: 'Living', type: 'living', x: 0, y: 0, w: 15, h: 18, areaSqft: 270, dim: "15'-0\" \u00D7 18'-0\"" },
      { name: 'Kitchen', type: 'kitchen', x: 15, y: 0, w: 11, h: 10, areaSqft: 110, dim: "11'-0\" \u00D7 10'-0\"" },
      { name: 'Master Bedroom', type: 'master', x: 15, y: 10, w: 11, h: 12, areaSqft: 132, dim: "11'-0\" \u00D7 12'-0\"" },
      { name: 'Bath', type: 'bath', x: 15, y: 22, w: 11, h: 12, areaSqft: 132, dim: "11'-0\" \u00D7 12'-0\"" },
      { name: 'Dining', type: 'living', x: 0, y: 18, w: 15, h: 16, areaSqft: 240, dim: "15'-0\" \u00D7 16'-0\"" },
    ], doors: [], windows: [],
  }],
  vastu: { score: 82, rating: 'Excellent', facing: 'North', checks: [], note: '' },
  metrics: { carpet: 725, builtUp: 884, superBuiltUp: 1105, efficiency: 66 },
  sustainability: { score: 78, rating: 'Efficient', features: ['Rooftop solar-ready', 'Rainwater harvesting', 'Cross-ventilated rooms'] },
  moodboard: { flooring: [{ name: 'Vitrified tile', hex: '#E8E2D6' }], walls: [{ name: 'Warm white', hex: '#F3EEE6' }], kitchen: [{ name: 'Granite top', hex: '#5B5750' }], joinery: [{ name: 'Flush doors', hex: '#9A6B44' }] },
  timeline: { totalWeeks: 30, totalMonths: 6.9, phases: [] },
  roomCosts: { totalCost: 0, top: [] },
};

/* ------------------------- furniture geometry ---------------------------- */
function furnitureFor(type, w, h) {
  const F = [];
  const rect = (x, y, rw, rh, o = {}) => F.push({ k: 'rect', x, y, w: rw, h: rh, ...o });
  const line = (x1, y1, x2, y2) => F.push({ k: 'line', x1, y1, x2, y2 });
  const circ = (x, y, r) => F.push({ k: 'circ', x, y, r });
  const cx = w / 2, cy = h / 2, min = Math.min(w, h);
  if (w < 4 || h < 4) return F;
  switch (type) {
    case 'master': case 'bedroom': case 'guest': {
      const bw = Math.min(6, w - 2), bh = Math.min(6.5, h - 2), bx = cx - bw / 2, by = 0.6;
      rect(bx, by, bw, bh, { r: 0.4 }); rect(bx + 0.3, by + 0.3, bw - 0.6, 1.4, { fill: 1 });
      rect(bx - 1.4, by, 1.2, 1.2); rect(bx + bw + 0.2, by, 1.2, 1.2);
      if (h - by - bh > 2.4) rect(cx - 2, h - 2, 4, 1.6, { fill: 1 }); break;
    }
    case 'living': case 'lounge': {
      rect(0.6, h - 2.6, Math.min(7, w - 1.2), 2, { r: 0.3 }); rect(0.6, h - 6.4, 2, 3.8, { r: 0.3 });
      rect(cx - 1.5, cy - 0.6, 3, 1.6, { r: 0.2, fill: 1 }); rect(cx - 2.5, 0.5, 5, 0.5, { fill: 2 }); break;
    }
    case 'dining': {
      const tw = Math.min(5, w - 2.5), th = Math.min(3, h - 2.5);
      rect(cx - tw / 2, cy - th / 2, tw, th, { r: 0.3 });
      for (let i = 0; i < 3; i++) { circ(cx - tw / 2 + (i + 0.5) * (tw / 3), cy - th / 2 - 0.9, 0.5); circ(cx - tw / 2 + (i + 0.5) * (tw / 3), cy + th / 2 + 0.9, 0.5); } break;
    }
    case 'kitchen': { rect(0.4, 0.4, w - 0.8, 1.6, { fill: 2 }); rect(0.4, 0.4, 1.6, h - 0.8, { fill: 2 }); circ(1.2, cy, 0.7); rect(w - 3, 0.7, 1.6, 1); break; }
    case 'bath': { rect(0.4, 0.4, 1.4, 1.9, { r: 0.3 }); rect(w - 2, 0.4, 1.6, 1, { r: 0.2 }); if (min > 5) rect(w - 3, h - 3, 2.6, 2.6, { dash: 1 }); break; }
    case 'parking': { const cw = Math.min(6, w - 1.5), ch = Math.min(11, h - 1.5); rect(cx - cw / 2, cy - ch / 2, cw, ch, { r: 1.2, fill: 2 }); break; }
    case 'study': { rect(0.5, 0.5, Math.min(4, w - 1), 1.8, { r: 0.2 }); circ(1.5, 3, 0.7); break; }
    case 'stair': { const n = 7; for (let i = 1; i < n; i++) line((i / n) * w, 0.4, (i / n) * w, h - 0.4); line(w / 2, 0.4, w / 2, h - 0.4); break; }
    case 'pooja': { rect(cx - 1, 0.5, 2, 1.4, { r: 0.2, fill: 1 }); break; }
    case 'utility': { rect(0.5, 0.5, 1.8, 1.8, { r: 0.3 }); circ(1.4, 1.4, 0.6); break; }
    case 'balcony': case 'terrace': case 'garden': { circ(1.4, 1.4, 0.8); circ(w - 1.4, h - 1.4, 0.8); break; }
    default: break;
  }
  return F;
}

/* --------------------------- 2D svg builder ------------------------------ */
function build2D(plan, floor, showFurniture) {
  const PAD = 46, SC = 12, W = floor.widthFt, D = floor.depthFt, px = (v) => v * SC;
  const vbW = px(W) + PAD * 2, vbH = px(D) + PAD * 2 + 70;
  const fillOf = (t) => (plan.legend.find((l) => l.type === t) || {}).fill || '#EEE';
  const P = [`<rect width="100%" height="100%" fill="#FBFAF7"/>`];
  const fstroke = '#6B7480';
  for (const r of floor.rooms) {
    P.push(`<rect x="${PAD + px(r.x)}" y="${PAD + px(r.y)}" width="${px(r.w)}" height="${px(r.h)}" fill="${fillOf(r.type)}" stroke="${WALL}" stroke-width="2.2"/>`);
    if (showFurniture) {
      const bx = PAD + px(r.x), by = PAD + px(r.y);
      for (const f of furnitureFor(r.type, r.w, r.h)) {
        if (f.k === 'rect') { const fl = f.fill === 1 ? '#EFEFEA' : f.fill === 2 ? '#D6DBE0' : 'none'; P.push(`<rect x="${(bx + px(f.x)).toFixed(1)}" y="${(by + px(f.y)).toFixed(1)}" width="${px(f.w).toFixed(1)}" height="${px(f.h).toFixed(1)}" rx="${px(f.r || 0).toFixed(1)}" fill="${fl}" stroke="${fstroke}" stroke-width="1" ${f.dash ? 'stroke-dasharray="3 2"' : ''}/>`); }
        else if (f.k === 'line') P.push(`<line x1="${(bx + px(f.x1)).toFixed(1)}" y1="${(by + px(f.y1)).toFixed(1)}" x2="${(bx + px(f.x2)).toFixed(1)}" y2="${(by + px(f.y2)).toFixed(1)}" stroke="${fstroke}" stroke-width="1"/>`);
        else if (f.k === 'circ') P.push(`<circle cx="${(bx + px(f.x)).toFixed(1)}" cy="${(by + px(f.y)).toFixed(1)}" r="${px(f.r).toFixed(1)}" fill="none" stroke="${fstroke}" stroke-width="1"/>`);
      }
    }
    const cx = PAD + px(r.x + r.w / 2), cy = PAD + px(r.y + r.h / 2), small = r.w * r.h < 55;
    P.push(`<text x="${cx}" y="${cy - (small ? 1 : 5)}" text-anchor="middle" font-family="Inter,Arial" font-size="${small ? 8 : 10.5}" font-weight="600" fill="#20303F">${r.name}</text>`);
    if (!small) P.push(`<text x="${cx}" y="${cy + 9}" text-anchor="middle" font-family="Inter,Arial" font-size="8" fill="#5B6672">${r.dim}</text>`);
  }
  P.push(`<rect x="${PAD}" y="${PAD}" width="${px(W)}" height="${px(D)}" fill="none" stroke="${WALL}" stroke-width="4.5"/>`);
  for (const w of floor.windows || []) P.push(`<rect x="${PAD + px(w.x)}" y="${PAD + px(w.y)}" width="${px(w.w)}" height="${px(w.h)}" fill="#fff" stroke="#4C82C3" stroke-width="1.6"/>`);
  for (const d of floor.doors || []) P.push(`<rect x="${PAD + px(d.x)}" y="${PAD + px(d.y)}" width="${px(d.w)}" height="${px(d.h)}" fill="#fff"/>`);
  const nx = vbW - PAD - 6, ny = PAD + 4;
  P.push(`<circle cx="${nx}" cy="${ny + 8}" r="12" fill="#fff" stroke="#98A2B0"/><path d="M ${nx} ${ny} L ${nx - 4} ${ny + 12} L ${nx} ${ny + 9} L ${nx + 4} ${ny + 12} Z" fill="#B23B3B"/><text x="${nx}" y="${ny + 22}" text-anchor="middle" font-size="7" font-family="Inter,Arial" fill="#5B6672">N</text>`);
  const tbY = PAD + px(D) + 20, c1 = PAD + px(W) * 0.58, c2 = PAD + px(W) * 0.82;
  P.push(`<rect x="${PAD}" y="${tbY}" width="${px(W)}" height="40" fill="#fff" stroke="#98A2B0"/>`);
  P.push(`<line x1="${c1}" y1="${tbY}" x2="${c1}" y2="${tbY + 40}" stroke="#D5D9DE"/><line x1="${c2}" y1="${tbY}" x2="${c2}" y2="${tbY + 40}" stroke="#D5D9DE"/>`);
  P.push(`<text x="${PAD + 8}" y="${tbY + 16}" font-size="10" font-weight="700" font-family="Inter,Arial" fill="#16233A">BuildPlan AI — ${floor.name}</text>`);
  P.push(`<text x="${PAD + 8}" y="${tbY + 30}" font-size="8" font-family="Inter,Arial" fill="#5B6672">${plan.tierLabel} · ${plan.facing}-facing</text>`);
  P.push(`<text x="${c1 + 8}" y="${tbY + 16}" font-size="8" font-family="Inter,Arial" fill="#5B6672">Scale 1:100</text>`);
  P.push(`<text x="${c1 + 8}" y="${tbY + 30}" font-size="8" font-family="Inter,Arial" fill="#5B6672">Dwg. FP-0${floor.level + 1}</text>`);
  P.push(`<text x="${c2 + 6}" y="${tbY + 15}" font-size="7.5" font-family="Inter,Arial" fill="#5B6672">Vastu</text>`);
  P.push(`<text x="${c2 + 6}" y="${tbY + 31}" font-size="12" font-weight="700" font-family="Inter,Arial" fill="#2E7D52">${plan.vastu.score}%</text>`);
  return { inner: P.join(''), vbW, vbH };
}

/* -------------------------- isometric builder ---------------------------- */
function buildISO(plan, floor) {
  const SC = 11, W = floor.widthFt, D = floor.depthFt, ax = 0.86, ay = 0.5;
  const project = (x, y, z) => ({ X: (x - y) * ax * SC, Y: (x + y) * ay * SC - z * SC });
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
  const fillOf = (t) => (plan.legend.find((l) => l.type === t) || {}).fill || '#EEE';
  const rooms = floor.rooms.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const pts = [];
  [[0, 0], [W, 0], [0, D], [W, D]].forEach(([x, y]) => { pts.push(project(x, y, 9)); pts.push(project(x, y, 0)); });
  const minX = Math.min(...pts.map(p => p.X)), maxX = Math.max(...pts.map(p => p.X));
  const minY = Math.min(...pts.map(p => p.Y)), maxY = Math.max(...pts.map(p => p.Y));
  const offX = -minX + 30, offY = -minY + 44;
  const S = (p) => `${(p.X + offX).toFixed(1)},${(p.Y + offY).toFixed(1)}`;
  const P = [`<rect width="100%" height="100%" fill="#FBFAF7"/>`];
  for (const r of rooms) {
    const c = fillOf(r.type), x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
    const wh = ['balcony', 'terrace', 'garden', 'parking'].includes(r.type) ? 1.5 : 3.2;
    P.push(`<polygon points="${S(project(x0, y0, 0))} ${S(project(x1, y0, 0))} ${S(project(x1, y1, 0))} ${S(project(x0, y1, 0))}" fill="${shade(c, 0.97)}" stroke="#2A3442" stroke-width="0.6"/>`);
    P.push(`<polygon points="${S(project(x1, y0, 0))} ${S(project(x1, y1, 0))} ${S(project(x1, y1, wh))} ${S(project(x1, y0, wh))}" fill="${shade(c, 0.78)}" stroke="#2A3442" stroke-width="0.5"/>`);
    P.push(`<polygon points="${S(project(x0, y1, 0))} ${S(project(x1, y1, 0))} ${S(project(x1, y1, wh))} ${S(project(x0, y1, wh))}" fill="${shade(c, 0.87)}" stroke="#2A3442" stroke-width="0.5"/>`);
    const mid = project(r.x + r.w / 2, r.y + r.h / 2, 0);
    if (r.w * r.h > 60) P.push(`<text x="${(mid.X + offX).toFixed(1)}" y="${(mid.Y + offY).toFixed(1)}" text-anchor="middle" font-family="Inter,Arial" font-size="7.5" font-weight="600" fill="#20303F">${r.name}</text>`);
  }
  const vbW = maxX - minX + 60, vbH = maxY - minY + 84;
  return { inner: P.join(''), vbW, vbH };
}

/* ------------------------------- page ------------------------------------ */
export default function FloorPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [active, setActive] = useState(0);
  const [view, setView] = useState('2d');
  const [furniture, setFurniture] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    projectApi.get(id)
      .then((res) => { if (!cancelled) { const fp = res?.data?.floorPlan; setPlan(fp && Array.isArray(fp.floors) && fp.floors.length ? fp : FALLBACK); } })
      .catch(() => { if (!cancelled) setPlan(FALLBACK); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const floor = plan ? plan.floors[Math.min(active, plan.floors.length - 1)] : null;
  const svg = useMemo(() => {
    if (!plan || !floor) return null;
    return view === '3d' ? buildISO(plan, floor) : build2D(plan, floor, furniture);
  }, [plan, floor, view, furniture]);

  const download = (href, name) => { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  const exportSVG = () => {
    if (!svgRef.current) return;
    const src = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svgRef.current);
    const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    download(url, `floor-plan-${floor.name.replace(/\s+/g, '-').toLowerCase()}.svg`); URL.revokeObjectURL(url);
  };
  const exportPNG = () => {
    if (!svgRef.current || !svg) return;
    const src = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    img.onload = () => {
      const s = 2, cv = document.createElement('canvas');
      cv.width = svg.vbW * s; cv.height = svg.vbH * s;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.scale(s, s);
      ctx.drawImage(img, 0, 0);
      download(cv.toDataURL('image/png'), `floor-plan-${floor.name.replace(/\s+/g, '-').toLowerCase()}.png`);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(src)));
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
          <p className="font-mono text-xs tracking-widest text-blueprint-700 mb-2">STEP 5 OF 5</p>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h1 className="font-display text-2xl font-semibold text-blueprint-950">2D / 3D Floor Plan</h1>
            {plan && (
              <div className="flex gap-2">
                <button onClick={exportSVG} className="btn-outline text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> SVG</button>
                <button onClick={exportPNG} className="btn-outline text-sm flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> PNG</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-ink/50 text-sm mt-8"><Loader2 className="w-4 h-4 animate-spin" /> Designing your layout…</div>
          ) : plan && (
            <>
              {/* metric badges */}
              <div className="flex flex-wrap gap-2.5 mt-3 mb-4">
                <Badge icon={<Home className="w-3.5 h-3.5" />} label="Tier" value={plan.tierLabel} />
                {plan.budgetPerSqft && <Badge icon={<IndianRupee className="w-3.5 h-3.5" />} label="Rate" value={`₹${plan.budgetPerSqft.toLocaleString('en-IN')}/sqft`} />}
                <Badge icon={<Ruler className="w-3.5 h-3.5" />} label="Built-up" value={`${plan.building.totalArea.toLocaleString('en-IN')} sqft`} />
                <Badge label="Carpet" value={`${plan.metrics.carpet.toLocaleString('en-IN')} sqft`} />
                <Badge label="Efficiency" value={`${plan.metrics.efficiency}%`} />
                <Badge icon={<Compass className="w-3.5 h-3.5" />} label="Vastu" value={`${plan.vastu.score}%`} tone={plan.vastu.score >= 65 ? 'green' : 'amber'} />
                <Badge icon={<Leaf className="w-3.5 h-3.5" />} label="Green" value={`${plan.sustainability.score}`} tone="green" />
              </div>

              {plan.designerNote && (
                <div className="card p-4 mb-5 border-l-4 border-l-amber-500">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blueprint-900/50 mb-1">Designer’s note</p>
                  <p className="text-sm text-ink/80 leading-relaxed">{plan.designerNote}</p>
                </div>
              )}

              {/* controls */}
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  {plan.floors.map((f, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${i === active ? 'bg-blueprint-700 text-white border-blueprint-700' : 'bg-white text-blueprint-700 border-blueprint-900/15 hover:bg-blueprint-50'}`}>{f.name}</button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="inline-flex rounded-lg border border-blueprint-900/15 overflow-hidden">
                    <ToggleBtn active={view === '2d'} onClick={() => setView('2d')} icon={<Sofa className="w-4 h-4" />} label="2D" />
                    <ToggleBtn active={view === '3d'} onClick={() => setView('3d')} icon={<Box className="w-4 h-4" />} label="3D" />
                  </div>
                  {view === '2d' && (
                    <label className="flex items-center gap-1.5 text-sm text-ink/70 cursor-pointer select-none">
                      <input type="checkbox" checked={furniture} onChange={(e) => setFurniture(e.target.checked)} className="accent-blueprint-700" /> Furniture
                    </label>
                  )}
                </div>
              </div>

              {/* the drawing */}
              <div className="card p-4 sm:p-6">
                {svg && (
                  <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${svg.vbW} ${svg.vbH}`} className="w-full h-auto" dangerouslySetInnerHTML={{ __html: svg.inner }} />
                )}
              </div>

              {/* legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                {plan.legend.map((l) => (
                  <span key={l.type} className="flex items-center gap-1.5 text-xs font-medium text-ink/70">
                    <span className="w-3 h-3 rounded-sm border border-blueprint-900/20" style={{ background: l.fill }} /> {l.label}
                  </span>
                ))}
              </div>

              {/* intelligence panels */}
              <div className="grid md:grid-cols-2 gap-5 mt-8">
                <VastuCard vastu={plan.vastu} />
                <SustainabilityCard s={plan.sustainability} />
                <MoodboardCard mood={plan.moodboard} tier={plan.tierLabel} />
                <EmiCard budget={plan.roomCosts?.totalCost || (plan.budgetPerSqft ? plan.budgetPerSqft * plan.building.totalArea : 5000000)} />
                <TimelineCard t={plan.timeline} />
                <RoomCostCard rc={plan.roomCosts} />
              </div>

              {/* room schedule */}
              <div className="card mt-6 overflow-hidden">
                <div className="px-4 py-2.5 bg-blueprint-50 border-b border-blueprint-900/10">
                  <p className="text-sm font-semibold text-blueprint-950">{floor.name} · Room schedule</p>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-ink/50 text-xs uppercase tracking-wide">
                    <th className="px-4 py-2 font-semibold">Room</th><th className="px-4 py-2 font-semibold">Dimensions</th><th className="px-4 py-2 font-semibold text-right">Area</th>
                  </tr></thead>
                  <tbody>
                    {floor.rooms.map((r, i) => (
                      <tr key={i} className="border-t border-blueprint-900/5">
                        <td className="px-4 py-2 font-medium text-ink/90">{r.name}</td>
                        <td className="px-4 py-2 text-ink/70 font-mono text-xs">{r.dim}</td>
                        <td className="px-4 py-2 text-right text-ink/70">{r.areaSqft} sqft</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-ink/45 mt-3">{plan.scaleNote}</p>
              <button onClick={() => navigate(`/project/${id}/report`)} className="btn-primary flex items-center gap-2 mt-8">
                Continue to PDF Report <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------ sub-components ---------------------------- */
function Badge({ icon, label, value, tone }) {
  const toneCls = tone === 'green' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-blueprint-950';
  return (
    <span className="inline-flex items-center gap-1.5 bg-white border border-blueprint-900/10 rounded-full px-3.5 py-1.5 text-sm">
      {icon}<span className="text-ink/50 text-xs">{label}</span><span className={`font-semibold ${toneCls}`}>{value}</span>
    </span>
  );
}
function ToggleBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium ${active ? 'bg-blueprint-700 text-white' : 'bg-white text-blueprint-700 hover:bg-blueprint-50'}`}>{icon}{label}</button>
  );
}
function CardHead({ icon, title, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-semibold text-blueprint-950 flex items-center gap-2">{icon}{title}</p>{right}
    </div>
  );
}
function VastuCard({ vastu }) {
  const dot = (s) => (s === 'ok' ? 'bg-emerald-500' : s === 'near' ? 'bg-amber-400' : 'bg-rose-400');
  return (
    <div className="card p-5">
      <CardHead icon={<Compass className="w-4 h-4 text-blueprint-700" />} title="Vastu compliance"
        right={<span className="text-lg font-bold text-emerald-700">{vastu.score}% <span className="text-xs font-medium text-ink/50">{vastu.rating}</span></span>} />
      <div className="space-y-1.5">
        {(vastu.checks || []).map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${dot(c.status)}`} />
            <span className="text-ink/80 font-medium">{c.room}</span>
            <span className="text-ink/45 ml-auto">{c.actual}{c.status !== 'ok' ? ` · ideal ${c.ideal}` : ''}</span>
          </div>
        ))}
      </div>
      {vastu.note && <p className="text-[11px] text-ink/40 mt-3 leading-snug">{vastu.note}</p>}
    </div>
  );
}
function SustainabilityCard({ s }) {
  return (
    <div className="card p-5">
      <CardHead icon={<Leaf className="w-4 h-4 text-emerald-600" />} title="Sustainability"
        right={<span className="text-lg font-bold text-emerald-700">{s.score}/100 <span className="text-xs font-medium text-ink/50">{s.rating}</span></span>} />
      <div className="h-2 rounded-full bg-blueprint-900/10 overflow-hidden mb-3"><div className="h-full bg-emerald-500" style={{ width: `${s.score}%` }} /></div>
      <ul className="space-y-1.5">
        {s.features.map((f, i) => (<li key={i} className="flex items-start gap-2 text-xs text-ink/75"><Leaf className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{f}</li>))}
      </ul>
    </div>
  );
}
function MoodboardCard({ mood, tier }) {
  const rows = [['Flooring', mood.flooring], ['Walls', mood.walls], ['Kitchen', mood.kitchen], ['Joinery', mood.joinery]];
  return (
    <div className="card p-5">
      <CardHead icon={<Palette className="w-4 h-4 text-blueprint-700" />} title={`Material palette · ${tier}`} />
      <div className="space-y-2.5">
        {rows.map(([label, sw]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-ink/55 w-16 shrink-0">{label}</span>
            <div className="flex gap-1.5 flex-wrap">
              {(sw || []).map((c, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] text-ink/70 border border-blueprint-900/10 rounded-full pr-2">
                  <span className="w-5 h-5 rounded-full border border-blueprint-900/15" style={{ background: c.hex }} />{c.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function EmiCard({ budget }) {
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const principal = Math.round(budget * (1 - down / 100));
  const r = rate / 12 / 100, n = years * 12;
  const emi = r > 0 ? Math.round((principal * r * (1 + r) ** n) / ((1 + r) ** n - 1)) : Math.round(principal / n);
  const fld = 'w-full accent-blueprint-700';
  return (
    <div className="card p-5">
      <CardHead icon={<IndianRupee className="w-4 h-4 text-blueprint-700" />} title="Home-loan EMI" />
      <div className="text-center mb-3">
        <p className="text-2xl font-bold text-blueprint-950">₹{emi.toLocaleString('en-IN')}<span className="text-sm font-medium text-ink/50">/month</span></p>
        <p className="text-xs text-ink/50">Loan ₹{principal.toLocaleString('en-IN')} · {years} yr @ {rate}%</p>
      </div>
      <label className="text-xs text-ink/60 flex justify-between">Down payment <span className="font-medium">{down}%</span></label>
      <input type="range" min="0" max="60" value={down} onChange={(e) => setDown(+e.target.value)} className={fld} />
      <label className="text-xs text-ink/60 flex justify-between mt-1">Interest rate <span className="font-medium">{rate}%</span></label>
      <input type="range" min="6" max="12" step="0.1" value={rate} onChange={(e) => setRate(+e.target.value)} className={fld} />
      <label className="text-xs text-ink/60 flex justify-between mt-1">Tenure <span className="font-medium">{years} yr</span></label>
      <input type="range" min="5" max="30" value={years} onChange={(e) => setYears(+e.target.value)} className={fld} />
    </div>
  );
}
function TimelineCard({ t }) {
  const total = t.totalWeeks || 1;
  const colors = ['#4C82C3', '#5B9BD5', '#E8A33D', '#6FB07F', '#B27BB5', '#D08C60', '#5FA8A0', '#C06B6B'];
  return (
    <div className="card p-5">
      <CardHead icon={<CalendarClock className="w-4 h-4 text-blueprint-700" />} title="Construction timeline"
        right={<span className="text-xs font-medium text-ink/60">≈ {t.totalMonths} months</span>} />
      <div className="space-y-1.5">
        {(t.phases || []).map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 shrink-0 text-ink/70 truncate">{p.phase}</span>
            <div className="flex-1 bg-blueprint-900/5 rounded h-3 relative">
              <div className="h-3 rounded" style={{ marginLeft: `${(p.startWeek / total) * 100}%`, width: `${(p.weeks / total) * 100}%`, background: colors[i % colors.length] }} />
            </div>
            <span className="text-ink/45 w-8 text-right">{p.weeks}w</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function RoomCostCard({ rc }) {
  const top = rc?.top || [];
  const max = Math.max(1, ...top.map((r) => r.cost));
  return (
    <div className="card p-5">
      <CardHead icon={<IndianRupee className="w-4 h-4 text-blueprint-700" />} title="Cost by room"
        right={<span className="text-xs font-medium text-ink/60">₹{(rc?.totalCost || 0).toLocaleString('en-IN')}</span>} />
      <div className="space-y-1.5">
        {top.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 shrink-0 text-ink/70 truncate">{r.name}</span>
            <div className="flex-1 bg-blueprint-900/5 rounded h-3"><div className="h-3 rounded bg-blueprint-500" style={{ width: `${(r.cost / max) * 100}%`, background: '#4C82C3' }} /></div>
            <span className="text-ink/55 w-16 text-right">₹{(r.cost / 100000).toFixed(1)}L</span>
          </div>
        ))}
      </div>
    </div>
  );
}
