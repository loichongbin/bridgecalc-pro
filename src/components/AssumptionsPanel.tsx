import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalculationResults } from '../types/bridge';

interface Props {
  results: CalculationResults;
}

export function AssumptionsPanel({ results }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Engineering Assumptions &amp; Methodology
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <ul className="space-y-1.5">
                {results.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">References</p>
                <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <li>• BD 37/01 — Loads for Highway Bridges (DMRB Vol. 1, Section 3, Part 14)</li>
                  <li>• BS 5400-2:2006 — Steel, concrete and composite bridges: Part 2 — Specification for loads</li>
                  <li>• BS 5400-1:2000 — Part 1: General statement</li>
                  <li>• Hambly, E.C. (1991) <em>Bridge Deck Behaviour</em>. E&amp;FN Spon.</li>
                  <li>• Courbon, J. (1941) — Transverse distribution of loads by the rigid deck assumption.</li>
                </ul>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-bold mb-1">⚠ Disclaimer</p>
                <p>
                  This tool is for preliminary engineering assessment only. Results are characteristic
                  (unfactored) and must be verified against current standards before use in design.
                  Always apply appropriate load factors (γ<sub>f3</sub>, γ<sub>fL</sub>) and material
                  partial factors for ULS and SLS limit state checks.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
