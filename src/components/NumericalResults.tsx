import React from 'react';
import { Activity, ArrowDownToLine, Zap, BarChart3, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { CalculationResults } from '../types/bridge';
import { StatCard } from './ui/Card';

interface Props {
  results: CalculationResults;
}

function fmt(v: number, d = 2) {
  return v.toFixed(d);
}

export function NumericalResults({ results }: Props) {
  const gov = results.governingCombined;
  const dl  = results.deadLoadResult;

  // Table of all load cases
  const allCases = [
    results.combinedHA,
    results.combinedHB30,
    results.combinedHB45,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {/* ── Governing Banner ── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
      >
        <Award size={20} className="flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Governing Case</p>
          <p className="font-bold text-base leading-tight">{results.governingCase}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs opacity-80">Max BM</p>
          <p className="font-mono font-bold text-lg">{fmt(gov.maxMoment)} kNm</p>
        </div>
      </motion.div>

      {/* ── Summary Stats ── */}
      <div>
        <p className="section-header mb-2">Critical Values — Governing Combination</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Max Bending Moment"
            value={fmt(gov.maxMoment)}
            unit="kNm"
            sub={`at x = ${fmt(gov.maxMomentPos)} m`}
            accent="blue"
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Max Shear Force"
            value={fmt(gov.maxShear)}
            unit="kN"
            sub="at support"
            accent="indigo"
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Reaction at A"
            value={fmt(gov.ra)}
            unit="kN"
            sub="Left support"
            accent="green"
            icon={<ArrowDownToLine size={16} />}
          />
          <StatCard
            label="Reaction at B"
            value={fmt(gov.rb)}
            unit="kN"
            sub="Right support"
            accent="green"
            icon={<ArrowDownToLine size={16} />}
          />
        </div>
      </div>

      {/* ── Load Case Comparison Table ── */}
      {allCases.length > 0 && (
        <div>
          <p className="section-header mb-2">Load Case Comparison</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  {['Load Case', 'RA (kN)', 'RB (kN)', 'Max M (kNm)', 'x (m)', 'Max V (kN)', 'Total (kN)'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {/* Dead load row */}
                <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-3 py-2.5">
                    <span className="badge-gray">{dl.label}</span>
                  </td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.ra)}</td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.rb)}</td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.maxMoment)}</td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.maxMomentPos)}</td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.maxShear)}</td>
                  <td className="px-3 py-2.5 engineering-value">{fmt(dl.totalLoad)}</td>
                </tr>
                {allCases.map((lc, i) => {
                  const isGov = lc!.label === results.governingCase;
                  return (
                    <tr
                      key={i}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${
                        isGov ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={isGov ? 'badge-blue' : 'badge-gray'}>{lc!.label}</span>
                          {isGov && <span className="badge-green">Governs</span>}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 engineering-value ${isGov ? 'font-bold text-blue-700 dark:text-blue-300' : ''}`}>
                        {fmt(lc!.ra)}
                      </td>
                      <td className={`px-3 py-2.5 engineering-value ${isGov ? 'font-bold text-blue-700 dark:text-blue-300' : ''}`}>
                        {fmt(lc!.rb)}
                      </td>
                      <td className={`px-3 py-2.5 engineering-value ${isGov ? 'font-bold text-blue-700 dark:text-blue-300' : ''}`}>
                        {fmt(lc!.maxMoment)}
                      </td>
                      <td className="px-3 py-2.5 engineering-value">{fmt(lc!.maxMomentPos)}</td>
                      <td className={`px-3 py-2.5 engineering-value ${isGov ? 'font-bold text-blue-700 dark:text-blue-300' : ''}`}>
                        {fmt(lc!.maxShear)}
                      </td>
                      <td className="px-3 py-2.5 engineering-value">{fmt(lc!.totalLoad)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 pl-1">
            All values are characteristic (unfactored). Apply γ<sub>f</sub> factors for ULS/SLS design.
          </p>
        </div>
      )}

      {/* ── Lane Info ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="result-card text-center p-3">
          <p className="section-header mb-1">Notional Lanes</p>
          <p className="engineering-value text-2xl font-bold text-gray-800 dark:text-gray-100">
            {results.numberOfLanes}
          </p>
        </div>
        <div className="result-card text-center p-3">
          <p className="section-header mb-1">HA UDL/Lane</p>
          <p className="engineering-value text-2xl font-bold text-blue-600 dark:text-blue-400">
            {fmt(results.haUDLPerLane)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">kN/m</p>
        </div>
        <div className="result-card text-center p-3">
          <p className="section-header mb-1">HA KEL/Lane</p>
          <p className="engineering-value text-2xl font-bold text-blue-600 dark:text-blue-400">
            {results.haKELPerLane}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">kN</p>
        </div>
      </div>
    </div>
  );
}
