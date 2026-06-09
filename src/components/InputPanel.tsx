import React from 'react';
import { Ruler, Layers, Weight, Truck, Calculator, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { BridgeGeometry, GirderProperties, DeadLoadInputs, HighwayLoadInputs } from '../types/bridge';
import { CollapsibleSection } from './ui/CollapsibleSection';
import { BridgeGeometryForm } from './BridgeGeometryForm';
import { GirderPropertiesForm } from './GirderPropertiesForm';
import { DeadLoadForm } from './DeadLoadForm';
import { HighwayLoadForm } from './HighwayLoadForm';
import { haUDLIntensity } from '../utils/calculations';

interface Props {
  geometry: BridgeGeometry;
  girderProps: GirderProperties;
  deadLoads: DeadLoadInputs;
  highwayLoads: HighwayLoadInputs;
  onGeometryChange: (v: BridgeGeometry) => void;
  onGirderChange: (v: GirderProperties) => void;
  onDeadLoadChange: (v: DeadLoadInputs) => void;
  onHighwayLoadChange: (v: HighwayLoadInputs) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  errors: string[];
}

export function InputPanel({
  geometry, girderProps, deadLoads, highwayLoads,
  onGeometryChange, onGirderChange, onDeadLoadChange, onHighwayLoadChange,
  onCalculate, isCalculating, errors,
}: Props) {
  const haUDL = haUDLIntensity(geometry.spanLength);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
          Bridge Inputs
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Define geometry and loading parameters
        </p>
      </div>

      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <CollapsibleSection
          title="Bridge Geometry"
          icon={<Ruler size={16} />}
          defaultOpen
        >
          <BridgeGeometryForm value={geometry} onChange={onGeometryChange} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Girder Properties"
          icon={<Layers size={16} />}
          defaultOpen
        >
          <GirderPropertiesForm value={girderProps} onChange={onGirderChange} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Dead Loads"
          icon={<Weight size={16} />}
          defaultOpen
        >
          <DeadLoadForm
            value={deadLoads}
            onChange={onDeadLoadChange}
            deckWidth={geometry.deckWidth}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Highway Loading"
          icon={<Truck size={16} />}
          badge="BS 5400"
          defaultOpen
        >
          <HighwayLoadForm
            value={highwayLoads}
            onChange={onHighwayLoadChange}
            haUDL={haUDL}
            spanLength={geometry.spanLength}
          />
        </CollapsibleSection>
      </div>

      {/* Calculate button — pinned to bottom */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          >
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </div>
          </motion.div>
        )}

        <button
          onClick={onCalculate}
          disabled={isCalculating}
          className="w-full btn-calculate text-white font-bold py-3 rounded-xl shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Calculator size={16} />
          {isCalculating ? 'Analysing…' : 'Run Analysis'}
        </button>

        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
          Elastic analysis · Characteristic loads · Simply supported
        </p>
      </div>
    </div>
  );
}
