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
  CalculationResults,
  DiagramPoint,
  LoadCaseResult,
  GirderDistributionResult,
} from '../types/bridge';

const N_PTS = 121; // diagram resolution (points along span)

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
  hl: HighwayLoadInputs
): string[] {
  const errs: string[] = [];
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
  hl: HighwayLoadInputs
): CalculationResults {
  const errors = validate(geo, girder, dl, hl);
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

  // ── Combined DL + LL ─────────────────────────────────────────────────────
  function combine(llResult: LoadCaseResult, label: string): LoadCaseResult {
    const cDiag = superpose([dlDiagram, llResult.diagram]);
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

  const combinedHA   = haResult   ? combine(haResult,   'DL + HA')   : null;
  const combinedHB30 = hb30Result ? combine(hb30Result, 'DL + HB30') : null;
  const combinedHB45 = hb45Result ? combine(hb45Result, 'DL + HB45') : null;

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
