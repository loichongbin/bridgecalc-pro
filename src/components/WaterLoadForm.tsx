import React from 'react';
import { WaterLoadInputs, PipeLoadInputs, BridgeGeometry, PondingExtent } from '../types/bridge';
import { InputField, SelectField, ToggleField } from './ui/InputField';
import { pipeContentsUDL, pondingUDL, pondingWidth } from '../utils/calculations';

interface Props {
  value: WaterLoadInputs;
  onChange: (v: WaterLoadInputs) => void;
  pipeLoads: PipeLoadInputs;
  geometry: BridgeGeometry;
}

export function WaterLoadForm({ value, onChange, pipeLoads, geometry }: Props) {
  const set = <K extends keyof WaterLoadInputs>(key: K, val: WaterLoadInputs[K]) =>
    onChange({ ...value, [key]: val });

  const pipesDefined = pipeLoads.enabled && pipeLoads.pipes.length > 0;
  const contents = pipeContentsUDL(pipeLoads, value);
  const ponding = pondingUDL(value, geometry);

  return (
    <div className="space-y-4 mt-2">
      <InputField
        label="Unit weight of water (γw)"
        unit="kN/m³"
        value={value.unitWeight}
        onChange={v => set('unitWeight', v)}
        min={9}
        max={12}
        step={0.01}
        hint="Fresh water 9.81 kN/m³ · sea water ≈ 10.05 kN/m³"
      />

      {/* ── Water in pipes ── */}
      <div className="space-y-2">
        <p className="section-header">Water in Pipes</p>

        {!pipesDefined && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">No pipes defined.</span> Enable pipe loading and add at
            least one pipe run to apply water contents.
          </div>
        )}

        <ToggleField
          label="Pipes running full"
          checked={value.pipeContentsEnabled}
          onChange={v => set('pipeContentsEnabled', v)}
          hint="Water weight = γw × π/4 × (internal Ø)² for every pipe in the Pipe Loading section"
        />

        {value.pipeContentsEnabled && pipesDefined && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            Water in pipes: {contents.toFixed(2)} kN/m along span
          </p>
        )}
      </div>

      {/* ── Standing water ── */}
      <div className="space-y-2">
        <p className="section-header">Standing Water on Deck</p>
        <ToggleField
          label="Include standing water"
          checked={value.pondingEnabled}
          onChange={v => set('pondingEnabled', v)}
          hint="Ponding from blocked drainage or flooding, applied as a uniform depth"
        />

        {value.pondingEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Water depth"
                unit="mm"
                value={value.pondingDepth}
                onChange={v => set('pondingDepth', v)}
                min={1}
                max={2000}
                step={5}
              />
              <SelectField
                label="Applied over"
                value={value.pondingExtent}
                onChange={v => set('pondingExtent', v as PondingExtent)}
                options={[
                  { value: 'carriageway', label: 'Carriageway' },
                  { value: 'deck',        label: 'Full deck width' },
                ]}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {((value.pondingDepth / 1000) * value.unitWeight).toFixed(2)} kN/m² ×{' '}
              {pondingWidth(value, geometry).toFixed(2)} m → {ponding.toFixed(2)} kN/m along span
            </p>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
        Total water load: {(contents + ponding).toFixed(2)} kN/m along span
      </p>
    </div>
  );
}
