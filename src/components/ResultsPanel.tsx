import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, BookOpen } from 'lucide-react';
import { CalculationResults, BridgeGeometry, HighwayLoadInputs } from '../types/bridge';
import { Card } from './ui/Card';
import { NumericalResults } from './NumericalResults';
import { SFDChart } from './SFDChart';
import { BMDChart } from './BMDChart';
import { LoadingDiagram } from './LoadingDiagram';
import { GirderDistributionTable } from './GirderDistributionTable';
import { AssumptionsPanel } from './AssumptionsPanel';

interface Props {
  results: CalculationResults | null;
  geometry: BridgeGeometry;
  highwayLoads: HighwayLoadInputs;
  darkMode: boolean;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-6">
        <BarChart2 size={36} className="text-blue-400 dark:text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
        Analysis Ready
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed mb-6">
        Configure your bridge geometry and loading parameters on the left, then click{' '}
        <strong className="text-blue-600 dark:text-blue-400">Run Analysis</strong> to calculate
        shear forces, bending moments, and girder distributions.
      </p>

      <div className="grid grid-cols-3 gap-4 text-xs text-center text-gray-400 dark:text-gray-500">
        {[
          { icon: '📐', label: 'Bridge Geometry', desc: 'Span, girders, deck' },
          { icon: '⚖️', label: 'Dead Loads', desc: 'SW, SIDL, premix' },
          { icon: '🚛', label: 'Highway Loading', desc: 'HA, HB30, HB45' },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
            <span className="text-2xl">{item.icon}</span>
            <span className="font-semibold text-gray-500 dark:text-gray-400">{item.label}</span>
            <span>{item.desc}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-gray-400 dark:text-gray-500 max-w-sm">
        {[
          'Simply supported beam theory',
          'Influence line optimisation',
          'Courbon\'s transverse distribution',
          'SFD + BMD diagrams',
          'All load cases compared',
          'Governing case highlighted',
        ].map(f => (
          <div key={f} className="flex items-center gap-1.5">
            <span className="text-green-500">✓</span> {f}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsPanel({ results, geometry, highwayLoads, darkMode }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
            Analysis Results
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {results?.isValid
              ? `${results.governingCase} governs · ${results.numberOfLanes} notional lane${results.numberOfLanes !== 1 ? 's' : ''}`
              : 'Results will appear here after analysis'}
          </p>
        </div>
        {results?.isValid && (
          <div className="flex items-center gap-2">
            <span className="badge-green">Analysis Complete</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!results || !results.isValid ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="px-5 py-5 space-y-5"
            >
              {/* Numerical summary */}
              <NumericalResults results={results} />

              {/* Loading Diagram */}
              <Card animate>
                <div className="p-4">
                  <LoadingDiagram
                    results={results}
                    geometry={geometry}
                    highwayLoads={highwayLoads}
                    darkMode={darkMode}
                  />
                </div>
              </Card>

              {/* SFD */}
              <Card animate>
                <div className="p-4">
                  <SFDChart results={results} darkMode={darkMode} />
                </div>
              </Card>

              {/* BMD */}
              <Card animate>
                <div className="p-4">
                  <BMDChart results={results} darkMode={darkMode} />
                </div>
              </Card>

              {/* Girder distribution */}
              <Card animate>
                <div className="p-4">
                  <GirderDistributionTable results={results} geometry={geometry} />
                </div>
              </Card>

              {/* Assumptions */}
              <AssumptionsPanel results={results} />

              {/* Footer */}
              <div className="text-center text-[10px] text-gray-300 dark:text-gray-600 pb-4 flex items-center justify-center gap-1">
                <BookOpen size={10} />
                BridgeCalc Pro · BS 5400 / BD 37/01 · Characteristic loads only — apply γ<sub>f</sub> for design
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
