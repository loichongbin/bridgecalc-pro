import React from 'react';
import { GirderProperties, SectionType } from '../types/bridge';
import { InputField, SelectField } from './ui/InputField';

interface Props {
  value: GirderProperties;
  onChange: (v: GirderProperties) => void;
}

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'PSC-I',       label: 'PSC I-Beam (Prestressed Concrete)' },
  { value: 'PSC-U',       label: 'PSC U-Beam' },
  { value: 'PSC-Box',     label: 'PSC Box Beam' },
  { value: 'Steel-I',     label: 'Steel I-Section' },
  { value: 'Composite-I', label: 'Composite Steel-Concrete' },
  { value: 'RC-T',        label: 'RC T-Beam' },
  { value: 'Custom',      label: 'Custom / User Defined' },
];

// Typical self-weights as a guide
const SW_GUIDE: Record<SectionType, string> = {
  'PSC-I':       '10–18 kN/m',
  'PSC-U':       '12–20 kN/m',
  'PSC-Box':     '20–35 kN/m',
  'Steel-I':     '3–8 kN/m',
  'Composite-I': '5–12 kN/m',
  'RC-T':        '12–22 kN/m',
  'Custom':      'User defined',
};

export function GirderPropertiesForm({ value, onChange }: Props) {
  const set = <K extends keyof GirderProperties>(key: K, val: GirderProperties[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-3 mt-2">
      <SelectField
        label="Section Type"
        value={value.sectionType}
        onChange={v => set('sectionType', v as SectionType)}
        options={SECTION_TYPES}
      />

      {value.sectionType === 'Custom' && (
        <InputField
          label="Custom Section Name"
          type="text"
          value={value.customName}
          onChange={() => {}}
          onChangeText={v => set('customName', v)}
          hint="Reference label for report (e.g. 'SY1400 Beam')"
        />
      )}

      <InputField
        label="Girder Self Weight"
        unit="kN/m"
        value={value.selfWeight}
        onChange={v => set('selfWeight', v)}
        min={0.5}
        max={100}
        step={0.5}
        hint={`Typical for ${value.sectionType}: ${SW_GUIDE[value.sectionType]}`}
      />

      <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
        <span className="font-semibold">Note: </span>
        Self weight entered here is per individual girder. The total dead load
        is calculated as this value × number of girders.
      </div>
    </div>
  );
}
