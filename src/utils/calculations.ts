/**
 * Bridge Engineering Calculation Engine
 * ======================================
 * Simply supported girder bridge analysis to BS 5400 Part 2 / BD 37/01
 *
 * Conventions
 * - Positive shear: upward on left face of section
 * - Positive moment: sagging (tension at bottom)
 * - x measured from left support (A), 0 ≤ x ≤ L
 */

import {
  BridgeGeometry,
  GirderProperties,
  DeadLoadInputs,
  HighwayLoadInputs,
  PipeLoadInputs,
  PipeMaterial,
  PipeRun,
  WaterLoadInputs,
  CalculationResults,
  DiagramPoint,
  LoadCaseResult,
  GirderDistributionResult,
} from '../types/bridge';

const N_PTS = 121; // diagram resolution (points along span)

// ─── Pipe & Water Loading ─────────────────────────────────────────────────────

/** Unit weights of pipe materials (kN/m³). 'custom' uses PipeRun.customDensity. */
export const PIPE_MATERIALS: Record<Exclude<PipeMaterial, 'custom'>, { label: string; density: number }> = {
  'steel':        { label: 'Steel',                 density: 77.0 },
  'ductile-iron': { label: 'Ductile iron',          density: 70.6 },
  'hdpe':         { label: 'HDPE',                  density: 9.4 },
  'grp':          { label: 'GRP',                   density: 18.6 },
  'concrete':     { label: 'Reinforced concrete',   density: 24.0 },
};

export function pipeDensity(p: PipeRun): number {
  return p.material === 'custom' ? p.customDensity : PIPE_MATERIALS[p.material].density;
}

/** Internal diameter (mm) */
export function pipeInternalDiameter(p: PipeRun): number {
  return Math.max(0, p.outerDiameter - 2 * p.wallThickness);
}

/** Self-weight of ONE pipe including attachment allowance (kN/m) */
export function pipeSelfWeight(p: PipeRun): number {
  const od = p.outerDiameter / 1000;
  const id = pipeInternalDiameter(p) / 1000;
  const shellArea = (Math.PI / 4) * (od * od - id * id);
  return shellArea * pipeDensity(p) + p.attachmentLoad;
}

/** Weight of water filling ONE pipe running full (kN/m) */
export function pipeWaterWeight(p: PipeRun, unitWeight: number): number {
  const id = pipeInternalDiameter(p) / 1000;
  return (Math.PI / 4) * id * id * unitWeight;
}

/** Total pipe self-weight UDL along the span (kN/m) */
export function totalPipeUDL(pl: PipeLoadInputs): number {
  if (!pl.enabled) return 0;
  return pl.pipes.reduce((s, p) => s + p.quantity * pipeSelfWeight(p), 0);
}

/** Water carried inside the pipes (kN/m along span) */
export function pipeContentsUDL(pl: PipeLoadInputs, wl: WaterLoadInputs): number {
  if (!pl.enabled || !wl.pipeContentsEnabled) return 0;
  return pl.pipes.reduce((s, p) => s + p.quantity * pipeWaterWeight(p, wl.unitWeight), 0);
}

/** Width (m) over which standing water acts */
export function pondingWidth(wl: WaterLoadInputs, geo: BridgeGeometry): number {
  return wl.pondingExtent === 'deck' ? geo.deckWidth : geo.carriagewayWidth;
}

/** Standing water on the deck (kN/m along span) */
export function pondingUDL(wl: WaterLoadInputs, geo: BridgeGeometry): number {
  if (!wl.pondingEnabled) return 0;
  return (wl.pondingDepth / 1000) * wl.unitWeight * pondingWidth(wl, geo);
}

// ─── Beam Primitives ──────────────────────────────────────────────────────────

/** Reactions for UDL w (kN/m) over full span L (m) */
function udlReactions(w: number, L: number) {
  const R = (w * L) / 2;
  return { ra: R, rb: R };
}

/** SFD/BMD for UDL w (kN/m) over full span L */
function udlDiagram(w: number, L: number): DiagramPoint[] {
  return Array.from({ length: N_PTS }, (_, i) => {
    const x = (i / (N_PTS - 1)) * L;
    return {
      x,
      shear: (w * L) / 2 - w * x,
      moment: (w * x * (L - x)) / 2,
    };
  });
}

/** Reactions for UDL w (kN/m) over partial span [a, b] */
function partialUDLReactions(w: number, a: number, b: number, L: number) {
  const resultant = w * (b - a);
  const centroid = (a + b) / 2;
  const rb = (resultant * centroid) / L;
  const ra = resultant - rb;
  return { ra, rb };
}

/** SFD/BMD for UDL w over [a, b] on span L */
function partialUDLDiagram(w: number, a: number, b: number, L: number): DiagramPoint[] {
  const { ra } = partialUDLReactions(w, a, b, L);
  return Array.from({ length: N_PTS }, (_, i) => {
    const x = (i / (N_PTS - 1)) * L;
    let shear = ra;
    let moment = ra * x;
    if (x > a) {
      const overlap = Math.min(x, b) - a;
      shear -= w * overlap;
      moment -= w * overlap * (x - a - overlap / 2);
    }
    return { x, shear, moment };
  });
}

/** Reactions for point load P at position a from left */
function pointLoadReactions(P: number, a: number, L: number) {
  const rb = (P * a) / L;
  const ra = P - rb;
  return { ra, rb };
}

/** SFD/BMD for point load P at position a on span L */
function pointLoadDiagram(P: number, a: number, L: number): DiagramPoint[] {
  const { ra } = pointLoadReactions(P, a, L);
  return Array.from({ length: N_PTS }, (_, i) => {
    const x = (i / (N_PTS - 1)) * L;
    const shear = x < a ? ra : ra - P;
    const moment = x <= a ? ra * x : ra * x - P * (x - a);
    return { x, shear, moment };
  });
}

/** Superpose an array of diagrams (linear elastic) */
function superpose(diagrams: DiagramPoint[][]): DiagramPoint[] {
  if (diagrams.length === 0) return Array.from({ length: N_PTS }, (_, i) => ({ x: i, shear: 0, moment: 0 }));
  return diagrams[0].map((p, i) => {
    let shear = p.shear;
    let moment = p.moment;
    for (let d = 1; d < diagrams.length; d++) {
      shear += diagrams[d][i].shear;
      moment += diagrams[d][i].moment;
    }
    return { x: p.x, shear, moment };
  });
}

/** Extract max/min values from a diagram */
function diagramExtremes(diagram: DiagramPoint[]) {
  let maxMoment = -Infinity, maxMomentPos = 0;
  let maxShear = -Infinity, minShear = Infinity;
  let ra = 0, rb = 0;
  if (diagram.length > 0) {
    ra = diagram[0].shear;
    rb = -diagram[diagram.length - 1].shear;
  }
  for (const p of diagram) {
    if (p.moment > maxMoment) { maxMoment = p.moment; maxMomentPos = p.x; }
    if (p.shear > maxShear) maxShear = p.shear;
    if (p.shear < minShear) minShear = p.shear;
  }
  const maxAbsShear = Math.max(Math.abs(maxShear), Math.abs(minShear));
  const totalLoad = ra + rb;
  return { maxMoment, maxMomentPos, maxShear, minShear, maxAbsShear, ra, rb, totalLoad };
}

// ─── HA Loading (BS 5400 Part 2 / BD 37/01) ──────────────────────────────────

/**
 * Nominal HA UDL intensity (kN/m per notional lane)
 * Table 13, BD 37/01 — simplified formula valid 1 m ≤ L ≤ 1600 m
 */
export function haUDLIntensity(loadedLength: number): number {
  if (loadedLength <= 0) return 0;
  if (loadedLength <= 50) {
    return 336 / Math.pow(loadedLength, 0.67);
  }
  // For L > 50 m the BD 37/01 formula gives:
  return 36 + 3360 / loadedLength;
}

/**
 * Number of notional lanes — BD 37/01, Cl. 3.2.9.3.1 (exact table)
 *
 *  CW < 5.00 m                       → 1 lane  (Cl. 3.2.9.3.2)
 *  5.00 ≤ CW ≤  7.50 m               → 2 lanes
 *  7.50 < CW ≤ 10.95 m  (= 3×3.65)  → 3 lanes
 *  10.95 < CW ≤ 14.60 m (= 4×3.65)  → 4 lanes
 *  14.60 < CW ≤ 18.25 m (= 5×3.65)  → 5 lanes
 *  18.25 < CW ≤ 21.90 m (= 6×3.65)  → 6 lanes
 *  (pattern continues: upper bound = n × 3.65)
 *
 *  Formula: for CW > 7.50 → n = ceil(CW / 3.65)
 *  This matches every row in the BD 37/01 Cl. 3.2.9.3.1 table exactly.
 *
 *  KEY CORRECTION vs previous implementation:
 *  - Previous: Math.floor(CW/3.65) → gave 2 lanes for CW=8m (WRONG, should be 3)
 *  - Correct:  Math.ceil(CW/3.65)  → gives 3 lanes for CW=8m ✓
 */
export function notionalLanes(carriagewayWidth: number): number {
  if (carriagewayWidth < 5.0)   return 1;  // Cl. 3.2.9.3.2
  if (carriagewayWidth <= 7.50) return 2;  // Cl. 3.2.9.3.1 — 5.00 to 7.50 m
  return Math.ceil(carriagewayWidth / 3.65); // Cl. 3.2.9.3.1 — above 7.50 m
}

/**
 * Human-readable lane rule string citing the exact BD37/01 table row.
 */
export function laneRuleDescription(cw: number): string {
  if (cw < 5.0)   return `CW = ${cw.toFixed(2)} m < 5.00 m → 1 lane  (BD37/01 Cl.3.2.9.3.2)`;
  if (cw <= 7.50) return `CW = ${cw.toFixed(2)} m (5.00–7.50 m) → 2 lanes  (BD37/01 Cl.3.2.9.3.1)`;
  const n = Math.ceil(cw / 3.65);
  const lo = ((n - 1) * 3.65).toFixed(2);
  const hi = (n * 3.65).toFixed(2);
  return `CW = ${cw.toFixed(2)} m (${lo}–${hi} m) → ${n} lanes  (BD37/01 Cl.3.2.9.3.1)`;
}

/**
 * Cantilever length = distance from outermost beam CL to deck edge (m).
 * Assumes girders are symmetrically centred on the deck.
 * BD recommendation: cantilever ≤ 1.5 m.
 */
export function cantileverLength(
  deckWidth: number,
  numberOfGirders: number,
  girderSpacing: number
): number {
  const outerGirderOffset = ((numberOfGirders - 1) / 2) * girderSpacing;
  return deckWidth / 2 - outerGirderOffset;
}

// ─── HB Vehicle (BS 5400 Part 2, Cl. 6.3) ────────────────────────────────────

/**
 * Calculate the worst-case (maximum hogging BM) diagram for an HB vehicle
 * on a simply supported span by scanning all longitudinal positions.
 *
 * HB vehicle: 4 equally loaded axles
 *   Axle positions relative to leading (front) axle:
 *     0 m, 1.8 m, (1.8 + innerSpacing) m, (3.6 + innerSpacing) m
 *
 * @param units          HB units (30 or 45)
 * @param innerSpacing   Distance between inner pair of axles (6–26 m)
 * @param L              Span length (m)
 */
function hbWorstDiagram(
  units: number,
  innerSpacing: number,
  L: number
): { diagram: DiagramPoint[]; ra: number; rb: number; frontAxlePos: number } {
  const axleLoad = units * 10; // kN per axle (10 kN per HB unit per axle)
  const relPos = [0, 1.8, 1.8 + innerSpacing, 3.6 + innerSpacing]; // offsets from front axle
  const vehicleLength = 3.6 + innerSpacing;

  let bestDiagram: DiagramPoint[] | null = null;
  let bestMaxMoment = -Infinity;
  let bestRA = 0, bestRB = 0, bestFront = 0;

  const scanSteps = 300;
  for (let step = 0; step <= scanSteps; step++) {
    // Sweep front axle from off the left end to off the right end
    const frontPos = -vehicleLength + (step / scanSteps) * (L + vehicleLength);

    const onSpanAxles = relPos
      .map(r => frontPos + r)
      .filter(p => p >= 0 && p <= L);

    if (onSpanAxles.length === 0) continue;

    const diagrams = onSpanAxles.map(p => pointLoadDiagram(axleLoad, p, L));
    const combined = superpose(diagrams);
    const { maxMoment } = diagramExtremes(combined);

    if (maxMoment > bestMaxMoment) {
      bestMaxMoment = maxMoment;
      bestDiagram = combined;
      bestFront = frontPos;
      let ra = 0, rb = 0;
      for (const p of onSpanAxles) {
        rb += (axleLoad * p) / L;
        ra += axleLoad * (L - p) / L;
      }
      bestRA = ra;
      bestRB = rb;
    }
  }

  return {
    diagram: bestDiagram ?? udlDiagram(0, L),
    ra: bestRA,
    rb: bestRB,
    frontAxlePos: bestFront,
  };
}

// ─── Courbon's Method — Transverse Distribution ───────────────────────────────

/**
 * Returns distribution factors for each girder using Courbon's method.
 * Assumes rigid deck and equal girder stiffness.
 *
 * @param nGirders    Number of girders
 * @param spacing     Girder c/c spacing (m)
 * @param eccentricity  Lateral eccentricity of load resultant from deck CL (m)
 */
export function courbonFactors(
  nGirders: number,
  spacing: number,
  eccentricity: number
): number[] {
  if (nGirders === 1) return [1.0];

  // Girder transverse positions relative to deck CL (m)
  const xi = Array.from(
    { length: nGirders },
    (_, i) => -((nGirders - 1) * spacing) / 2 + i * spacing
  );
  const sumXiSq = xi.reduce((s, x) => s + x * x, 0);

  return xi.map(x =>
    (1 / nGirders) * (1 + (nGirders * eccentricity * x) / sumXiSq)
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(
  geo: BridgeGeometry,
  girder: GirderProperties,
  dl: DeadLoadInputs,
  pl: PipeLoadInputs,
  wl: WaterLoadInputs,
  hl: HighwayLoadInputs
): string[] {
  const errs: string[] = [];
  if (pl.enabled) {
    if (pl.pipes.length === 0) errs.push('Pipe loading is enabled but no pipes are defined.');
    pl.pipes.forEach((p, i) => {
      const name = p.label.trim() || `Pipe ${i + 1}`;
      if (p.quantity < 1 || !Number.isInteger(p.quantity)) errs.push(`${name}: quantity must be a whole number ≥ 1.`);
      if (p.outerDiameter <= 0) errs.push(`${name}: outside diameter must be greater than 0.`);
      if (p.wallThickness <= 0) errs.push(`${name}: wall thickness must be greater than 0.`);
      if (p.wallThickness * 2 >= p.outerDiameter) errs.push(`${name}: wall thickness must be less than half the outside diameter.`);
      if (p.material === 'custom' && p.customDensity <= 0) errs.push(`${name}: material density must be greater than 0.`);
      if (p.attachmentLoad < 0) errs.push(`${name}: attachment allowance cannot be negative.`);
    });
  }
  if ((wl.pipeContentsEnabled || wl.pondingEnabled) && wl.unitWeight <= 0)
    errs.push('Unit weight of water must be greater than 0.');
  if (wl.pondingEnabled && wl.pondingDepth <= 0) errs.push('Standing water depth must be greater than 0.');
  if (geo.spanLength <= 0 || geo.spanLength > 300) errs.push('Span length must be between 0 and 300 m.');
  if (geo.numberOfGirders < 1 || geo.numberOfGirders > 12) errs.push('Number of girders must be 1–12.');
  if (geo.girderSpacing <= 0) errs.push('Girder spacing must be greater than 0.');
  if (geo.deckWidth <= 0) errs.push('Deck width must be greater than 0.');
  if (geo.carriagewayWidth <= 0) errs.push('Carriageway width must be greater than 0.');
  if (geo.carriagewayWidth > geo.deckWidth) errs.push('Carriageway width cannot exceed deck width.');
  if (geo.numberOfGirders > 1 && geo.girderSpacing * (geo.numberOfGirders - 1) > geo.deckWidth + 0.5)
    errs.push('Girder arrangement is wider than the deck width.');
  if (girder.selfWeight <= 0) errs.push('Girder self weight must be greater than 0.');
  if (dl.premixEnabled && dl.premixThickness <= 0) errs.push('Premix thickness must be greater than 0.');
  if (dl.pedestrianEnabled && dl.pedestrianLoad <= 0) errs.push('Pedestrian load must be greater than 0.');
  if (hl.activeLoadCases.length === 0) errs.push('Select at least one highway load case.');
  return errs;
}

// ─── Main Analysis Function ───────────────────────────────────────────────────

export function runBridgeAnalysis(
  geo: BridgeGeometry,
  girder: GirderProperties,
  dl: DeadLoadInputs,
  pl: PipeLoadInputs,
  wl: WaterLoadInputs,
  hl: HighwayLoadInputs
): CalculationResults {
  const errors = validate(geo, girder, dl, pl, wl, hl);
  const emptyResult: LoadCaseResult = {
    label: '', ra: 0, rb: 0, maxMoment: 0, maxMomentPos: 0,
    maxShear: 0, totalLoad: 0, diagram: [],
  };

  if (errors.length > 0) {
    return {
      isValid: false, errors,
      numberOfLanes: 0, haUDLPerLane: 0, haKELPerLane: 0,
      hbAxleLoad: { hb30: 0, hb45: 0 },
      deadLoadResult: emptyResult,
      pipeResult: null, waterResult: null, pipeUDL: 0, waterUDL: 0,
      haResult: null, hb30Result: null, hb45Result: null,
      combinedHA: null, combinedHB30: null, combinedHB45: null,
      governingCase: '', governingCombined: emptyResult,
      sfdEnvelope: [], bmdEnvelope: [],
      girderResults: [], assumptions: [],
    };
  }

  const L = geo.spanLength;
  const laneCount = hl.lanesOverride ?? notionalLanes(geo.carriagewayWidth);

  // ── Dead Load UDL (per girder, total over deck width) ─────────────────────
  const sidlIntensity = dl.sidlOption === '5' ? 5 : dl.sidlOption === '10' ? 10 : dl.sidlCustom;
  const premixIntensity = dl.premixEnabled
    ? (dl.premixThickness / 1000) * dl.premixDensity // kN/m²
    : 0;
  const pedIntensity = dl.pedestrianEnabled ? dl.pedestrianLoad : 0;

  // Total distributed dead load per unit length of bridge (kN/m along span)
  const totalGirderSW = girder.selfWeight * geo.numberOfGirders;
  const totalSIDL = sidlIntensity * geo.deckWidth;
  const totalPremix = premixIntensity * geo.deckWidth;
  // Pedestrian load applies to walkways only (not parapets)
  const walkwayWidth = geo.walkwaysEnabled
    ? (geo.leftWalkwayWidth + geo.rightWalkwayWidth)
    : (geo.deckWidth - geo.carriagewayWidth - 2 * geo.parapetWidth); // fallback for old data
  const totalPed = pedIntensity * Math.max(0, walkwayWidth);

  const totalDLUDL = totalGirderSW + totalSIDL + totalPremix + totalPed;

  const dlDiagram = udlDiagram(totalDLUDL, L);
  const dlEx = diagramExtremes(dlDiagram);

  const deadLoadResult: LoadCaseResult = {
    label: 'Dead Load (DL)',
    ra: dlEx.ra,
    rb: dlEx.rb,
    maxMoment: dlEx.maxMoment,
    maxMomentPos: dlEx.maxMomentPos,
    maxShear: dlEx.maxAbsShear,
    totalLoad: dlEx.totalLoad,
    diagram: dlDiagram,
  };

  // ── Pipe & Water Loading (UDLs along span) ───────────────────────────────
  function udlCase(w: number, label: string): LoadCaseResult | null {
    if (w <= 0) return null;
    const diagram = udlDiagram(w, L);
    const ex = diagramExtremes(diagram);
    return {
      label,
      ra: ex.ra, rb: ex.rb,
      maxMoment: ex.maxMoment,
      maxMomentPos: ex.maxMomentPos,
      maxShear: ex.maxAbsShear,
      totalLoad: ex.totalLoad,
      diagram,
    };
  }

  const pipeUDL = totalPipeUDL(pl);
  const pipeWaterUDL = pipeContentsUDL(pl, wl);
  const deckWaterUDL = pondingUDL(wl, geo);
  const waterUDL = pipeWaterUDL + deckWaterUDL;

  const pipeResult  = udlCase(pipeUDL,  'Pipe Loading');
  const waterResult = udlCase(waterUDL, 'Water Loading');

  // Permanent actions superposed into every combination
  const permanentDiagram = superpose(
    [dlDiagram, pipeResult?.diagram, waterResult?.diagram].filter((d): d is DiagramPoint[] => !!d)
  );
  const permanentLabel =
    'DL' + (pipeResult ? ' + Pipe' : '') + (waterResult ? ' + Water' : '');

  // ── HA Loading ────────────────────────────────────────────────────────────
  const haW = haUDLIntensity(L);          // kN/m per lane
  const haKEL = 120;                       // kN per lane (BD 37/01 Cl. 6.2.2)
  const haUDLTotal = haW * laneCount;     // kN/m over all lanes
  const haKELTotal = haKEL * laneCount;   // kN — KEL applied at L/2 for max BM

  let haResult: LoadCaseResult | null = null;
  if (hl.activeLoadCases.includes('HA')) {
    const haUDLDiag = udlDiagram(haUDLTotal, L);
    const haKELDiag = pointLoadDiagram(haKELTotal, L / 2, L); // KEL at mid for max BM
    const haDiag = superpose([haUDLDiag, haKELDiag]);
    const haEx = diagramExtremes(haDiag);
    haResult = {
      label: 'HA Loading',
      ra: haEx.ra,
      rb: haEx.rb,
      maxMoment: haEx.maxMoment,
      maxMomentPos: haEx.maxMomentPos,
      maxShear: haEx.maxAbsShear,
      totalLoad: haEx.totalLoad,
      diagram: haDiag,
    };
  }

  // ── HB30 Loading ──────────────────────────────────────────────────────────
  let hb30Result: LoadCaseResult | null = null;
  if (hl.activeLoadCases.includes('HB30')) {
    const hb30 = hbWorstDiagram(30, hl.hbAxleSpacing, L);

    // Include HA in remaining lanes if requested
    let hb30Diag = hb30.diagram;
    let hb30RA = hb30.ra, hb30RB = hb30.rb;
    if (hl.includeHAWithHB && laneCount > 1) {
      const remainingLanes = laneCount - 1;
      const haCompUDL = udlDiagram(haW * remainingLanes, L);
      const haCompKEL = pointLoadDiagram(haKEL * remainingLanes, L / 2, L);
      hb30Diag = superpose([hb30.diagram, haCompUDL, haCompKEL]);
      const ex = diagramExtremes(hb30Diag);
      hb30RA = ex.ra; hb30RB = ex.rb;
    }

    const hb30Ex = diagramExtremes(hb30Diag);
    hb30Result = {
      label: 'HB30 Loading' + (hl.includeHAWithHB && laneCount > 1 ? ' + HA' : ''),
      ra: hb30RA,
      rb: hb30RB,
      maxMoment: hb30Ex.maxMoment,
      maxMomentPos: hb30Ex.maxMomentPos,
      maxShear: hb30Ex.maxAbsShear,
      totalLoad: hb30Ex.totalLoad,
      diagram: hb30Diag,
    };
  }

  // ── HB45 Loading ──────────────────────────────────────────────────────────
  let hb45Result: LoadCaseResult | null = null;
  if (hl.activeLoadCases.includes('HB45')) {
    const hb45 = hbWorstDiagram(45, hl.hbAxleSpacing, L);

    let hb45Diag = hb45.diagram;
    let hb45RA = hb45.ra, hb45RB = hb45.rb;
    if (hl.includeHAWithHB && laneCount > 1) {
      const remainingLanes = laneCount - 1;
      const haCompUDL = udlDiagram(haW * remainingLanes, L);
      const haCompKEL = pointLoadDiagram(haKEL * remainingLanes, L / 2, L);
      hb45Diag = superpose([hb45.diagram, haCompUDL, haCompKEL]);
      const ex = diagramExtremes(hb45Diag);
      hb45RA = ex.ra; hb45RB = ex.rb;
    }

    const hb45Ex = diagramExtremes(hb45Diag);
    hb45Result = {
      label: 'HB45 Loading' + (hl.includeHAWithHB && laneCount > 1 ? ' + HA' : ''),
      ra: hb45RA,
      rb: hb45RB,
      maxMoment: hb45Ex.maxMoment,
      maxMomentPos: hb45Ex.maxMomentPos,
      maxShear: hb45Ex.maxAbsShear,
      totalLoad: hb45Ex.totalLoad,
      diagram: hb45Diag,
    };
  }

  // ── Combined permanent + LL ──────────────────────────────────────────────
  function combine(llResult: LoadCaseResult, llLabel: string): LoadCaseResult {
    const label = `${permanentLabel} + ${llLabel}`;
    const cDiag = superpose([permanentDiagram, llResult.diagram]);
    const ex = diagramExtremes(cDiag);
    return {
      label,
      ra: ex.ra, rb: ex.rb,
      maxMoment: ex.maxMoment,
      maxMomentPos: ex.maxMomentPos,
      maxShear: ex.maxAbsShear,
      totalLoad: ex.totalLoad,
      diagram: cDiag,
    };
  }

  const combinedHA   = haResult   ? combine(haResult,   'HA')   : null;
  const combinedHB30 = hb30Result ? combine(hb30Result, 'HB30') : null;
  const combinedHB45 = hb45Result ? combine(hb45Result, 'HB45') : null;

  // ── Governing Case ───────────────────────────────────────────────────────
  const candidates = [combinedHA, combinedHB30, combinedHB45].filter(
    (c): c is LoadCaseResult => c !== null
  );
  const governing = candidates.reduce((best, c) =>
    c.maxMoment > best.maxMoment ? c : best
  );
  const governingCase = governing.label;

  // ── Envelope ─────────────────────────────────────────────────────────────
  const allDiagrams = candidates.map(c => c.diagram);

  const sfdEnvelope: DiagramPoint[] = Array.from({ length: N_PTS }, (_, i) => {
    const x = (i / (N_PTS - 1)) * L;
    const maxS = Math.max(...allDiagrams.map(d => d[i]?.shear ?? 0));
    const minS = Math.min(...allDiagrams.map(d => d[i]?.shear ?? 0));
    return { x, shear: Math.abs(maxS) > Math.abs(minS) ? maxS : minS, moment: 0 };
  });

  const bmdEnvelope: DiagramPoint[] = Array.from({ length: N_PTS }, (_, i) => {
    const x = (i / (N_PTS - 1)) * L;
    const maxM = Math.max(...allDiagrams.map(d => d[i]?.moment ?? 0));
    return { x, shear: 0, moment: maxM };
  });

  // ── Girder Transverse Distribution (Courbon's Method) ─────────────────────
  // Worst eccentricity: load resultant at outermost lane edge
  const laneWidth = geo.carriagewayWidth / laneCount;
  const deckCL = geo.deckWidth / 2;
  const kerb = deckCL; // assume carriageway starts at same CL as deck (simplified)
  // Worst lane centroid positions (outermost lane)
  const outerLaneCentroid = kerb - laneWidth / 2;   // from deck CL
  const eccentricity = Math.max(outerLaneCentroid, 0);

  const factors = courbonFactors(geo.numberOfGirders, geo.girderSpacing, eccentricity);
  const govDiag = governing;

  const girderResults: GirderDistributionResult[] = factors.map((f, i) => {
    const posFromCL = -((geo.numberOfGirders - 1) * geo.girderSpacing) / 2 + i * geo.girderSpacing;
    return {
      girderNo: i + 1,
      positionFromCL: posFromCL,
      distributionFactor: f,
      maxMoment: f * govDiag.maxMoment,
      maxShear: f * govDiag.maxShear,
      reactionA: f * govDiag.ra,
      reactionB: f * govDiag.rb,
    };
  });

  // ── Assumptions ──────────────────────────────────────────────────────────
  const cwRule = laneRuleDescription(geo.carriagewayWidth);
  const walkwayDesc = geo.walkwaysEnabled
    ? `Left ${geo.leftWalkwayWidth.toFixed(2)} m + Right ${geo.rightWalkwayWidth.toFixed(2)} m = ${walkwayWidth.toFixed(2)} m total.`
    : 'No walkways defined.';

  const assumptions = [
    `Simply supported single-span bridge, L = ${L.toFixed(2)} m.`,
    `Overall deck width = ${geo.deckWidth.toFixed(2)} m. Parapet = ${geo.parapetWidth.toFixed(2)} m each side.`,
    `Walkways: ${walkwayDesc}`,
    `Carriageway width (computed) = ${geo.carriagewayWidth.toFixed(2)} m.`,
    `Notional lanes: ${laneCount} lane${laneCount !== 1 ? 's' : ''} per BD 37/01 Cl. 3.2.1 — ${cwRule}.`,
    `HA loading per BD 37/01: UDL = ${haW.toFixed(2)} kN/m/lane, KEL = 120 kN/lane.`,
    `HA KEL positioned at mid-span for maximum bending moment.`,
    `HB vehicle: 4 equal axles at 1.8 m, ${hl.hbAxleSpacing + 1.8} m, ${hl.hbAxleSpacing + 3.6} m from front.`,
    `HB axle load: HB30 = ${30 * 10} kN/axle, HB45 = ${45 * 10} kN/axle.`,
    `HB vehicle position scanned over full span (300 increments) to maximise sagging moment.`,
    `Transverse distribution by Courbon's method — rigid deck, equal girder stiffness assumed.`,
    `Eccentricity applied: outermost lane centroid ${eccentricity.toFixed(2)} m from deck CL.`,
    `Pedestrian load applies to walkways only — not to parapets.`,
    `Total dead load UDL = ${totalDLUDL.toFixed(2)} kN/m (all girders + SIDL + premix + pedestrian).`,
    ...(pipeResult
      ? [
          `Pipe loading = ${pipeUDL.toFixed(2)} kN/m along span: ` +
            pl.pipes
              .map((p, i) => `${p.quantity}× ${p.label.trim() || `Pipe ${i + 1}`} ` +
                `(Ø${p.outerDiameter} × ${p.wallThickness} mm, ${pipeSelfWeight(p).toFixed(2)} kN/m each)`)
              .join('; ') + '.',
          `Pipes treated as a UDL over the full span and included in every combination as a permanent action.`,
        ]
      : []),
    ...(waterResult
      ? [
          `Water loading = ${waterUDL.toFixed(2)} kN/m along span (γw = ${wl.unitWeight.toFixed(2)} kN/m³)` +
            (pipeWaterUDL > 0 ? ` — pipes running full: ${pipeWaterUDL.toFixed(2)} kN/m` : '') +
            (deckWaterUDL > 0
              ? `${pipeWaterUDL > 0 ? ';' : ' —'} standing water ${wl.pondingDepth} mm deep over ` +
                `${pondingWidth(wl, geo).toFixed(2)} m ${wl.pondingExtent === 'deck' ? 'deck' : 'carriageway'} width: ${deckWaterUDL.toFixed(2)} kN/m`
              : '') + '.',
          `Water load included in every combination as a permanent action (conservative).`,
        ]
      : []),
    `All loads are CHARACTERISTIC (unfactored). Apply γf factors per BS 5400-1 for ULS/SLS design.`,
  ];

  return {
    isValid: true,
    errors: [],
    numberOfLanes: laneCount,
    haUDLPerLane: haW,
    haKELPerLane: haKEL,
    hbAxleLoad: { hb30: 300, hb45: 450 },
    deadLoadResult,
    pipeResult,
    waterResult,
    pipeUDL,
    waterUDL,
    haResult,
    hb30Result,
    hb45Result,
    combinedHA,
    combinedHB30,
    combinedHB45,
    governingCase,
    governingCombined: governing,
    sfdEnvelope,
    bmdEnvelope,
    girderResults,
    assumptions,
  };
}

/** Format a number to fixed decimal places with unit */
export function fmt(val: number, decimals = 2, unit = ''): string {
  return `${val.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}
