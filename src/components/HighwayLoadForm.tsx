import React from 'react';
import { HighwayLoadInputs, LoadCaseType, HBAxleSpacingType } from '../types/bridge';
import { SelectField, ToggleField } from './ui/InputField';

interface Props {
  value: HighwayLoadInputs;
  onChange: (v: HighwayLoadInputs) => void;
  haUDL: number;
  spanLength: number;
}

const LOAD_CASES: { id: LoadCaseType; label: string; desc: string; color: string }[] = [
  { id: 'HA',   label: 'HA',   desc: 'Normal highway loading — UDL + KEL per BD 37/01', color: 'blue' },
  { id: 'HB30', label: 'HB30', desc: '30 units — 300 kN/axle (e.g. industrial access)', color: 'amber' },
  { id: 'HB45', label: 'HB45', desc: '45 units — 450 kN/axle (motorway / trunk road)',   color: 'red' },
];

const colorMap = {
  blue:  { border: 'border-blue-400  dark:border-blue-600',  bg: 'bg-blue-50  dark:bg-blue-950/40',  text: 'text-blue-700  dark:text-blue-300',  check: 'accent-blue-600'  },
  amber: { border: 'border-amber-400 dark:border-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', check: 'accent-amber-600' },
  red:   { border: 'border-red-400   dark:border-red-600',   bg: 'bg-red-50   dark:bg-red-950/40',   text: 'text-red-700   dark:text-red-300',   check: 'accent-red-600'   },
};

export function HighwayLoadForm({ value, onChange, haUDL, spanLength }: Props) {
  const set = <K extends keyof HighwayLoadInputs>(key: K, val: HighwayLoadInputs[K]) =>
    onChange({ ...value, [key]: val });

  const toggleCase = (id: LoadCaseType) => {
    const active = value.activeLoadCases.includes(id)
      ? value.activeLoadCases.filter(c => c !== id)
      : [...value.activeLoadCases, id];
    set('activeLoadCases', active);
  };

  const hasHB = value.activeLoadCases.includes('HB30') || value.activeLoadCases.includes('HB45');

  return (
    <div className="space-y-4 mt-2">
      {/* ── Load Case Selection ── */}
      <div className="space-y-2">
        <p className="section-header">Active Load Cases</p>
        {LOAD_CASES.map(lc => {
          const active = value.activeLoadCases.includes(lc.id);
          const c = colorMap[lc.color as keyof typeof colorMap];
          return (
            <label
              key={lc.id}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-150 ${
                active ? `${c.border} ${c.bg}` : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                className={`mt-0.5 h-4 w-4 rounded ${c.check}`}
                checked={active}
                onChange={() => toggleCase(lc.id)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${active ? c.text : 'text-gray-700 dark:text-gray-300'}`}>
                    {lc.label}
                  </span>
                  {lc.id === 'HB45' && (
                    <span className="badge-red text-[10px]">Critical</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lc.desc}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* ── HA Parameters ── */}
      {value.activeLoadCases.includes('HA') && (
        <div className="space-y-2">
          <p className="section-header">HA Parameters (BD 37/01)</p>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">HA UDL intensity:</span>
              <span className="text-blue-700 dark:text-blue-300 font-bold">
                {haUDL.toFixed(2)} kN/m/lane
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Loaded length:</span>
              <span className="text-blue-700 dark:text-blue-300 font-bold">{spanLength.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">HA KEL:</span>
              <span className="text-blue-700 dark:text-blue-300 font-bold">120 kN/lane</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Formula (L ≤ 50 m):</span>
              <span className="text-blue-700 dark:text-blue-300 font-bold">336 / L⁰·⁶⁷</span>
            </div>
          </div>
        </div>
      )}

      {/* ── HB Parameters ── */}
      {hasHB && (
        <div className="space-y-3">
          <p className="section-header">HB Vehicle Parameters</p>

          <SelectField
            label="Inner Axle Spacing"
            value={value.hbAxleSpacing}
            onChange={v => set('hbAxleSpacing', parseInt(v) as HBAxleSpacingType)}
            options={[
              { value: 6,  label: '6 m — Minimum spacing' },
              { value: 11, label: '11 m' },
              { value: 16, label: '16 m' },
              { value: 21, label: '21 m' },
              { value: 26, label: '26 m — Maximum spacing' },
            ]}
            hint="Spacing between axle 2 and axle 3. Outer axles are fixed at 1.8 m."
          />

          {/* HB Vehicle Schematic */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Vehicle Axle Layout</p>
            <div className="flex items-center gap-1 justify-center text-[10px] font-mono text-gray-500 dark:text-gray-400">
              <span>●</span>
              <span className="border-t border-dashed border-gray-400 flex-1 text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">1.8 m</span>
              </span>
              <span>●</span>
              <span className="border-t-2 border-amber-400 flex-[3] text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold">
                  {value.hbAxleSpacing} m
                </span>
              </span>
              <span>●</span>
              <span className="border-t border-dashed border-gray-400 flex-1 text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">1.8 m</span>
              </span>
              <span>●</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
              {value.activeLoadCases.includes('HB30') && (
                <div className="text-center p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-700 dark:text-amber-300 font-bold">HB30</span>
                  <br />
                  <span className="text-gray-500">300 kN/axle</span>
                  <br />
                  <span className="text-gray-500">1200 kN total</span>
                </div>
              )}
              {value.activeLoadCases.includes('HB45') && (
                <div className="text-center p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <span className="text-red-700 dark:text-red-300 font-bold">HB45</span>
                  <br />
                  <span className="text-gray-500">450 kN/axle</span>
                  <br />
                  <span className="text-gray-500">1800 kN total</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
              Vehicle position scanned to find maximum sagging moment
            </p>
          </div>

          {/* HA with HB toggle */}
          <ToggleField
            label="Include HA in remaining lanes"
            checked={value.includeHAWithHB}
            onChange={v => set('includeHAWithHB', v)}
            hint="Apply HA loading to lanes not occupied by the HB vehicle (BS 5400 Cl. 6.4)"
          />
        </div>
      )}
    </div>
  );
}
