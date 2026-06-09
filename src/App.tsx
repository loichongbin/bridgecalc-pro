import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import {
  BridgeGeometry, GirderProperties, DeadLoadInputs,
  HighwayLoadInputs, CalculationResults,
} from './types/bridge';
import { runBridgeAnalysis } from './utils/calculations';

// ─── Default Inputs ───────────────────────────────────────────────────────────

const DEFAULT_GEOMETRY: BridgeGeometry = {
  spanLength: 30,
  numberOfGirders: 5,
  girderSpacing: 1.75,
  deckWidth: 10.5,
  parapetWidth: 0.5,
  walkwaysEnabled: true,
  leftWalkwayWidth: 1.0,
  rightWalkwayWidth: 1.0,
  // carriageway = 10.5 − 2×0.5 − 1.0 − 1.0 = 7.5 m → 2 lanes (BD37/01)
  carriagewayWidth: 7.5,
};

const DEFAULT_GIRDER: GirderProperties = {
  selfWeight: 12,
  sectionType: 'PSC-I',
  customName: '',
};

const DEFAULT_DEAD_LOADS: DeadLoadInputs = {
  sidlOption: '10',
  sidlCustom: 10,
  premixEnabled: true,
  premixThickness: 100,
  premixDensity: 24,
  pedestrianEnabled: false,
  pedestrianLoad: 5,
};

const DEFAULT_HIGHWAY: HighwayLoadInputs = {
  activeLoadCases: ['HA', 'HB30', 'HB45'],
  hbAxleSpacing: 6,
  includeHAWithHB: true,
  lanesOverride: null,
};

// ─── Persistence keys ─────────────────────────────────────────────────────────
// Bump version when schema changes to avoid stale data issues
const STORAGE_KEY = 'bridgecalc_inputs_v2';

function loadSavedInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveInputs(data: object) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const saved = loadSavedInputs();

  const [geometry,     setGeometry]     = useState<BridgeGeometry>(    saved?.geometry     ?? DEFAULT_GEOMETRY);
  const [girderProps,  setGirderProps]  = useState<GirderProperties>(   saved?.girderProps  ?? DEFAULT_GIRDER);
  const [deadLoads,    setDeadLoads]    = useState<DeadLoadInputs>(     saved?.deadLoads    ?? DEFAULT_DEAD_LOADS);
  const [highwayLoads, setHighwayLoads] = useState<HighwayLoadInputs>(  saved?.highwayLoads ?? DEFAULT_HIGHWAY);
  const [results,      setResults]      = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [darkMode,     setDarkMode]     = useState(() => {
    try { return localStorage.getItem('bridgecalc_dark') === 'true'; } catch { return false; }
  });

  // ── Dark mode effect ──────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('bridgecalc_dark', String(darkMode)); } catch { /* ignore */ }
  }, [darkMode]);

  // ── Persist inputs on change ──────────────────────────────────────────────
  useEffect(() => {
    saveInputs({ geometry, girderProps, deadLoads, highwayLoads });
  }, [geometry, girderProps, deadLoads, highwayLoads]);

  // ── Calculate ─────────────────────────────────────────────────────────────
  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    // Run synchronously but defer to allow UI to update (spinner)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const res = runBridgeAnalysis(geometry, girderProps, deadLoads, highwayLoads);
        setResults(res);
        setIsCalculating(false);
        // Scroll results into view on mobile
        if (window.innerWidth < 768) {
          document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }, [geometry, girderProps, deadLoads, highwayLoads]);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Errors to surface in input panel ─────────────────────────────────────
  const errors = results && !results.isValid ? results.errors : [];

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onPrint={handlePrint}
        hasResults={!!(results?.isValid)}
      />

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Left: Input Panel ── */}
        <aside className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          <InputPanel
            geometry={geometry}
            girderProps={girderProps}
            deadLoads={deadLoads}
            highwayLoads={highwayLoads}
            onGeometryChange={setGeometry}
            onGirderChange={setGirderProps}
            onDeadLoadChange={setDeadLoads}
            onHighwayLoadChange={setHighwayLoads}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            errors={errors}
          />
        </aside>

        {/* ── Right: Results Panel ── */}
        <main
          id="results-panel"
          className="flex-1 bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden"
        >
          <ResultsPanel
            results={results}
            geometry={geometry}
            highwayLoads={highwayLoads}
            darkMode={darkMode}
          />
        </main>
      </div>
    </div>
  );
}
