import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { CalculationResults } from '../types/bridge';

interface Props {
  results: CalculationResults;
  darkMode: boolean;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-lg shadow-xl p-3 border border-gray-700 min-w-[160px]">
      <p className="font-semibold mb-1.5 text-gray-300">x = {(label ?? 0).toFixed(2)} m</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-bold">{p.value.toFixed(1)} kN</span>
        </div>
      ))}
    </div>
  );
}

export function SFDChart({ results, darkMode }: Props) {
  const govDiag = results.governingCombined.diagram;
  const dlDiag  = results.deadLoadResult.diagram;

  const data = govDiag.map((p, i) => ({
    x:       +p.x.toFixed(3),
    shear:   +p.shear.toFixed(2),
    dlShear: +dlDiag[i].shear.toFixed(2),
  }));

  const gridColor  = darkMode ? '#374151' : '#e5e7eb';
  const axisColor  = darkMode ? '#6b7280' : '#9ca3af';
  const textColor  = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
          Shear Force Diagram (SFD)
        </h3>
        <span className="badge-blue">{results.governingCase}</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, results.governingCombined.diagram[results.governingCombined.diagram.length - 1]?.x ?? 1]}
            tickFormatter={v => `${v.toFixed(0)}m`}
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
            label={{ value: 'Position (m)', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: textColor }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
            tickFormatter={v => `${v.toFixed(0)}`}
            label={{ value: 'V (kN)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: textColor }}
          />
          <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : '#4b5563'} strokeWidth={1.5} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />

          {/* Dead load shear — dashed reference */}
          <Line
            dataKey="dlShear"
            name="DL only"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            type="linear"
          />

          {/* Governing combined shear — filled area */}
          <Area
            dataKey="shear"
            name="Combined (governing)"
            stroke="#3b82f6"
            fill="#3b82f620"
            strokeWidth={2}
            dot={false}
            type="linear"
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Quick stats below chart */}
      <div className="mt-2 flex gap-4 text-xs font-mono text-gray-500 dark:text-gray-400 justify-center">
        <span>
          V<sub>max</sub> = <strong className="text-blue-600 dark:text-blue-400">
            +{results.governingCombined.ra.toFixed(1)} kN
          </strong> (@ A)
        </span>
        <span>
          V<sub>min</sub> = <strong className="text-blue-600 dark:text-blue-400">
            -{results.governingCombined.rb.toFixed(1)} kN
          </strong> (@ B)
        </span>
      </div>
    </div>
  );
}
