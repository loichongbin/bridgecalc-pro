import React from 'react';
import { CalculationResults, BridgeGeometry, HighwayLoadInputs } from '../types/bridge';

interface Props {
  results: CalculationResults;
  geometry: BridgeGeometry;
  highwayLoads: HighwayLoadInputs;
  darkMode: boolean;
}

export function LoadingDiagram({ results, geometry, highwayLoads, darkMode }: Props) {
  const L = geometry.spanLength;

  // SVG canvas dimensions
  const W = 640, H = 220;
  const padL = 55, padR = 30, padT = 55, padB = 45;
  const beamY = padT + (H - padT - padB) * 0.55;
  const beamLen = W - padL - padR;
  const scale = beamLen / L; // px per metre

  const xPx = (m: number) => padL + m * scale;
  const isDark = darkMode;
  const textFill = isDark ? '#94a3b8' : '#4b5563';
  const beamFill = isDark ? '#60a5fa' : '#2563eb';
  const beamStroke = isDark ? '#3b82f6' : '#1d4ed8';

  // Dead load UDL arrow parameters
  const dlW = results.deadLoadResult.ra * 2 / L; // kN/m (approximate)
  const arrowCount = Math.min(Math.max(Math.floor(L * 1.5), 6), 24);
  const arrowStep = beamLen / arrowCount;
  const arrowH = 26;
  const arrowColor = isDark ? '#94a3b8' : '#6b7280';

  // HA UDL color
  const haColor = isDark ? '#60a5fa' : '#2563eb';
  // HB color
  const hbColor = isDark ? '#f59e0b' : '#d97706';

  // HA KEL position (mid span)
  const kelX = xPx(L / 2);

  // HB info (simplified schematic — just show vehicle if HB is in governing case)
  const showHB = results.governingCase.includes('HB');
  const hbUnits = results.governingCase.includes('HB45') ? 45 : 30;
  const hbAxleLoad = hbUnits * 10;
  const innerSpacing = highwayLoads.hbAxleSpacing;
  const vehicleLen = 3.6 + innerSpacing;
  // Place vehicle centred for schematic
  const hbFront = (L - vehicleLen) / 2;
  const hbAxles = [0, 1.8, 1.8 + innerSpacing, 3.6 + innerSpacing].map(r => hbFront + r);

  const showHA = results.governingCase.includes('HA') || results.haResult !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Loading Arrangement Diagram</h3>
        <span className="badge-amber text-xs">{results.governingCase}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ minWidth: 340, maxWidth: '100%', display: 'block' }}
          aria-label="Bridge loading diagram"
        >
          {/* Background */}
          <rect width={W} height={H} fill={isDark ? '#1f2937' : '#f9fafb'} rx="12" />

          {/* ── Dead Load UDL arrows ── */}
          {Array.from({ length: arrowCount + 1 }, (_, i) => {
            const ax = padL + i * arrowStep;
            return (
              <g key={`dl-${i}`}>
                <line x1={ax} y1={padT - 4} x2={ax} y2={beamY - 2} stroke={arrowColor} strokeWidth={1.2} />
                <polygon
                  points={`${ax - 4},${beamY - 2} ${ax + 4},${beamY - 2} ${ax},${beamY + 5}`}
                  fill={arrowColor}
                />
              </g>
            );
          })}
          {/* DL UDL top line */}
          <line x1={padL} y1={padT - 4} x2={padL + beamLen} y2={padT - 4} stroke={arrowColor} strokeWidth={1.5} />
          <text x={padL + beamLen / 2} y={padT - 10} textAnchor="middle" fontSize={10} fill={arrowColor} fontFamily="monospace">
            DL = {dlW.toFixed(1)} kN/m
          </text>

          {/* ── HA UDL (if active) ── */}
          {showHA && !showHB && (
            <>
              {Array.from({ length: arrowCount + 1 }, (_, i) => {
                const ax = padL + i * arrowStep;
                return (
                  <g key={`ha-${i}`}>
                    <line x1={ax} y1={padT - 22} x2={ax} y2={padT - 5} stroke={haColor} strokeWidth={1.2} />
                    <polygon points={`${ax - 3},${padT - 5} ${ax + 3},${padT - 5} ${ax},${padT + 2}`} fill={haColor} />
                  </g>
                );
              })}
              <line x1={padL} y1={padT - 22} x2={padL + beamLen} y2={padT - 22} stroke={haColor} strokeWidth={1.5} />
              <text x={padL + beamLen / 2} y={padT - 26} textAnchor="middle" fontSize={10} fill={haColor} fontFamily="monospace">
                HA UDL = {results.haUDLPerLane.toFixed(1)} kN/m × {results.numberOfLanes} lane{results.numberOfLanes !== 1 ? 's' : ''}
              </text>
              {/* HA KEL */}
              <line x1={kelX} y1={padT - 38} x2={kelX} y2={padT - 22} stroke={haColor} strokeWidth={2.5} />
              <polygon points={`${kelX - 5},${padT - 22} ${kelX + 5},${padT - 22} ${kelX},${padT - 14}`} fill={haColor} />
              <text x={kelX} y={padT - 42} textAnchor="middle" fontSize={10} fill={haColor} fontFamily="monospace" fontWeight="bold">
                KEL {(120 * results.numberOfLanes).toFixed(0)} kN @ L/2
              </text>
            </>
          )}

          {/* ── HB Vehicle (if governing) ── */}
          {showHB && (
            <>
              {/* Chassis line */}
              <line
                x1={xPx(hbAxles[0])} y1={beamY - 32}
                x2={xPx(hbAxles[3])} y2={beamY - 32}
                stroke={hbColor} strokeWidth={3} strokeLinecap="round"
              />
              {/* Axle loads */}
              {hbAxles.map((a, i) => (
                <g key={`axle-${i}`}>
                  <line x1={xPx(a)} y1={beamY - 38} x2={xPx(a)} y2={beamY} stroke={hbColor} strokeWidth={2} />
                  <polygon points={`${xPx(a) - 5},${beamY} ${xPx(a) + 5},${beamY} ${xPx(a)},${beamY + 8}`} fill={hbColor} />
                  <circle cx={xPx(a)} cy={beamY - 38} r={4} fill={hbColor} />
                  <text x={xPx(a)} y={beamY - 46} textAnchor="middle" fontSize={9} fill={hbColor} fontFamily="monospace">
                    {hbAxleLoad}kN
                  </text>
                </g>
              ))}
              {/* Label */}
              <text
                x={xPx((hbAxles[0] + hbAxles[3]) / 2)}
                y={beamY - 56}
                textAnchor="middle"
                fontSize={11}
                fill={hbColor}
                fontFamily="monospace"
                fontWeight="bold"
              >
                HB{hbUnits} Vehicle
              </text>
            </>
          )}

          {/* ── Beam ── */}
          <rect x={padL} y={beamY} width={beamLen} height={8} rx={2} fill={beamFill} />

          {/* Span dimension */}
          <line x1={padL} y1={beamY + 28} x2={padL + beamLen} y2={beamY + 28} stroke={textFill} strokeWidth={1} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={padL + beamLen / 2} y={beamY + 40} textAnchor="middle" fontSize={11} fill={textFill} fontFamily="monospace" fontWeight="bold">
            L = {L.toFixed(1)} m
          </text>

          {/* ── Support A (pinned) ── */}
          <polygon
            points={`${padL},${beamY + 8} ${padL - 12},${beamY + 30} ${padL + 12},${beamY + 30}`}
            fill={beamStroke}
          />
          <line x1={padL - 14} y1={beamY + 30} x2={padL + 14} y2={beamY + 30} stroke={beamStroke} strokeWidth={2} />
          {/* Hatch marks under support A */}
          {[-10, -4, 2, 8].map(dx => (
            <line key={dx} x1={padL + dx} y1={beamY + 30} x2={padL + dx - 5} y2={beamY + 36} stroke={beamStroke} strokeWidth={1} />
          ))}
          <text x={padL} y={H - 6} textAnchor="middle" fontSize={10} fill={textFill} fontFamily="monospace" fontWeight="bold">A</text>

          {/* ── Support B (roller) ── */}
          <polygon
            points={`${padL + beamLen},${beamY + 8} ${padL + beamLen - 12},${beamY + 30} ${padL + beamLen + 12},${beamY + 30}`}
            fill={beamStroke}
          />
          <circle cx={padL + beamLen - 8} cy={beamY + 33} r={3} fill={isDark ? '#60a5fa' : '#93c5fd'} stroke={beamStroke} strokeWidth={1} />
          <circle cx={padL + beamLen}     cy={beamY + 33} r={3} fill={isDark ? '#60a5fa' : '#93c5fd'} stroke={beamStroke} strokeWidth={1} />
          <circle cx={padL + beamLen + 8} cy={beamY + 33} r={3} fill={isDark ? '#60a5fa' : '#93c5fd'} stroke={beamStroke} strokeWidth={1} />
          <line x1={padL + beamLen - 14} y1={beamY + 36} x2={padL + beamLen + 14} y2={beamY + 36} stroke={beamStroke} strokeWidth={2} />
          <text x={padL + beamLen} y={H - 6} textAnchor="middle" fontSize={10} fill={textFill} fontFamily="monospace" fontWeight="bold">B</text>

          {/* Reaction labels */}
          <text x={padL - 4} y={beamY + 16} textAnchor="end" fontSize={9} fill={isDark ? '#34d399' : '#059669'} fontFamily="monospace">
            RA={results.governingCombined.ra.toFixed(0)} kN
          </text>
          <text x={padL + beamLen + 4} y={beamY + 16} textAnchor="start" fontSize={9} fill={isDark ? '#34d399' : '#059669'} fontFamily="monospace">
            RB={results.governingCombined.rb.toFixed(0)} kN
          </text>

          {/* Arrowhead defs */}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={textFill} />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gray-400 inline-block" /> Dead loads (DL)
        </span>
        {showHA && !showHB && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" /> HA loading
          </span>
        )}
        {showHB && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" /> HB vehicle (schematic position, worst-case used for analysis)
          </span>
        )}
      </div>
    </div>
  );
}
