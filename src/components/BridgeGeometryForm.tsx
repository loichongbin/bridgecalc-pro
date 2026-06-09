import React from 'react';
import { BridgeGeometry } from '../types/bridge';
import { InputField } from './ui/InputField';
import { ToggleField } from './ui/InputField';
import { notionalLanes } from '../utils/calculations';

interface Props {
  value: BridgeGeometry;
  onChange: (v: BridgeGeometry) => void;
}

/** Recompute carriageway width from deck geometry */
function computeCW(g: BridgeGeometry): number {
  const walkways = g.walkwaysEnabled ? g.leftWalkwayWidth + g.rightWalkwayWidth : 0;
  return Math.max(0, g.deckWidth - 2 * g.parapetWidth - walkways);
}

export function BridgeGeometryForm({ value, onChange }: Props) {
  /** Set a field and auto-recompute carriageway width */
  const set = <K extends keyof BridgeGeometry>(key: K, val: BridgeGeometry[K]) => {
    const updated = { ...value, [key]: val };
    onChange({ ...updated, carriagewayWidth: computeCW(updated) });
  };

  const cw = value.carriagewayWidth;
  const lanes = notionalLanes(cw);
  const walkwayTotal = value.walkwaysEnabled
    ? value.leftWalkwayWidth + value.rightWalkwayWidth
    : 0;

  // BD37/01 lane rule label
  const laneRule =
    cw < 5.0
      ? 'CW < 5.0 m → 1 lane'
      : cw <= 7.5
      ? '5.0 ≤ CW ≤ 7.5 m → 2 lanes'
      : `INT(${cw.toFixed(2)} / 3.65) = ${lanes} lanes`;

  return (
    <div className="space-y-4 mt-2">
      {/* ── Span & Framing ── */}
      <div>
        <p className="section-header mb-2">Span &amp; Girder Framing</p>
        <div className="space-y-3">
          <InputField
            label="Span Length"
            unit="m"
            value={value.spanLength}
            onChange={v => set('spanLength', v)}
            min={2}
            max={300}
            step={0.5}
            hint="Simply supported clear span between centrelines of supports"
          />
          <div className="grid grid-cols-2 gap-3">
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
              step={0.05}
              hint="C/C spacing"
            />
          </div>
        </div>
      </div>

      {/* ── Cross-Section ── */}
      <div>
        <p className="section-header mb-2">Bridge Cross-Section</p>
        <div className="space-y-3">
          <InputField
            label="Overall Deck Width"
            unit="m"
            value={value.deckWidth}
            onChange={v => set('deckWidth', v)}
            min={1}
            max={40}
            step={0.1}
            hint="Total structural deck width including parapets and walkways"
          />
          <InputField
            label="Parapet Width (each side)"
            unit="m"
            value={value.parapetWidth}
            onChange={v => set('parapetWidth', v)}
            min={0}
            max={2}
            step={0.05}
            hint="Structural parapet/barrier width — applied equally both sides. Typical: 0.45–0.60 m"
          />
        </div>
      </div>

      {/* ── Pedestrian Walkways ── */}
      <div>
        <p className="section-header mb-2">Pedestrian Walkways</p>
        <div className="space-y-3">
          <ToggleField
            label="Bridge has pedestrian walkways"
            checked={value.walkwaysEnabled}
            onChange={v => set('walkwaysEnabled', v)}
            hint="Enable to define footway widths on each side of the carriageway"
          />

          {value.walkwaysEnabled && (
            <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-green-300 dark:border-green-700">
              <InputField
                label="Left Walkway"
                unit="m"
                value={value.leftWalkwayWidth}
                onChange={v => set('leftWalkwayWidth', v)}
                min={0}
                max={5}
                step={0.05}
                hint="Upstream / left side"
              />
              <InputField
                label="Right Walkway"
                unit="m"
                value={value.rightWalkwayWidth}
                onChange={v => set('rightWalkwayWidth', v)}
                min={0}
                max={5}
                step={0.05}
                hint="Downstream / right side"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Cross-Section SVG schematic ── */}
      <CrossSectionSVG
        deckWidth={value.deckWidth}
        parapetWidth={value.parapetWidth}
        leftWalkway={value.walkwaysEnabled ? value.leftWalkwayWidth : 0}
        rightWalkway={value.walkwaysEnabled ? value.rightWalkwayWidth : 0}
        carriageway={cw}
        numberOfGirders={value.numberOfGirders}
        girderSpacing={value.girderSpacing}
      />

      {/* ── Computed Summary ── */}
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-mono space-y-1.5">
        <p className="text-gray-400 dark:text-gray-500 font-sans font-semibold uppercase tracking-wider text-[10px] mb-1">
          Cross-section breakdown
        </p>
        <Row label="Overall deck" value={`${value.deckWidth.toFixed(2)} m`} />
        <Row label="Parapets (×2)" value={`− ${(2 * value.parapetWidth).toFixed(2)} m`} indent />
        {value.walkwaysEnabled && (
          <Row label="Walkways (L+R)" value={`− ${walkwayTotal.toFixed(2)} m`} indent />
        )}
        <div className="border-t border-gray-300 dark:border-gray-600 my-1" />
        <Row
          label="Carriageway (computed)"
          value={`${cw.toFixed(2)} m`}
          highlight
        />

        <div className="border-t border-gray-300 dark:border-gray-600 my-1" />

        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Notional lanes</span>
          <div className="text-right">
            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{lanes}</span>
            <span className="text-gray-400 dark:text-gray-500 ml-1">lane{lanes !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <p className="text-[10px] text-blue-500 dark:text-blue-400 text-right">{laneRule}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Girder arrangement: {((value.numberOfGirders - 1) * value.girderSpacing).toFixed(2)} m c/c total width
        </p>
      </div>
    </div>
  );
}

// ── Helper Row component ──────────────────────────────────────────────────────
function Row({
  label,
  value,
  indent = false,
  highlight = false,
}: {
  label: string;
  value: string;
  indent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between ${indent ? 'pl-3' : ''}`}>
      <span className={highlight ? 'font-bold text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
        {label}
      </span>
      <span className={highlight ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}>
        {value}
      </span>
    </div>
  );
}

// ── Cross-Section SVG schematic ───────────────────────────────────────────────
interface SVGProps {
  deckWidth: number;
  parapetWidth: number;
  leftWalkway: number;
  rightWalkway: number;
  carriageway: number;
  numberOfGirders: number;
  girderSpacing: number;
}

function CrossSectionSVG({
  deckWidth, parapetWidth, leftWalkway, rightWalkway,
  carriageway, numberOfGirders, girderSpacing,
}: SVGProps) {
  if (deckWidth <= 0) return null;

  const W = 320, H = 90;
  const padX = 12, padT = 14, deckH = 14, girderH = 18;
  const drawW = W - 2 * padX;
  const scale = drawW / deckWidth; // px per metre

  const deckY = padT;
  const girderY = deckY + deckH;

  // Convert widths to px
  const pxParapet = parapetWidth * scale;
  const pxLeftWalk = leftWalkway * scale;
  const pxRightWalk = rightWalkway * scale;
  const pxCarriage = carriageway * scale;

  // x positions (left to right)
  const xDeckL = padX;
  const xLeftWalkL = xDeckL + pxParapet;
  const xCarriageL = xLeftWalkL + pxLeftWalk;
  const xCarriageR = xCarriageL + pxCarriage;
  const xRightWalkR = xCarriageR + pxRightWalk;

  // Girder positions (centred within deck)
  const girderTotalWidth = (numberOfGirders - 1) * girderSpacing;
  const girderStartX = padX + deckWidth / 2 * scale - girderTotalWidth / 2 * scale;
  const girderXs = Array.from({ length: numberOfGirders }, (_, i) =>
    girderStartX + i * girderSpacing * scale
  );
  const girderW = Math.max(4, Math.min(16, girderSpacing * scale * 0.3));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', minWidth: 240 }}>
        {/* Full deck slab */}
        <rect x={xDeckL} y={deckY} width={drawW} height={deckH} fill="#94a3b8" rx="1" />

        {/* Parapets */}
        {pxParapet > 0 && <>
          <rect x={xDeckL}           y={deckY - 8} width={pxParapet} height={8 + deckH} fill="#475569" rx="1" />
          <rect x={xRightWalkR} y={deckY - 8} width={pxParapet} height={8 + deckH} fill="#475569" rx="1" />
        </>}

        {/* Walkways */}
        {pxLeftWalk > 0 && (
          <rect x={xLeftWalkL} y={deckY} width={pxLeftWalk} height={deckH} fill="#86efac" opacity={0.8} />
        )}
        {pxRightWalk > 0 && (
          <rect x={xCarriageR} y={deckY} width={pxRightWalk} height={deckH} fill="#86efac" opacity={0.8} />
        )}

        {/* Carriageway */}
        {pxCarriage > 0 && (
          <rect x={xCarriageL} y={deckY} width={pxCarriage} height={deckH} fill="#bfdbfe" opacity={0.9} />
        )}

        {/* Girders */}
        {girderXs.map((gx, i) => (
          <rect
            key={i}
            x={gx - girderW / 2}
            y={girderY}
            width={girderW}
            height={girderH}
            fill="#3b82f6"
            rx="1"
          />
        ))}

        {/* Labels */}
        {pxParapet > 1 && (
          <>
            <text x={xDeckL + pxParapet / 2} y={deckY + deckH / 2 + 4} textAnchor="middle" fontSize={7} fill="white" fontFamily="monospace">P</text>
            <text x={xRightWalkR + pxParapet / 2} y={deckY + deckH / 2 + 4} textAnchor="middle" fontSize={7} fill="white" fontFamily="monospace">P</text>
          </>
        )}
        {pxLeftWalk > 8 && (
          <text x={xLeftWalkL + pxLeftWalk / 2} y={deckY + deckH / 2 + 4} textAnchor="middle" fontSize={7} fill="#166534" fontFamily="monospace">W</text>
        )}
        {pxRightWalk > 8 && (
          <text x={xCarriageR + pxRightWalk / 2} y={deckY + deckH / 2 + 4} textAnchor="middle" fontSize={7} fill="#166534" fontFamily="monospace">W</text>
        )}
        {pxCarriage > 20 && (
          <text x={xCarriageL + pxCarriage / 2} y={deckY + deckH / 2 + 4} textAnchor="middle" fontSize={8} fill="#1e40af" fontFamily="monospace">
            CW={carriageway.toFixed(1)}m
          </text>
        )}

        {/* Girder labels */}
        {girderXs.length <= 8 && girderXs.map((gx, i) => (
          <text key={i} x={gx} y={girderY + girderH + 9} textAnchor="middle" fontSize={7} fill="#6b7280" fontFamily="monospace">
            G{i + 1}
          </text>
        ))}

        {/* Dimension line at bottom for deck width */}
        <line x1={padX} y1={girderY + girderH + 16} x2={padX + drawW} y2={girderY + girderH + 16} stroke="#94a3b8" strokeWidth={0.8} />
        <line x1={padX}          y1={girderY + girderH + 12} x2={padX}          y2={girderY + girderH + 20} stroke="#94a3b8" strokeWidth={0.8} />
        <line x1={padX + drawW}  y1={girderY + girderH + 12} x2={padX + drawW}  y2={girderY + girderH + 20} stroke="#94a3b8" strokeWidth={0.8} />
        <text x={padX + drawW / 2} y={girderY + girderH + 28} textAnchor="middle" fontSize={8} fill="#94a3b8" fontFamily="monospace">
          {deckWidth.toFixed(2)} m deck
        </text>

        {/* Legend */}
        <rect x={W - 80} y={2} width={8} height={6} fill="#475569" rx="1" />
        <text x={W - 69} y={9} fontSize={7} fill="#94a3b8" fontFamily="monospace">Parapet</text>
        <rect x={W - 80} y={11} width={8} height={6} fill="#86efac" opacity={0.8} rx="1" />
        <text x={W - 69} y={18} fontSize={7} fill="#94a3b8" fontFamily="monospace">Walkway</text>
        <rect x={W - 80} y={20} width={8} height={6} fill="#bfdbfe" opacity={0.9} rx="1" />
        <text x={W - 69} y={27} fontSize={7} fill="#94a3b8" fontFamily="monospace">Carriageway</text>
        <rect x={W - 80} y={29} width={8} height={6} fill="#3b82f6" rx="1" />
        <text x={W - 69} y={36} fontSize={7} fill="#94a3b8" fontFamily="monospace">Girder</text>
      </svg>
    </div>
  );
}
