import React from 'react';
import { BridgeGeometry } from '../types/bridge';
import { InputField } from './ui/InputField';

interface Props {
  value: BridgeGeometry;
  onChange: (v: BridgeGeometry) => void;
}

export function BridgeGeometryForm({ value, onChange }: Props) {
  const set = <K extends keyof BridgeGeometry>(key: K, val: BridgeGeometry[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <InputField
            label="Span Length"
            unit="m"
            value={value.spanLength}
            onChange={v => set('spanLength', v)}
            min={2}
            max={300}
            step={0.5}
            hint="Simply supported clear span between supports"
          />
        </div>

        <InputField
          label="No. of Girders"
          value={value.numberOfGirders}
          onChange={v => set('numberOfGirders', Math.round(v))}
          min={1}
          max={12}
          step={1}
        />
        <InputField
          label="Girder Spacing"
          unit="m"
          value={value.girderSpacing}
          onChange={v => set('girderSpacing', v)}
          min={0.5}
          max={10}
          step={0.1}
          hint="C/C spacing"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Deck Width"
          unit="m"
          value={value.deckWidth}
          onChange={v => set('deckWidth', v)}
          min={1}
          max={30}
          step={0.1}
          hint="Overall deck width"
        />
        <InputField
          label="Carriageway Width"
          unit="m"
          value={value.carriagewayWidth}
          onChange={v => set('carriagewayWidth', v)}
          min={1}
          max={30}
          step={0.1}
          hint="Clear between kerbs"
        />
      </div>

      {/* Quick summary */}
      <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1 font-mono">
        <div className="flex justify-between">
          <span>Total girder width:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {((value.numberOfGirders - 1) * value.girderSpacing).toFixed(2)} m
          </span>
        </div>
        <div className="flex justify-between">
          <span>Footway / margin:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {Math.max(0, value.deckWidth - value.carriagewayWidth).toFixed(2)} m total
          </span>
        </div>
        <div className="flex justify-between">
          <span>Notional lanes (auto):</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {Math.max(1, Math.floor(value.carriagewayWidth / 3.65))} lane
            {Math.max(1, Math.floor(value.carriagewayWidth / 3.65)) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
