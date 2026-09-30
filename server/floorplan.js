// =============================================================================
//  Floor-plan generator — "interior designer" edition
//  ---------------------------------------------------------------------------
//  Produces a clean, well-proportioned, room-by-room plan for EACH floor the
//  client chose. Room sizes and the room programme scale with the BUDGET tier,
//  bedrooms/bathrooms are distributed sensibly across floors, and every room
//  carries real feet-and-inches dimensions.
//
//  Output (all lengths in FEET, origin = top-left of the building footprint):
//  {
//    tier, tierLabel, budgetPerSqft, designerNote, scaleNote,
//    plot: { width, length, area },
//    building: { width, length, setback, area },
//    floors: [ {
//      level, name, widthFt, depthFt,
//      rooms:   [ { name, type, zone, x, y, w, h, areaSqft, dim } ],
//      doors:   [ { x, y, w, h } ],       // small openings drawn on walls
//      windows: [ { x, y, w, h } ],       // exterior openings
//    } ],
//    legend: [ { type, label, fill } ],
//  }
// =============================================================================

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sum = (a) => a.reduce((s, x) => s + x, 0);

// Soft, pleasant palette grouped by room type (interior-designer friendly).
const PALETTE = {
  living:    { fill: '#DCEAF7', label: 'Living' },
  dining:    { fill: '#E7F0FA', label: 'Dining' },
  kitchen:   { fill: '#FBE7C6', label: 'Kitchen' },
  master:    { fill: '#DDE7F6', label: 'Master Bedroom' },
  bedroom:   { fill: '#E6EEF9', label: 'Bedroom' },
  bath:      { fill: '#E9E1F4', label: 'Bath' },
  stair:     { fill: '#E4E7EA', label: 'Staircase' },
  parking:   { fill: '#E0E4E8', label: 'Parking' },
  pooja:     { fill: '#F5E9D6', label: 'Pooja' },
  utility:   { fill: '#ECEAE3', label: 'Utility' },
  balcony:   { fill: '#DCEFE3', label: 'Balcony' },
  study:     { fill: '#F1E7F3', label: 'Study' },
  closet:    { fill: '#EFEAF4', label: 'Walk-in Closet' },
  foyer:     { fill: '#F3F1EC', label: 'Foyer / Circulation' },
  lounge:    { fill: '#E9F1F8', label: 'Family Lounge' },
  garden:    { fill: '#DCEFE3', label: 'Garden' },
};

// ---- Budget tier -----------------------------------------------------------
// Interpreted as an all-in ₹/sqft (construction + basic interior finish).
function pickTier(budgetPerSqft) {
  if (!budgetPerSqft || !Number.isFinite(budgetPerSqft)) return 'comfort';
  if (budgetPerSqft < 1800) return 'economy';
  if (budgetPerSqft < 2600) return 'comfort';
  if (budgetPerSqft < 3800) return 'premium';
  return 'luxury';
}
const TIER_LABEL = {
  economy: 'Economy',
  comfort: 'Comfort',
  premium: 'Premium',
  luxury:  'Luxury',
};
const TIER_INDEX = { economy: 0, comfort: 1, premium: 2, luxury: 3 };

// Friendly display names + the palette "type" each room key maps to.
const NAME = {
  living: 'Living', dining: 'Dining', kitchen: 'Kitchen', master: 'Master Bedroom',
  bedroom: 'Bedroom', guest: 'Guest Bedroom', bath: 'Bathroom', ensuite: 'Bathroom',
  stair: 'Staircase', parking: 'Parking', pooja: 'Pooja Room', utility: 'Utility',
  balcony: 'Balcony', study: 'Study', closet: 'Walk-in Closet', foyer: 'Foyer',
  lounge: 'Family Lounge', garden: 'Garden / Sit-out', terrace: 'Open Terrace',
};
const TYPE = {
  guest: 'bedroom', ensuite: 'bath', terrace: 'balcony',
};

// Target room areas (sqft) per tier  [economy, comfort, premium, luxury]
const AREA = {
  living:  [180, 240, 300, 380],
  dining:  [100, 130, 170, 210],
  kitchen: [ 90, 110, 140, 170],
  master:  [150, 180, 220, 270],
  bedroom: [110, 130, 160, 195],
  guest:   [120, 140, 165, 195],
  bath:    [ 38,  46,  56,  70],
  ensuite: [ 40,  50,  62,  78],
  stair:   [ 62,  70,  80,  92],
  parking: [150, 170, 200, 240],
  pooja:   [ 28,  36,  46,  60],
  utility: [ 42,  52,  64,  84],
  balcony: [ 44,  58,  74,  95],
  study:   [ 90, 100, 120, 145],
  closet:  [ 40,  48,  58,  72],
  lounge:  [110, 140, 170, 205],
};
const areaFor = (key, ti) => AREA[key][ti];

// -------------------------------------------------------------------------
//  Build the room programme for every floor from the client's inputs.
// -------------------------------------------------------------------------
function buildProgramme(p, ti) {
  const floors  = clamp(Number(p.floors)    || 1, 1, 4);
  const beds    = clamp(Number(p.bedrooms)  || 2, 1, 8);
  const baths   = clamp(Number(p.bathrooms) || 2, 1, 8);
  const parking = !!p.parking;
  const balcony = !!p.balcony;
  const premium = ti >= 2; // premium & luxury get the nicer extras

  // Distribute bedrooms across floors.
  // Ground floor keeps a guest/parents' bedroom when it makes sense.
  const guestOnGround = floors >= 2 && (beds >= 3 || premium) ? 1 : 0;
  let bedsUpper = beds - guestOnGround;
  const upperFloors = Math.max(1, floors - 1);

  const perFloorBeds = [];
  if (floors === 1) {
    perFloorBeds[0] = beds; // everything on one level
  } else {
    perFloorBeds[0] = guestOnGround; // ground
    // spread the rest across the upper floors, front-loading the first upper
    let remaining = bedsUpper;
    for (let f = 1; f <= upperFloors; f++) {
      const left = upperFloors - f + 1;
      const take = Math.ceil(remaining / left);
      perFloorBeds[f] = take;
      remaining -= take;
    }
  }

  // Bathroom budget: master always gets an ensuite; the rest become common
  // baths / powder rooms spread where the people are.
  let bathsLeft = baths;

  const floorsOut = [];
  let masterPlaced = false;

  for (let f = 0; f < floors; f++) {
    const rooms = [];
    const isGround = f === 0;
    const nb = perFloorBeds[f] || 0;

    if (isGround) {
      // ---- Public zone
      rooms.push({ key: 'living',  zone: 'public', area: areaFor('living', ti) });
      rooms.push({ key: 'dining',  zone: 'public', area: areaFor('dining', ti) });
      rooms.push({ key: 'foyer',   zone: 'public', area: Math.round(areaFor('living', ti) * 0.28) });
      // ---- Service zone
      rooms.push({ key: 'kitchen', zone: 'service', area: areaFor('kitchen', ti) });
      rooms.push({ key: 'utility', zone: 'service', area: areaFor('utility', ti) });
      rooms.push({ key: 'pooja',   zone: 'service', area: areaFor('pooja', ti) });
      if (floors > 1) rooms.push({ key: 'stair', zone: 'service', area: areaFor('stair', ti) });
      if (parking) {
        rooms.push({ key: 'parking', zone: 'service', area: areaFor('parking', ti) * (ti >= 3 ? 2 : 1) });
      }
      // a powder room / common bath on the ground floor
      if (bathsLeft > 0) { rooms.push({ key: 'bath', zone: 'service', area: areaFor('bath', ti) }); bathsLeft--; }
      // ---- Private (guest bedroom on ground) 
      for (let i = 0; i < nb; i++) {
        const isMaster = !masterPlaced && floors === 1;
        masterPlaced = masterPlaced || isMaster;
        rooms.push({
          key: isMaster ? 'master' : 'guest',
          zone: 'private',
          area: areaFor(isMaster ? 'master' : 'guest', ti),
        });
        if (bathsLeft > 0) { rooms.push({ key: 'ensuite', zone: 'private', area: areaFor('ensuite', ti) }); bathsLeft--; }
      }
      if (floors === 1 && premium) rooms.push({ key: 'study', zone: 'public', area: areaFor('study', ti) });
    } else {
      // ---- Upper floor: bedrooms + shared lounge/circulation
      rooms.push({ key: 'stair',  zone: 'shared', area: areaFor('stair', ti) });
      rooms.push({ key: 'lounge', zone: 'shared', area: areaFor('lounge', ti) });
      rooms.push({ key: 'foyer',  zone: 'shared', area: Math.round(areaFor('lounge', ti) * 0.35) });

      for (let i = 0; i < nb; i++) {
        const isMaster = !masterPlaced;
        masterPlaced = masterPlaced || isMaster;
        const key = isMaster ? 'master' : 'bedroom';
        rooms.push({ key, zone: 'private', area: areaFor(key, ti) });
        // ensuite for master (and for every bedroom in premium+), else a shared bath
        if (isMaster && bathsLeft > 0) { rooms.push({ key: 'ensuite', zone: 'private', area: areaFor('ensuite', ti) }); bathsLeft--; }
        else if (premium && bathsLeft > 0) { rooms.push({ key: 'ensuite', zone: 'private', area: areaFor('ensuite', ti) }); bathsLeft--; }
        if (isMaster && premium) rooms.push({ key: 'closet', zone: 'private', area: areaFor('closet', ti) });
      }
      // guarantee at least one bath on a bedroom floor
      const hasBath = rooms.some((r) => r.key === 'ensuite' || r.key === 'bath');
      if (!hasBath) rooms.push({ key: 'bath', zone: 'shared', area: areaFor('bath', ti) });
      if (balcony) rooms.push({ key: 'balcony', zone: 'shared', area: areaFor('balcony', ti) });
      if (f === 1 && premium) rooms.push({ key: 'study', zone: 'shared', area: areaFor('study', ti) });
    }

    floorsOut.push({ level: f, rooms });
  }

  // Any leftover bathrooms -> add to the top floor as common baths.
  while (bathsLeft > 0) {
    floorsOut[floorsOut.length - 1].rooms.push({ key: 'bath', zone: 'shared', area: areaFor('bath', ti) });
    bathsLeft--;
  }

  return floorsOut;
}

// Distribute the floor's area across its rooms so habitable rooms grow to use
// the space while wet/service rooms stay realistically small. Any genuine
// excess (sparse upper floors) becomes an Open Terrace rather than bloating
// bathrooms or staircases.
const MAX_INFLATE = {
  living: 2.1, dining: 1.9, lounge: 2.1, master: 2.0, bedroom: 1.9, guest: 1.9,
  study: 1.9, foyer: 2.6, kitchen: 1.6, parking: 1.6, closet: 1.5,
  bath: 1.3, ensuite: 1.3, pooja: 1.3, utility: 1.4, stair: 1.25,
};
function fitFloorAreas(rooms, footprint, level, hasGarden) {
  const items = rooms.map((r) => ({
    r, base: r.area, cap: r.area * (MAX_INFLATE[r.key] ?? 1.6), final: r.area, locked: false,
  }));
  let poolArea = footprint;
  let poolBase = sum(items.map((i) => i.base));

  for (let iter = 0; iter < 12 && poolBase > 0; iter++) {
    const s = poolArea / poolBase;
    let changed = false;
    for (const it of items) {
      if (it.locked) continue;
      if (it.base * s >= it.cap - 1e-6) {
        it.final = it.cap; it.locked = true; changed = true;
        poolArea -= it.cap; poolBase -= it.base;
      }
    }
    if (!changed) { for (const it of items) if (!it.locked) it.final = it.base * s; break; }
  }
  const used = sum(items.map((i) => i.final));
  const rem = footprint - used;
  if (rem > 120) {
    rooms.forEach((r, i) => (r.area = items[i].final));
    rooms.push({ key: level === 0 && hasGarden ? 'garden' : 'terrace', zone: 'outdoor', area: rem });
  } else {
    // small leftover — stretch rooms slightly rather than adding a sliver terrace
    const k = used > 0 ? footprint / used : 1;
    rooms.forEach((r, i) => (r.area = items[i].final * k));
  }
  return rooms;
}

// -------------------------------------------------------------------------
function squarify(children, rect) {
  const out = [];
  const items = children.map((c) => ({ ...c }));
  const total = sum(items.map((c) => c.area)) || 1;
  const scale = (rect.w * rect.h) / total;
  items.forEach((c) => (c._a = c.area * scale));

  const worst = (row, len) => {
    const s = sum(row.map((r) => r._a));
    const mx = Math.max(...row.map((r) => r._a));
    const mn = Math.min(...row.map((r) => r._a));
    const len2 = len * len, s2 = s * s;
    return Math.max((len2 * mx) / s2, s2 / (len2 * mn));
  };

  const layoutRow = (row, r) => {
    const s = sum(row.map((x) => x._a));
    if (r.w >= r.h) {
      const colW = s / r.h;
      let y = r.y;
      for (const it of row) { const ch = it._a / colW; out.push({ ...it, x: r.x, y, w: colW, h: ch }); y += ch; }
      return { x: r.x + colW, y: r.y, w: r.w - colW, h: r.h };
    } else {
      const rowH = s / r.w;
      let x = r.x;
      for (const it of row) { const cw = it._a / rowH; out.push({ ...it, x, y: r.y, w: cw, h: rowH }); x += cw; }
      return { x: r.x, y: r.y + rowH, w: r.w, h: r.h - rowH };
    }
  };

  let rectLeft = { ...rect };
  let row = [];
  const queue = items.slice();
  while (queue.length) {
    const shorter = Math.min(rectLeft.w, rectLeft.h);
    const next = queue[0];
    if (row.length === 0 || worst(row, shorter) >= worst([...row, next], shorter)) {
      row.push(queue.shift());
    } else {
      rectLeft = layoutRow(row, rectLeft);
      row = [];
    }
  }
  if (row.length) layoutRow(row, rectLeft);
  return out;
}

// Two-level layout: place zones first (grouping), then rooms within each zone.
function layoutFloor(rooms, W, D) {
  const zoneOrder = ['public', 'private', 'service', 'shared', 'outdoor'];
  const zones = {};
  for (const r of rooms) (zones[r.zone] ||= []).push(r);

  const zoneItems = zoneOrder
    .filter((z) => zones[z])
    .map((z) => ({ zone: z, area: sum(zones[z].map((r) => r.area)) }));

  const zoneRects = squarify(zoneItems, { x: 0, y: 0, w: W, h: D });

  const placed = [];
  for (const zr of zoneRects) {
    // Sort rooms in a zone largest-first for the tidiest aspect ratios.
    const list = zones[zr.zone].slice().sort((a, b) => b.area - a.area);
    const rects = squarify(list, { x: zr.x, y: zr.y, w: zr.w, h: zr.h });
    placed.push(...rects);
  }
  return placed;
}

// -------------------------------------------------------------------------
//  Doors & windows (schematic) + labels
// -------------------------------------------------------------------------
const EPS = 0.05;
function sharedEdge(a, b) {
  // returns {orient:'v'|'h', pos, from, to} if a & b share a wall segment
  // vertical wall (a right == b left or vice-versa)
  if (Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS) {
    const x = Math.abs(a.x + a.w - b.x) < EPS ? a.x + a.w : a.x;
    const from = Math.max(a.y, b.y), to = Math.min(a.y + a.h, b.y + b.h);
    if (to - from > 2.4) return { orient: 'v', pos: x, from, to };
  }
  if (Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS) {
    const y = Math.abs(a.y + a.h - b.y) < EPS ? a.y + a.h : a.y;
    const from = Math.max(a.x, b.x), to = Math.min(a.x + a.w, b.x + b.w);
    if (to - from > 2.4) return { orient: 'h', pos: y, from, to };
  }
  return null;
}

function buildOpenings(rooms, W, D) {
  const doors = [];
  const windows = [];
  const DOOR = 2.8;   // ~2'-9" opening
  const WIN = 4.0;    // ~4' window

  const circ = rooms.filter((r) => r.type === 'foyer' || r.type === 'lounge' || r.type === 'stair');

  for (const r of rooms) {
    if (r.type === 'foyer' || r.type === 'balcony' || r.type === 'parking') continue;
    // ---- door: prefer an edge shared with a circulation room, else any neighbour
    let placed = false;
    const targets = circ.length ? circ : rooms.filter((x) => x !== r);
    for (const c of targets) {
      const e = sharedEdge(r, c);
      if (e) {
        const mid = (e.from + e.to) / 2;
        if (e.orient === 'v') doors.push({ x: e.pos - 0.35, y: mid - DOOR / 2, w: 0.7, h: DOOR });
        else doors.push({ x: mid - DOOR / 2, y: e.pos - 0.35, w: DOOR, h: 0.7 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      // fall back to a door on the longest interior edge
      const neigh = rooms.find((x) => x !== r && sharedEdge(r, x));
      if (neigh) {
        const e = sharedEdge(r, neigh);
        const mid = (e.from + e.to) / 2;
        if (e.orient === 'v') doors.push({ x: e.pos - 0.35, y: mid - DOOR / 2, w: 0.7, h: DOOR });
        else doors.push({ x: mid - DOOR / 2, y: e.pos - 0.35, w: DOOR, h: 0.7 });
      }
    }

    // ---- window: on an exterior wall of habitable rooms
    const habit = ['living', 'dining', 'kitchen', 'master', 'bedroom', 'guest', 'study', 'lounge'];
    if (habit.includes(r.type)) {
      if (Math.abs(r.y) < EPS) windows.push({ x: r.x + r.w / 2 - WIN / 2, y: -0.35, w: WIN, h: 0.7 });
      else if (Math.abs(r.y + r.h - D) < EPS) windows.push({ x: r.x + r.w / 2 - WIN / 2, y: D - 0.35, w: WIN, h: 0.7 });
      else if (Math.abs(r.x) < EPS) windows.push({ x: -0.35, y: r.y + r.h / 2 - WIN / 2, w: 0.7, h: WIN });
      else if (Math.abs(r.x + r.w - W) < EPS) windows.push({ x: W - 0.35, y: r.y + r.h / 2 - WIN / 2, w: 0.7, h: WIN });
    }
  }
  return { doors, windows };
}

function ftIn(v) {
  let ft = Math.floor(v);
  let inch = Math.round((v - ft) * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return inch ? `${ft}'-${inch}"` : `${ft}'-0"`;
}

// -------------------------------------------------------------------------
//  Public entry point
// -------------------------------------------------------------------------
export function generateFloorPlan(p) {
  const floorsN = clamp(Number(p.floors) || 1, 1, 4);
  const plotW = Number(p.plot_width)  || Number(p.plotWidth)  || 30;
  const plotL = Number(p.plot_length) || Number(p.plotLength) || 40;

  // Scale-aware setback; the buildable envelope is the plot minus setbacks.
  const setback = clamp(Math.min(plotW, plotL) * 0.06, 2, 5);
  const availW = Math.max(12, plotW - 2 * setback);
  const availL = Math.max(12, plotL - 2 * setback);
  const availArea = availW * availL;

  const budget = Number(p.budget) || 0;

  // Size the house from a stable (tier-independent) baseline so the reported
  // area, ₹/sqft and tier always agree and never oscillate. The building only
  // needs to hold the busiest floor; the rest of the plot becomes garden.
  const baseline = buildProgramme(p, 1); // "comfort" baseline, for sizing only
  const needed = Math.max(...baseline.map((f) => sum(f.rooms.map((r) => r.area))));
  const shrink = needed < availArea ? Math.sqrt(needed / availArea) : 1;
  const bW = +(availW * shrink).toFixed(2);
  const bL = +(availL * shrink).toFixed(2);
  const builtAreaPerFloor = bW * bL;
  const builtAreaTotal = Math.round(builtAreaPerFloor * floorsN);
  const gardenMarginW = +((plotW - bW) / 2).toFixed(1);
  const gardenMarginL = +((plotL - bL) / 2).toFixed(1);

  // Tier + ₹/sqft from that fixed built area (consistent with each other).
  const budgetPerSqft = budget > 0 ? Math.round(budget / builtAreaTotal) : null;
  const tier = pickTier(budgetPerSqft);
  const ti = TIER_INDEX[tier];

  // Final room programme uses the resolved tier (adds study/closet/ensuites etc.)
  const programme = buildProgramme(p, ti);

  const floorNames = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
  const floors = programme.map(({ level, rooms }) => {
    // Cap inflation so rooms keep realistic sizes; leftover -> terrace/garden.
    const fitted = fitFloorAreas(rooms.slice(), builtAreaPerFloor, level, !!p.garden);

    // Resolve friendly name + palette type for each room.
    const named = fitted.map((r) => ({
      ...r,
      name: NAME[r.key] || r.key,
      type: TYPE[r.key] || r.key,
    }));

    const placed = layoutFloor(named, bW, bL).map((r) => {
      const areaSqft = Math.round(r.w * r.h);
      return {
        name: r.name,
        type: r.type,
        zone: r.zone,
        x: +r.x.toFixed(2),
        y: +r.y.toFixed(2),
        w: +r.w.toFixed(2),
        h: +r.h.toFixed(2),
        areaSqft,
        dim: `${ftIn(r.w)} × ${ftIn(r.h)}`,
      };
    });

    // Number repeated names (Bedroom -> Bedroom 1, 2 …; Bathroom -> Bathroom 1 …)
    const totals = {};
    placed.forEach((r) => { totals[r.name] = (totals[r.name] || 0) + 1; });
    const seen = {};
    placed.forEach((r) => {
      if (totals[r.name] > 1) { seen[r.name] = (seen[r.name] || 0) + 1; r.name = `${r.name} ${seen[r.name]}`; }
    });

    const { doors, windows } = buildOpenings(placed, bW, bL);
    return { level, name: floorNames[level], widthFt: +bW.toFixed(2), depthFt: +bL.toFixed(2), rooms: placed, doors, windows };
  });

  // Legend of the room types actually used.
  const usedTypes = [...new Set(floors.flatMap((f) => f.rooms.map((r) => r.type)))];
  const legend = usedTypes.map((t) => ({ type: t, label: PALETTE[t]?.label || t, fill: PALETTE[t]?.fill || '#EEE' }));

  const designerNote = buildDesignerNote(p, tier, floorsN);

  // ---- extra "intelligence" layers (all cheap, computed once) ----
  const vastu = analyzeVastu(floors, bW, bL, p.facing || 'North');
  const metrics = areaMetrics(builtAreaPerFloor, floorsN);
  const sustainability = sustainabilityScore(p, plotW, plotL, bW, bL, floorsN);
  const moodboard = MOODBOARD[tier];
  const timeline = constructionTimeline(builtAreaTotal, floorsN);
  const roomCosts = roomWiseCost(floors, budget, builtAreaTotal);

  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    budgetPerSqft,
    builtAreaTotal,
    designerNote,
    scaleNote: 'All dimensions in feet-inches. This is a schematic zoning plan for visualisation — have a licensed architect prepare construction drawings.',
    plot: { width: plotW, length: plotL, area: Math.round(plotW * plotL) },
    building: {
      width: +bW.toFixed(1), length: +bL.toFixed(1), setback: +setback.toFixed(1),
      area: Math.round(builtAreaPerFloor), totalArea: builtAreaTotal,
      gardenMarginW, gardenMarginL,
    },
    facing: p.facing || 'North',
    floors,
    legend,
    vastu,
    metrics,
    sustainability,
    moodboard,
    timeline,
    roomCosts,
  };
}

// =============================================================================
//  Intelligence layers
// =============================================================================

// ---- Vastu (indicative) ----------------------------------------------------
// North = up (-y), East = right (+x), South = +y, West = -x.
const SECTORS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
function sectorOf(dx, dy) {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI; // screen coords: +x E, +y S
  if (a < 0) a += 360;
  return SECTORS[Math.round(a / 45) % 8];
}
const VASTU_IDEAL = {
  kitchen: ['SE', 'NW', 'E', 'S'], master: ['SW', 'S', 'W'],
  bedroom: ['SW', 'S', 'W', 'NW', 'NE'], pooja: ['NE', 'E', 'N'],
  bath: ['NW', 'W', 'S', 'SE'], living: ['N', 'NE', 'E', 'W'],
  dining: ['W', 'E', 'N', 'S'], stair: ['SW', 'S', 'W', 'SE'],
  parking: ['NW', 'SE', 'N', 'E', 'S'], study: ['NE', 'E', 'N', 'W', 'SE'],
};
function analyzeVastu(floors, bW, bL, facing) {
  const cx0 = bW / 2, cy0 = bL / 2;
  const idx = (s) => SECTORS.indexOf(s);
  const isNeighbor = (a, ideal) => ideal.some((s) => {
    const d = Math.abs(idx(a) - idx(s));
    return d === 1 || d === 7; // circular adjacency
  });
  const checks = [];
  let score = 0, total = 0;
  for (const f of floors) {
    for (const r of f.rooms) {
      const ideal = VASTU_IDEAL[r.type];
      if (!ideal) continue;
      const sec = sectorOf(r.x + r.w / 2 - cx0, r.y + r.h / 2 - cy0);
      const m = ideal.includes(sec) ? 1 : isNeighbor(sec, ideal) ? 0.5 : 0;
      score += m; total += 1;
      if (f.level === 0)
        checks.push({ room: r.name, ideal: ideal[0], actual: sec, status: m === 1 ? 'ok' : m === 0.5 ? 'near' : 'off' });
    }
  }
  const pct = total ? Math.round((score / total) * 100) : 100;
  return {
    score: pct,
    rating: pct >= 80 ? 'Excellent' : pct >= 65 ? 'Good' : pct >= 50 ? 'Fair' : 'Needs review',
    facing,
    checks: checks.slice(0, 8),
    note: 'Indicative Vastu guidance from room placement relative to the plan centre. A ✓ sits in an ideal zone, “near” is an acceptable adjacent zone. Consult a Vastu expert for a detailed assessment.',
  };
}

// ---- Area metrics ----------------------------------------------------------
function areaMetrics(builtPerFloor, floorsN) {
  const builtUp = Math.round(builtPerFloor * floorsN);
  const carpet = Math.round(builtUp * 0.82);      // usable area inside walls
  const superBuiltUp = Math.round(builtUp * 1.25); // incl. common/loading
  const efficiency = Math.round((carpet / superBuiltUp) * 100);
  return { carpet, builtUp, superBuiltUp, efficiency };
}

// ---- Sustainability --------------------------------------------------------
function sustainabilityScore(p, plotW, plotL, bW, bL, floorsN) {
  const roofArea = Math.round(bW * bL * 0.6);          // usable roof for panels
  const solarKw = +(roofArea / 100).toFixed(1);         // ~100 sqft ≈ 1 kW
  const plotM2 = plotW * plotL * 0.092903;
  const rainwaterLitres = Math.round(plotM2 * 1.0 * 0.8 * 1000); // ~1 m/yr, 0.8 runoff
  const evPoint = !!p.parking;
  let score = 55;
  if (solarKw >= 3) score += 15; else if (solarKw >= 1) score += 8;
  if (rainwaterLitres >= 60000) score += 12; else if (rainwaterLitres >= 30000) score += 7;
  if (evPoint) score += 8;
  if (p.garden) score += 10;
  score = Math.min(98, score);
  return {
    score,
    rating: score >= 80 ? 'Green' : score >= 65 ? 'Efficient' : 'Standard',
    solarKw, rooftopSolarAreaSqft: roofArea,
    rainwaterLitresPerYear: rainwaterLitres,
    evChargingPoint: evPoint,
    features: [
      `${solarKw} kW rooftop solar (~${roofArea} sqft of roof)`,
      `Rainwater harvesting ≈ ${rainwaterLitres.toLocaleString('en-IN')} L/year`,
      evPoint ? 'EV charging point in parking' : 'Space for future EV charging',
      p.garden ? 'Private garden / green cover' : 'Cross-ventilated, daylit rooms',
    ],
  };
}

// ---- Mood board per tier ---------------------------------------------------
const MOODBOARD = {
  economy: {
    flooring: [{ name: 'Vitrified tile', hex: '#E8E2D6' }, { name: 'Ceramic (wet)', hex: '#CBB79B' }],
    walls: [{ name: 'Warm white', hex: '#F3EEE6' }, { name: 'Soft grey accent', hex: '#C9CDD2' }],
    kitchen: [{ name: 'Laminate', hex: '#B98A5E' }, { name: 'Granite top', hex: '#5B5750' }],
    joinery: [{ name: 'Flush doors', hex: '#9A6B44' }],
  },
  comfort: {
    flooring: [{ name: 'Double-charge tile', hex: '#E4DCCB' }, { name: 'Anti-skid (wet)', hex: '#B7A488' }],
    walls: [{ name: 'Ivory', hex: '#F1E9DB' }, { name: 'Sage accent', hex: '#B7C3A8' }],
    kitchen: [{ name: 'Acrylic shutter', hex: '#4E6472' }, { name: 'Quartz top', hex: '#D9D6CF' }],
    joinery: [{ name: 'Veneer doors', hex: '#8A5A36' }],
  },
  premium: {
    flooring: [{ name: 'Italian marble', hex: '#ECE7DE' }, { name: 'Wooden (rooms)', hex: '#A9784E' }],
    walls: [{ name: 'Off-white', hex: '#F4EFE7' }, { name: 'Teal accent', hex: '#4C7A78' }],
    kitchen: [{ name: 'Matte lacquer', hex: '#2F3B44' }, { name: 'Quartz island', hex: '#E7E3DA' }],
    joinery: [{ name: 'Designer doors', hex: '#6E4A2C' }, { name: 'Brass hardware', hex: '#B08D57' }],
  },
  luxury: {
    flooring: [{ name: 'Statuario marble', hex: '#F0ECE4' }, { name: 'Engineered wood', hex: '#8F5E38' }],
    walls: [{ name: 'Bespoke plaster', hex: '#EDE6D8' }, { name: 'Emerald accent', hex: '#2E5D4B' }],
    kitchen: [{ name: 'Handleless lacquer', hex: '#232B31' }, { name: 'Marble island', hex: '#EFEAE0' }],
    joinery: [{ name: 'Solid wood', hex: '#5A3B22' }, { name: 'Antique brass', hex: '#A67C46' }],
  },
};

// ---- Construction timeline (Gantt data) ------------------------------------
function constructionTimeline(builtTotal, floorsN) {
  const k = Math.max(0.8, builtTotal / 1500); // scale with size
  const phases = [
    ['Design & approvals', 5],
    ['Foundation & plinth', Math.round(3 * k)],
    ['RCC structure', Math.round(3 * k * floorsN)],
    ['Brickwork & blockwork', Math.round(3 * k)],
    ['Roofing & waterproofing', Math.round(2 * k)],
    ['Plastering', Math.round(2 * k)],
    ['Electrical & plumbing', Math.round(3 * k)],
    ['Flooring & tiling', Math.round(3 * k)],
    ['Painting & finishes', Math.round(3 * k)],
    ['Handover & snagging', 2],
  ];
  let start = 0;
  const out = phases.map(([name, weeks]) => {
    const w = Math.max(1, weeks);
    const row = { phase: name, startWeek: start, weeks: w };
    start += w;
    return row;
  });
  return { totalWeeks: start, totalMonths: +(start / 4.345).toFixed(1), phases: out };
}

// ---- Room-wise cost split --------------------------------------------------
const COST_WEIGHT = { // relative ₹/sqft weight by room type
  kitchen: 1.9, bath: 2.0, living: 1.2, dining: 1.1, master: 1.15, bedroom: 1.0,
  lounge: 1.1, study: 1.0, closet: 0.9, foyer: 0.7, stair: 1.3, parking: 0.6,
  pooja: 1.1, utility: 1.0, balcony: 0.6, garden: 0.3, terrace: 0.4,
};
function roomWiseCost(floors, budget, builtTotal) {
  const items = [];
  for (const f of floors)
    for (const r of f.rooms)
      items.push({ name: r.name, floor: f.name, weight: r.areaSqft * (COST_WEIGHT[r.type] ?? 1), areaSqft: r.areaSqft });
  const totalW = sum(items.map((i) => i.weight)) || 1;
  const totalCost = budget && budget > 0 ? budget : builtTotal * 2200; // fallback ₹/sqft
  const priced = items
    .map((i) => ({ name: i.name, floor: i.floor, areaSqft: i.areaSqft, cost: Math.round((i.weight / totalW) * totalCost) }))
    .sort((a, b) => b.cost - a.cost);
  return { totalCost: Math.round(totalCost), top: priced.slice(0, 8), all: priced };
}

function buildDesignerNote(p, tier, floorsN) {
  const facing = p.facing || 'North';
  const bits = [];
  bits.push(
    tier === 'luxury'
      ? 'Luxury programme: generous open-plan living–dining, ensuite bedrooms with walk-in closets, dedicated study and a family lounge.'
      : tier === 'premium'
      ? 'Premium programme: open living–dining, an ensuite master with walk-in closet, a study, and comfortable secondary bedrooms.'
      : tier === 'comfort'
      ? 'Comfort programme: right-sized living and bedrooms with an ensuite master and clear circulation — no wasted or cramped space.'
      : 'Economy programme: compact, efficient rooms with a practical layout that keeps every square foot usable.'
  );
  if (floorsN > 1) {
    bits.push(
      `Bedrooms are lifted to the upper floor${floorsN > 2 ? 's' : ''} for privacy and quiet, while living, dining, kitchen and parking stay on the ground floor near the ${facing} entrance.`
    );
  } else {
    bits.push(`Single-floor plan zoned so guests reach the living areas from the ${facing} entrance without crossing the private bedroom wing.`);
  }
  bits.push('Wet areas (kitchen, bathrooms, utility) are grouped to shorten plumbing runs, and every habitable room gets an external window for light and cross-ventilation.');
  return bits.join(' ');
}
