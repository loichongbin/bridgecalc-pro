import React from 'react';
import { Moon, Sun, Printer, BookOpen } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onPrint: () => void;
  hasResults: boolean;
}

export function Header({ darkMode, onToggleDark, onPrint, hasResults }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 dark:bg-gray-950 border-b border-slate-700 dark:border-gray-800 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
            <span className="text-white font-bold text-sm">BE</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-white font-bold text-base leading-none tracking-tight whitespace-nowrap">
                BridgeCalc Pro
              </h1>
              <span className="text-slate-400 text-xs leading-none hidden sm:inline">
                Simply Supported Girder Analyser
              </span>
            </div>
            <p className="text-slate-500 text-[10px] mt-0.5 hidden md:block">
              BS 5400 / BD 37/01 · HA · HB30 · HB45
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono">
          {['Elastic Analysis', 'Simply Supported', 'Characteristic Loads'].map(b => (
            <span
              key={b}
              className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600"
            >
              {b}
            </span>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasResults && (
            <button
              onClick={onPrint}
              className="btn-secondary text-xs gap-1.5 py-1.5 no-print"
              title="Print / export report"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print Report</span>
            </button>
          )}

          <a
            href={`${import.meta.env.BASE_URL}bd3701.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs gap-1.5 py-1.5 no-print"
            title="Open BD 37/01 PDF"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">BD 37/01</span>
          </a>

          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
