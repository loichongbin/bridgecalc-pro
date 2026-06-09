import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
  ReferenceDot,
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
          <span className="font-mono font-bold">{p.value.toFixed(1)} kNm</span>
        </div>
      ))}
    </div>
  );
}

export function BMDChart({ results, darkMode }: Props) {
  const govDiag = results.governingCombined.diagram;
  const dlDiag  = results.deadLoadResult.diagram;

  // BMD is plotted inverted (tension at bottom = sagging positive plotted down)
  // We negate to achieve engineering convention (positive moment shown below baseline)
  const data = govDiag.map((p, i) => ({
    x:       +p.x.toFixed(3),
    moment:  +p.moment.toFixed(2),
    dlMoment: +dlDiag[i].moment.toFixed(2),
  }));

  const maxM    = results.governingCombined.maxMoment;
  const maxMPos = results.governingCombined.maxMomentPos;

  const gridColor = darkMode ? '#374151' : '#e5e7eb';
  const axisColor = darkMode ? '#6b7280' : '#9ca3af';
  const textColor = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
          Bending Moment Diagram (BMD)
        </h3>
        <span className="badge-green">Sagging positive ↓</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, govDiag[govDiag.length - 1]?.x ?? 1]}
            tickFormatter={v => `${v.toFixed(0)}m`}
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
            label={{ value: 'Position (m)', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: textColor }}
          />
          <YAxis
            reversed
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
            tickFormatter={v => `${v.toFixed(0)}`}
            label={{ value: 'M (kNm)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: textColor }}
          />
          <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : '#4b5563'} strokeWidth={1.5} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />

          {/* DL only moment */}
          <Line
            dataKey="dlMoment"
            name="DL only"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            type="monotone"
          />

          {/* Combined governing moment */}
          <Area
            dataKey="moment"
            name="Combined (governing)"
            stroke="#10b981"
            fill="#10b98120"
            strokeWidth={2.5}
            dot={false}
            type="monotone"
            activeDot={{ r: 4, fill: '#10b981' }}
          />

          {/* Max moment marker */}
          <ReferenceDot
            x={+maxMPos.toFixed(3)}
            y={maxM}
            r={6}
            fill="#10b981"
            stroke="#fff"
            strokeWidth={2}
            label={{
              value: `${maxM.toFixed(0)} kNm`,
              position: 'top',
              fontSize: 11,
              fontWeight: 'bold',
              fill: darkMode ? '#34d399' : '#059669',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Quick stats */}
      <div className="mt-2 flex gap-4 text-xs font-mono text-gray-500 dark:text-gray-400 justify-center">
        <span>
          M<sub>max</sub> = <strong className="text-emerald-600 dark:text-emerald-400">
            {results.governingCombined.maxMoment.toFixed(1)} kNm
          </strong>
        </span>
        <span>
          @ x = <strong className="text-emerald-600 dark:text-emerald-400">
            {results.governingCombined.maxMomentPos.toFixed(2)} m
          </strong>
        </span>
        <span className="text-[10px]">
          (wL²/8 = {(results.deadLoadResult.maxMoment).toFixed(0)} kNm DL)
        </span>
      </div>
    </div>
  );
}
