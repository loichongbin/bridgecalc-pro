import React from 'react';
import { DeadLoadInputs, SIDLOption } from '../types/bridge';
import { InputField, SelectField, ToggleField } from './ui/InputField';

interface Props {
  value: DeadLoadInputs;
  onChange: (v: DeadLoadInputs) => void;
  deckWidth: number;
  walkwaysEnabled: boolean;
  leftWalkwayWidth: number;
  rightWalkwayWidth: number;
}

export function DeadLoadForm({ value, onChange, deckWidth, walkwaysEnabled, leftWalkwayWidth, rightWalkwayWidth }: Props) {
  const set = <K extends keyof DeadLoadInputs>(key: K, val: DeadLoadInputs[K]) =>
    onChange({ ...value, [key]: val });

  const sidlIntensity =
    value.sidlOption === '5' ? 5 : value.sidlOption === '10' ? 10 : value.sidlCustom;
  const premixLoad = value.premixEnabled
    ? (value.premixThickness / 1000) * value.premixDensity
    : 0;

  return (
    <div className="space-y-4 mt-2">
      {/* ── SIDL ── */}
      <div className="space-y-2">
        <p className="section-header">Superimposed Dead Load (SIDL)</p>
        <SelectField
          label="SIDL Intensity"
          value={value.sidlOption}
          onChange={v => set('sidlOption', v as SIDLOption)}
          options={[
            { value: '5',      label: '5 kN/m² — Light finishes' },
            { value: '10',     label: '10 kN/m² — Heavy finishes' },
            { value: 'custom', label: 'Custom value' },
          ]}
          hint="Applied uniformly over full deck width"
        />
        {value.sidlOption === 'custom' && (
          <InputField
            label="Custom SIDL"
            unit="kN/m²"
            value={value.sidlCustom}
            onChange={v => set('sidlCustom', v)}
            min={0}
            max={50}
            step={0.5}
          />
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          Total SIDL: {(sidlIntensity * deckWidth).toFixed(1)} kN/m along span
        </p>
      </div>

      {/* ── Premix ── */}
      <div className="space-y-2">
        <p className="section-header">Wearing Course (Premix)</p>
        <ToggleField
          label="Include wearing course"
          checked={value.premixEnabled}
          onChange={v => set('premixEnabled', v)}
        />
        {value.premixEnabled && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <InputField
              label="Thickness"
              unit="mm"
              value={value.premixThickness}
              onChange={v => set('premixThickness', v)}
              min={20}
              max={200}
              step={5}
            />
            <InputField
              label="Density"
              unit="kN/m³"
              value={value.premixDensity}
              onChange={v => set('premixDensity', v)}
              min={18}
              max={30}
              step={0.5}
              hint="Typical: 24 kN/m³"
            />
          </div>
        )}
        {value.premixEnabled && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            Premix: {premixLoad.toFixed(2)} kN/m² →{' '}
            {(premixLoad * deckWidth).toFixed(1)} kN/m along span
          </p>
        )}
      </div>

      {/* ── Pedestrian ── */}
      <div className="space-y-2">
        <p className="section-header">Pedestrian / Footway Loading</p>

        {!walkwaysEnabled && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">No walkways defined.</span> Enable pedestrian walkways
            in the Bridge Geometry section first to activate this load.
          </div>
        )}

        <ToggleField
          label="Include pedestrian loading"
          checked={value.pedestrianEnabled}
          onChange={v => set('pedestrianEnabled', v)}
          hint={walkwaysEnabled
            ? `Applied to walkways only — Left: ${leftWalkwayWidth.toFixed(2)} m + Right: ${rightWalkwayWidth.toFixed(2)} m = ${(leftWalkwayWidth + rightWalkwayWidth).toFixed(2)} m total`
            : 'Define walkway widths in Bridge Geometry to calculate load area'}
        />

        {value.pedestrianEnabled && (
          <>
            <InputField
              label="Pedestrian Load Intensity"
              unit="kN/m²"
              value={value.pedestrianLoad}
              onChange={v => set('pedestrianLoad', v)}
              min={1}
              max={10}
              step={0.5}
              hint="Typical: 5 kN/m² (BS 5400 Cl. 7.1)"
            />
            {walkwaysEnabled && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                Total pedestrian UDL:{' '}
                {(value.pedestrianLoad * (leftWalkwayWidth + rightWalkwayWidth)).toFixed(1)} kN/m along span
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
