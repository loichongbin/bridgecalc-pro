// ─── Bridge Geometry ──────────────────────────────────────────────────────────

export interface BridgeGeometry {
  spanLength: number;          // m — simply supported span
  numberOfGirders: number;     // 1–10
  girderSpacing: number;       // m — centre-to-centre
  deckWidth: number;           // m — overall (total) deck width
  parapetWidth: number;        // m — each side (both parapets assumed equal)
  walkwaysEnabled: boolean;    // whether pedestrian walkways are present
  leftWalkwayWidth: number;    // m — walkway on left (upstream) side
  rightWalkwayWidth: number;   // m — walkway on right (downstream) side
  // ↓ Computed field — auto-updated from above; do not edit manually
  carriagewayWidth: number;    // m = deckWidth − 2×parapet − walkways
}

// ─── Girder Properties ────────────────────────────────────────────────────────

export type SectionType =
  | 'PSC-I'
  | 'PSC-U'
  | 'PSC-Box'
  | 'Steel-I'
  | 'Composite-I'
  | 'RC-T'
  | 'Custom';

export interface GirderProperties {
  selfWeight: number;     // kN/m per girder
  sectionType: SectionType;
  customName: string;
}

// ─── Dead Loads ───────────────────────────────────────────────────────────────

export type SIDLOption = '5' | '10' | 'custom';

export interface DeadLoadInputs {
  sidlOption: SIDLOption;
  sidlCustom: number;         // kN/m² — user-defined SIDL intensity
  premixEnabled: boolean;
  premixThickness: number;    // mm — wearing course thickness
  premixDensity: number;      // kN/m³ — typically 24 kN/m³ for premix
  pedestrianEnabled: boolean;
  pedestrianLoad: number;     // kN/m² — footway loading
}

// ─── Highway Loading ──────────────────────────────────────────────────────────

export type LoadCaseType = 'HA' | 'HB30' | 'HB45';
export type HBAxleSpacingType = 6 | 11 | 16 | 21 | 26; // m — between inner axle pair

export interface HighwayLoadInputs {
  activeLoadCases: LoadCaseType[];
  hbAxleSpacing: HBAxleSpacingType;
  includeHAWithHB: boolean;     // apply HA to remaining lanes when HB is selected
  lanesOverride: number | null; // null = auto-detect from carriageway width
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface DiagramPoint {
  x: number;      // m — position along span from left support
  shear: number;  // kN — positive = upward (beam sign convention)
  moment: number; // kNm — positive = sagging
}

export interface LoadCaseResult {
  label: string;
  ra: number;           // kN — left support reaction
  rb: number;           // kN — right support reaction
  maxMoment: number;    // kNm
  maxMomentPos: number; // m
  maxShear: number;     // kN (absolute, at governing section)
  totalLoad: number;    // kN
  diagram: DiagramPoint[];
}

export interface GirderDistributionResult {
  girderNo: number;
  positionFromCL: number;     // m — positive = towards footway/kerb
  distributionFactor: number; // Courbon's method
  maxMoment: number;          // kNm — attributed to this girder
  maxShear: number;           // kN
  reactionA: number;          // kN
  reactionB: number;          // kN
}

export interface CalculationResults {
  isValid: boolean;
  errors: string[];

  // Derived geometry
  numberOfLanes: number;
  haUDLPerLane: number;   // kN/m — characteristic HA UDL
  haKELPerLane: number;   // kN   — characteristic HA KEL
  hbAxleLoad: {           // characteristic HB axle loads
    hb30: number;
    hb45: number;
  };

  // Per-case results
  deadLoadResult: LoadCaseResult;
  haResult: LoadCaseResult | null;
  hb30Result: LoadCaseResult | null;
  hb45Result: LoadCaseResult | null;

  // Combined results (DL + governing LL)
  combinedHA: LoadCaseResult | null;
  combinedHB30: LoadCaseResult | null;
  combinedHB45: LoadCaseResult | null;

  // Governing combination
  governingCase: string;
  governingCombined: LoadCaseResult;

  // SFD/BMD envelope over all active combinations
  sfdEnvelope: DiagramPoint[];
  bmdEnvelope: DiagramPoint[];

  // Girder transverse distribution
  girderResults: GirderDistributionResult[];

  // Assumptions used
  assumptions: string[];
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppInputs {
  geometry: BridgeGeometry;
  girderProps: GirderProperties;
  deadLoads: DeadLoadInputs;
  highwayLoads: HighwayLoadInputs;
}
