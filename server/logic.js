// Pure calculation helpers — no database, no framework. Easy to read and tweak.

// Built-up area in square feet across all floors.
function builtArea(p) {
  const L = Number(p.plot_length) || 0;
  const W = Number(p.plot_width) || 0;
  const floors = Number(p.floors) || 1;
  return L * W * floors;
}

// ---- Cost estimation (₹) ----
// Simple per-square-foot rates. Foundation is based on the ground-floor
// footprint; everything else scales with total built-up area.
export function estimateCost(p) {
  const ground = (Number(p.plot_length) || 0) * (Number(p.plot_width) || 0);
  const area = builtArea(p) || ground;
  const r = (n) => Math.round(n);
  const items = [
    { label: 'Foundation Cost', amount: r(ground * 350) },
    { label: 'Cement Cost', amount: r(area * 260) },
    { label: 'Steel Cost', amount: r(area * 380) },
    { label: 'Bricks Cost', amount: r(area * 180) },
    { label: 'Labour Cost', amount: r(area * 320) },
    { label: 'Electrical Cost', amount: r(area * 140) },
    { label: 'Plumbing Cost', amount: r(area * 110) },
  ];
  return { items };
}

// ---- Material estimation ----
export function estimateMaterials(p) {
  const area = builtArea(p) || (Number(p.plot_length) || 0) * (Number(p.plot_width) || 0);
  const round1 = (n) => Math.round(n * 10) / 10;
  return [
    { name: 'Cement Bags', quantity: Math.round(area * 0.4), unit: 'bags (50kg)' },
    { name: 'Bricks', quantity: Math.round(area * 8), unit: 'nos' },
    { name: 'Steel (TMT)', quantity: round1((area * 4) / 1000), unit: 'tonnes' },
    { name: 'Sand', quantity: Math.round(area * 0.8), unit: 'cu ft' },
    { name: 'Aggregate', quantity: Math.round(area * 0.65), unit: 'cu ft' },
    { name: 'Tiles', quantity: Math.round(area * 1.1), unit: 'sq ft' },
    { name: 'Paint', quantity: Math.round(area * 0.05), unit: 'litres' },
  ];
}

// ---- 2D Floor plan generator (floor-aware, realistic sizes, measurements) ----
// Produces a per-floor room layout in FEET, derived from the project inputs.
// Rooms keep sensible sizes; leftover space becomes circulation (lobby/passage)
// and open terrace instead of ballooning the rooms — so plans stay neat.
const fpClamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fpR1 = (n) => Math.round(n * 2) / 2;              // nearest 0.5 ft
const fpSum = (a) => a.reduce((s, x) => s + x, 0);

const FP_C = {
  living:'#DCEAF7', dining:'#E7F0FA', kitchen:'#FBE9C8', bed:'#E1EBE0',
  master:'#D2E2D7', bath:'#E7DDF0', pooja:'#F4E7CF', stair:'#E3DFD7',
  parking:'#E4E1D9', balcony:'#D9ECE1', utility:'#EDE8DD', lobby:'#EEF2F6',
  hall:'#E4EDF6', terrace:'#DDE9DF', verandah:'#E9F1E6',
};

function fpFtIn(v) {
  const ft = Math.floor(v + 1e-6);
  const inch = Math.round((v - ft) * 12);
  if (inch === 12) return `${ft + 1}'-0"`;
  return `${ft}'-${inch}"`;
}
const fpDim = (w, h) => `${fpFtIn(w)} × ${fpFtIn(h)}`;

function fpSpread(total, n) {
  const base = Math.floor(total / n);
  let rem = total - base * n;
  const out = Array.from({ length: n }, () => base);
  for (let i = 0; i < n && rem > 0; i++, rem--) out[i]++;
  return out;
}

const FPR = (name, w, h, fill, key = '') => ({ name, w, h, fill, key: key || name.toLowerCase() });

function fpFloorRows(p) {
  const beds   = fpClamp(Number(p.bedrooms)  || 2, 1, 8);
  const baths  = fpClamp(Number(p.bathrooms) || 1, 1, 8);
  const floors = fpClamp(Number(p.floors)    || 1, 1, 4);
  const parking = !!p.parking, balcony = !!p.balcony;

  let bedsPer;
  if (floors === 1) bedsPer = [beds];
  else {
    const g = beds >= 3 ? 1 : 0;
    bedsPer = [g, ...fpSpread(beds - g, floors - 1)];
  }
  const bathsPer = fpSpread(baths, floors).map((b, i) => Math.max((bedsPer[i] > 0 || i === 0) ? 1 : b, b));

  const out = [];
  for (let f = 0; f < floors; f++) {
    const rows = [];
    const nb = bedsPer[f];
    const nbath = bathsPer[f];

    if (f === 0) {
      const front = [FPR('Living Room', 16, 14, FP_C.living, 'living')];
      if (parking) front.push(FPR('Car Porch', 10, 14, FP_C.parking, 'parking'));
      rows.push(front);

      const mid = [FPR('Dining', 12, 12, FP_C.dining, 'dining')];
      if (floors > 1) mid.push(FPR('Staircase', 4.5, 12, FP_C.stair, 'stair'));
      if (nb >= 1) mid.push(FPR('Guest Bedroom', 12, 12, FP_C.bed, 'bed'));
      rows.push(mid);

      const svc = [FPR('Kitchen', 11, 9, FP_C.kitchen, 'kitchen'), FPR('Pooja / Study', 6, 9, FP_C.pooja, 'pooja')];
      for (let i = 0; i < nbath; i++) svc.push(FPR(nbath === 1 ? 'Bathroom' : `Bathroom ${i + 1}`, 5, 9, FP_C.bath, 'bath'));
      svc.push(FPR('Utility / Wash', 6, 9, FP_C.utility, 'utility'));
      rows.push(svc);
    } else {
      if (balcony) rows.push([{ ...FPR('Balcony', 0, 6, FP_C.balcony, 'balcony'), fullWidth: true }]);

      if (nb >= 1) {
        const bedRow = [];
        const names = [];
        if (f === 1) names.push('Master Bedroom');
        while (names.length < nb) names.push(`Bedroom ${names.length + (f === 1 ? 1 : 0) + 1}`);
        names.slice(0, nb).forEach((n) => {
          const m = n.startsWith('Master');
          bedRow.push(FPR(n, m ? 14 : 12, m ? 13 : 12, m ? FP_C.master : FP_C.bed, 'bed'));
        });
        rows.push(bedRow);
      } else {
        rows.push([FPR('Family Lounge', 16, 14, FP_C.hall, 'hall')]);
      }

      const svc = [];
      for (let i = 0; i < nbath; i++) svc.push(FPR(nbath === 1 ? 'Bathroom' : `Bathroom ${i + 1}`, 5, 8, FP_C.bath, 'bath'));
      if (nb >= 1) svc.push(FPR('Wardrobe / Store', 6, 8, FP_C.utility, 'utility'));
      if (floors > 1) svc.push(FPR('Staircase', 4.5, 8, FP_C.stair, 'stair'));
      rows.push(svc);
    }
    out.push({ index: f, rows });
  }
  return out;
}

function fpFitRowWidth(cells, W, passageName, passageFill) {
  if (cells.length === 1 && cells[0].fullWidth) return [{ ...cells[0], w: W }];
  let list = cells.map((c) => ({ ...c }));
  let natural = fpSum(list.map((c) => c.w));
  if (natural > W - 0.5) {
    const scale = W / natural;
    list.forEach((c) => (c.w = Math.max(3.5, fpR1(c.w * scale))));
  } else {
    const slack = W - natural;
    if (slack > 0.28 * W && passageName) {
      list.forEach((c) => (c.w = fpR1(c.w * 1.12)));
      const used = fpSum(list.map((c) => c.w));
      const rem = fpR1(W - used);
      if (rem >= 3) list.push({ name: passageName, w: rem, h: list[0].h, fill: passageFill, key: 'lobby' });
      else list.forEach((c) => (c.w = fpR1(c.w * (W / used))));
    } else {
      list.forEach((c) => (c.w = fpR1(c.w * (W / natural))));
    }
  }
  const acc = fpSum(list.slice(0, -1).map((c) => c.w));
  list[list.length - 1].w = fpR1(W - acc);
  return list;
}

function fpLayoutFloor(floor, W, D) {
  const isGround = floor.index === 0;
  const rows = floor.rows.map((cells) => {
    const usable = cells.some((c) => ['bed', 'hall', 'living'].includes(c.key));
    const fillerName = usable ? 'Family Lounge' : 'Passage';
    const fillerFill = usable ? FP_C.hall : FP_C.lobby;
    return fpFitRowWidth(cells, W, fillerName, fillerFill);
  });

  let heights = rows.map((r) => Math.max(...r.map((c) => c.h)));
  let totalH = fpSum(heights);
  if (totalH > D) {
    const scale = D / totalH;
    heights = heights.map((h) => Math.max(5, fpR1(h * scale)));
  } else {
    const leftover = fpR1(D - totalH);
    if (leftover >= 4) {
      const name = isGround ? 'Rear Verandah' : 'Open Terrace';
      const fill = isGround ? FP_C.verandah : FP_C.terrace;
      rows.push([{ name, w: W, h: leftover, fill, key: 'terrace', fullWidth: true }]);
      heights.push(leftover);
    } else if (leftover > 0) {
      heights[0] = fpR1(heights[0] + leftover);
    }
  }
  const hAcc = fpSum(heights.slice(0, -1));
  heights[heights.length - 1] = fpR1(D - hAcc);

  const placed = [];
  let y = 0;
  rows.forEach((r, ri) => {
    const h = heights[ri];
    let x = 0;
    r.forEach((c, ci) => {
      const w = ci === r.length - 1 ? fpR1(W - x) : c.w;
      placed.push({
        name: c.name, fill: c.fill, key: c.key,
        x: fpR1(x), y: fpR1(y), w, h,
        areaSqft: Math.round(w * h), dim: fpDim(w, h),
      });
      x += w;
    });
    y += h;
  });
  return placed;
}

export function generateFloorPlan(p) {
  const facing = p.facing || 'North';
  const floors = fpClamp(Number(p.floors) || 1, 1, 4);
  const plotW = Number(p.plot_width)  || 30;
  const plotL = Number(p.plot_length) || 40;

  const side  = fpClamp(fpR1(plotW * 0.05), 1.5, 4);
  const front = fpClamp(fpR1(plotL * 0.06), 2, 5);
  const rear  = fpClamp(fpR1(plotL * 0.04), 1.5, 3.5);
  const W = fpR1(plotW - side * 2);
  const D = fpR1(plotL - front - rear);

  const ordinal = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
  const floorsData = fpFloorRows(p).map((fl) => ({
    index: fl.index,
    name: ordinal[fl.index] || `Floor ${fl.index}`,
    widthFt: W, depthFt: D, offsetX: side, offsetY: front,
    rooms: fpLayoutFloor(fl, W, D),
  }));

  return {
    facing, floorCount: floors,
    plot: { width: plotW, length: plotL, areaSqft: Math.round(plotW * plotL) },
    builtUpSqft: Math.round(W * D * floors),
    setback: { side, front, rear },
    unit: 'ft',
    floors: floorsData,
  };
}

// ---- AI-style design suggestions (rule-based, derived from the plot inputs) ----
export function generateSuggestions(p) {
  const beds = Number(p.bedrooms) || 2;
  const baths = Number(p.bathrooms) || 2;
  const facing = p.facing || 'North';

  const roomSizes = [
    { name: 'Living Room', size: '16 × 14 ft' },
    { name: 'Master Bedroom', size: '14 × 12 ft' },
  ];
  for (let i = 2; i <= beds; i++) roomSizes.push({ name: `Bedroom ${i}`, size: '12 × 10 ft' });
  roomSizes.push({ name: 'Kitchen', size: '10 × 10 ft' });
  for (let i = 1; i <= baths; i++) {
    roomSizes.push({ name: baths === 1 ? 'Bathroom' : `Bathroom ${i}`, size: '8 × 5 ft' });
  }
  if (p.balcony) roomSizes.push({ name: 'Balcony', size: '10 × 4 ft' });
  if (p.parking) roomSizes.push({ name: 'Parking', size: '18 × 9 ft' });
  if (p.garden) roomSizes.push({ name: 'Garden', size: '12 × 8 ft' });

  const optimizationTips = [
    'Combine dining and living into one open zone to save 60–80 sq ft.',
    'Use under-staircase storage instead of a separate utility room.',
    'Sliding doors for the balcony save swing clearance of ~6 sq ft.',
  ];
  if (Number(p.floors) > 1) {
    optimizationTips.push('Stack wet areas (kitchen/bathrooms) vertically to shorten plumbing runs.');
  }

  return {
    roomSizes,
    arrangement:
      `Living room placed near the ${facing} entrance for guest access without crossing private zones. ` +
      `The ${beds} bedroom(s) are grouped on the quieter rear side, with the kitchen adjacent to the dining area and direct external ventilation.`,
    optimizationTips,
    ventilation:
      'Cross-ventilation is achieved by placing windows on opposite walls in the living room and bedrooms. ' +
      'The kitchen exhaust is vented externally to avoid heat build-up.',
    vastuNotes: [
      'Kitchen positioned in the South-East corner (Agni zone).',
      `Main entrance aligned to the ${facing} for favourable energy flow.`,
      'Master bedroom placed in the South-West for stability.',
    ],
  };
}

// ---- Chatbot (keyword-based assistant) ----
export function chatReply(question = '') {
  const q = String(question).toLowerCase();
  if (q.includes('cement'))
    return 'For most residential structures, OPC 43 Grade or PPC cement works well — PPC is better for plastering and mass concrete, OPC 43 for structural RCC work.';
  if (q.includes('cost') || q.includes('budget') || q.includes('save'))
    return 'Top cost-saving tips: (1) buy cement and steel in bulk directly from dealers, (2) finalize your floor plan before starting to avoid rework, (3) use fly-ash bricks over red clay bricks where locally available.';
  if (q.includes('foundation'))
    return 'For black cotton or expansive soil, a raft or pile foundation is recommended over an isolated footing, since it resists differential settlement better.';
  if (q.includes('quality'))
    return 'Check cement for lumps and manufacture date (use within 3 months), steel for uniform ribbing and the IS certification mark, and bricks for a clear metallic sound when struck together.';
  if (q.includes('timeline') || q.includes('time') || q.includes('long'))
    return 'A typical 1,500 sq ft G+1 home takes about 8–10 months: 1 month for foundation, 3–4 months for structure, and 4–5 months for finishing work.';
  if (q.includes('vastu'))
    return 'Key Vastu basics: kitchen in the South-East, master bedroom in the South-West, and the main entrance facing North or East where possible.';
  return "I can help with cost, materials, foundation, quality checks, timelines and Vastu. Ask me anything about your build and I'll guide you.";
}

// ---- Small helper: human-friendly "updated" text ----
export function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-IN');
}
