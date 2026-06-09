import React from 'react';

interface InputFieldProps {
  label: string;
  unit?: string;
  value: number | string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hint?: string;
  type?: 'number' | 'text';
}

export function InputField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  disabled = false,
  hint,
  type = 'number',
}: InputFieldProps) {
  return (
    <div>
      <label className="input-label">
        {label}
        {unit && (
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">({unit})</span>
        )}
      </label>
      <div className="relative">
        <input
          type={type}
          className={`form-input pr-${unit ? '16' : '3'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : ''}`}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none font-mono">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-snug">{hint}</p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  options: { value: string | number; label: string }[];
  hint?: string;
  disabled?: boolean;
}

export function SelectField({ label, value, onChange, options, hint, disabled }: SelectFieldProps) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <select
        className={`form-select ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function ToggleField({ label, checked, onChange, hint }: ToggleFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 mt-0.5 ${
          checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
