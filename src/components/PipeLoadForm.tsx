import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PipeLoadInputs, PipeRun, PipeMaterial } from '../types/bridge';
import { InputField, SelectField, ToggleField } from './ui/InputField';
import {
  PIPE_MATERIALS, pipeDensity, pipeInternalDiameter, pipeSelfWeight, totalPipeUDL,
} from '../utils/calculations';

interface Props {
  value: PipeLoadInputs;
  onChange: (v: PipeLoadInputs) => void;
}

export function newPipeRun(n: number): PipeRun {
  return {
    id: Math.random().toString(36).slice(2, 10),
    label: `Pipe ${n}`,
    quantity: 1,
    outerDiameter: 610,
    wallThickness: 9.5,
    material: 'steel',
    customDensity: 77,
    attachmentLoad: 0.5,
  };
}

const MATERIAL_OPTIONS = [
  ...Object.entries(PIPE_MATERIALS).map(([k, m]) => ({
    value: k,
    label: `${m.label} — ${m.density} kN/m³`,
  })),
  { value: 'custom', label: 'Custom density' },
];

export function PipeLoadForm({ value, onChange }: Props) {
  const setPipe = (id: string, patch: Partial<PipeRun>) =>
    onChange({ ...value, pipes: value.pipes.map(p => (p.id === id ? { ...p, ...patch } : p)) });

  const addPipe = () =>
    onChange({ ...value, pipes: [...value.pipes, newPipeRun(value.pipes.length + 1)] });

  const removePipe = (id: string) =>
    onChange({ ...value, pipes: value.pipes.filter(p => p.id !== id) });

  return (
    <div className="space-y-4 mt-2">
      <ToggleField
        label="Include pipe loading"
        checked={value.enabled}
        onChange={v => onChange({ ...value, enabled: v })}
        hint="Utility pipes (water mains, sewers, ducts) carried by the deck, applied as a UDL along the span"
      />

      {value.enabled && (
        <>
          {value.pipes.map((p, i) => {
            const sw = pipeSelfWeight(p);
            return (
              <div
                key={p.id}
                className="space-y-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <InputField
                      label={`Pipe run ${i + 1}`}
                      type="text"
                      value={p.label}
                      onChange={() => {}}
                      onChangeText={v => setPipe(p.id, { label: v })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePipe(p.id)}
                    className="mb-0.5 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label={`Remove ${p.label || `pipe run ${i + 1}`}`}
                    title="Remove pipe run"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="No. of pipes"
                    value={p.quantity}
                    onChange={v => setPipe(p.id, { quantity: Math.round(v) })}
                    min={1}
                    max={20}
                    step={1}
                  />
                  <InputField
                    label="Outside Ø"
                    unit="mm"
                    value={p.outerDiameter}
                    onChange={v => setPipe(p.id, { outerDiameter: v })}
                    min={20}
                    max={3000}
                    step={1}
                  />
                  <InputField
                    label="Wall thickness"
                    unit="mm"
                    value={p.wallThickness}
                    onChange={v => setPipe(p.id, { wallThickness: v })}
                    min={1}
                    max={300}
                    step={0.5}
                  />
                  <InputField
                    label="Attachments"
                    unit="kN/m"
                    value={p.attachmentLoad}
                    onChange={v => setPipe(p.id, { attachmentLoad: v })}
                    min={0}
                    max={20}
                    step={0.1}
                    hint="Brackets, lining, insulation — per pipe"
                  />
                </div>

                <SelectField
                  label="Pipe material"
                  value={p.material}
                  onChange={v => setPipe(p.id, { material: v as PipeMaterial })}
                  options={MATERIAL_OPTIONS}
                />
                {p.material === 'custom' && (
                  <InputField
                    label="Material density"
                    unit="kN/m³"
                    value={p.customDensity}
                    onChange={v => setPipe(p.id, { customDensity: v })}
                    min={1}
                    max={120}
                    step={0.1}
                  />
                )}

                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono leading-relaxed">
                  Internal Ø {pipeInternalDiameter(p).toFixed(1)} mm · γ = {pipeDensity(p).toFixed(1)} kN/m³
                  <br />
                  Self-weight {sw.toFixed(2)} kN/m per pipe
                  {p.quantity > 1 && ` × ${p.quantity} = ${(sw * p.quantity).toFixed(2)} kN/m`}
                </p>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addPipe}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <Plus size={14} /> Add pipe run
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            Total pipe load: {totalPipeUDL(value).toFixed(2)} kN/m along span
          </p>
        </>
      )}
    </div>
  );
}
