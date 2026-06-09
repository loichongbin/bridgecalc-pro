import React from 'react';
import { CalculationResults, BridgeGeometry } from '../types/bridge';

interface Props {
  results: CalculationResults;
  geometry: BridgeGeometry;
}

export function GirderDistributionTable({ results, geometry }: Props) {
  const { girderResults } = results;
  if (girderResults.length === 0) return null;

  const maxDF = Math.max(...girderResults.map(g => g.distributionFactor));
  const governingGirder = girderResults.find(g => g.distributionFactor === maxDF);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
          Transverse Load Distribution (Courbon's Method)
        </h3>
        <span className="badge-amber text-xs">Governing girder: G{governingGirder?.girderNo}</span>
      </div>

      {/* Schematic */}
      <div className="flex items-end justify-center gap-0 overflow-x-auto py-2">
        {girderResults.map(g => {
          const barH = Math.max(8, Math.round(g.distributionFactor * 80));
          const isGov = g.distributionFactor === maxDF;
          return (
            <div key={g.girderNo} className="flex flex-col items-center mx-2">
              <span className={`text-[10px] font-mono mb-1 ${isGov ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-400'}`}>
                {(g.distributionFactor).toFixed(3)}
              </span>
              <div
                className={`w-8 rounded-t transition-all ${
                  isGov ? 'bg-amber-400 dark:bg-amber-500' : 'bg-blue-300 dark:bg-blue-700'
                }`}
                style={{ height: barH }}
              />
              <div className={`w-8 h-1 ${isGov ? 'bg-amber-500' : 'bg-blue-400 dark:bg-blue-600'}`} />
              <span className={`text-xs font-bold mt-1 ${isGov ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                G{g.girderNo}
              </span>
              {isGov && (
                <span className="text-[9px] text-amber-500 dark:text-amber-400 mt-0.5">GOVERNS</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {['Girder', 'Position\n(from CL)', 'Distribution\nFactor', 'Max M\n(kNm)', 'Max V\n(kN)', 'Reaction A\n(kN)', 'Reaction B\n(kN)'].map(h => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-pre-line leading-tight"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {girderResults.map(g => {
              const isGov = g.distributionFactor === maxDF;
              return (
                <tr
                  key={g.girderNo}
                  className={`${
                    isGov
                      ? 'bg-amber-50 dark:bg-amber-950/30'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  <td className="px-3 py-2.5 font-bold">
                    <div className="flex items-center gap-1.5">
                      G{g.girderNo}
                      {isGov && <span className="badge-amber text-[9px]">★</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 engineering-value">
                    {g.positionFromCL >= 0 ? '+' : ''}{g.positionFromCL.toFixed(2)} m
                  </td>
                  <td className={`px-3 py-2.5 engineering-value font-bold ${
                    isGov ? 'text-amber-700 dark:text-amber-300' : ''
                  }`}>
                    {g.distributionFactor.toFixed(4)}
                  </td>
                  <td className={`px-3 py-2.5 engineering-value ${isGov ? 'font-bold text-amber-700 dark:text-amber-300' : ''}`}>
                    {g.maxMoment.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 engineering-value">{g.maxShear.toFixed(1)}</td>
                  <td className="px-3 py-2.5 engineering-value">{g.reactionA.toFixed(1)}</td>
                  <td className="px-3 py-2.5 engineering-value">{g.reactionB.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-semibold text-gray-700 dark:text-gray-300">Courbon's Method Assumptions:</p>
        <p>• Rigid deck — full transverse load sharing between all girders.</p>
        <p>• Equal girder stiffness (EI uniform across section).</p>
        <p>• Distribution factor f<sub>i</sub> = (1/N)(1 + N·e·x<sub>i</sub> / Σx<sub>i</sub>²)</p>
        <p>• Eccentricity e = outermost lane centroid to deck CL. Maximises load on outer girder.</p>
        <p>• Verify with grillage or FE analysis for final design.</p>
      </div>
    </div>
  );
}
