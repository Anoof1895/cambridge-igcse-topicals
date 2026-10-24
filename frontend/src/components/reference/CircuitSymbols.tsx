import React, { useMemo } from 'react';
import { CIRCUIT_SYMBOLS, CircuitSymbolItem } from '../../constants/referenceData';

interface CircuitSymbolsProps {
  searchQuery?: string;
}

const renderCircuitSvg = (id: string) => {
  switch (id) {
    case 'sym-cell':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="20" y2="24" strokeWidth="2" />
          <line x1="20" y1="10" x2="20" y2="38" strokeWidth="1.8" />
          <line x1="28" y1="16" x2="28" y2="32" strokeWidth="3.8" />
          <line x1="28" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-battery':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="13" y2="24" strokeWidth="2" />
          {/* Cell 1 */}
          <line x1="13" y1="11" x2="13" y2="37" strokeWidth="1.8" />
          <line x1="19" y1="16" x2="19" y2="32" strokeWidth="3.5" />
          {/* Dashed connector */}
          <line x1="19" y1="24" x2="29" y2="24" strokeWidth="2" strokeDasharray="2.5 2.5" />
          {/* Cell 2 */}
          <line x1="29" y1="11" x2="29" y2="37" strokeWidth="1.8" />
          <line x1="35" y1="16" x2="35" y2="32" strokeWidth="3.5" />
          <line x1="35" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-power-supply':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="13.2" y2="24" strokeWidth="2" />
          <circle cx="16" cy="24" r="2.8" strokeWidth="2" />
          <circle cx="32" cy="24" r="2.8" strokeWidth="2" />
          <line x1="34.8" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-dc-source':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="27" x2="13.2" y2="27" strokeWidth="2" />
          <circle cx="16" cy="27" r="2.8" strokeWidth="2" />
          {/* + sign above left terminal */}
          <line x1="13" y1="15" x2="19" y2="15" strokeWidth="1.8" />
          <line x1="16" y1="12" x2="16" y2="18" strokeWidth="1.8" />
          <circle cx="32" cy="27" r="2.8" strokeWidth="2" />
          {/* - sign above right terminal */}
          <line x1="29" y1="15" x2="35" y2="15" strokeWidth="1.8" />
          <line x1="34.8" y1="27" x2="44" y2="27" strokeWidth="2" />
        </svg>
      );

    case 'sym-ac-source':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="24" x2="9.4" y2="24" strokeWidth="2" />
          <circle cx="12" cy="24" r="2.6" strokeWidth="2" />
          {/* Sine wave ~ between open terminal circles (no enclosing outer circle) */}
          <path d="M 18 24 C 20 18, 22 18, 24 24 C 26 30, 28 30, 30 24" strokeWidth="2" />
          <circle cx="36" cy="24" r="2.6" strokeWidth="2" />
          <line x1="38.6" y1="24" x2="46" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-resistor':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12" y2="24" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" />
          <line x1="36" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-var-resistor':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12" y2="24" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" />
          <line x1="36" y1="24" x2="44" y2="24" strokeWidth="2" />
          <line x1="10" y1="36" x2="38" y2="12" strokeWidth="2" />
          <path d="M 32.5 11.5 L 38 12 L 37.5 17.5" strokeWidth="2" />
        </svg>
      );

    case 'sym-thermistor':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12" y2="24" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" />
          <line x1="36" y1="24" x2="44" y2="24" strokeWidth="2" />
          <path d="M 8 36 L 14 36 L 38 12" strokeWidth="2" />
        </svg>
      );

    case 'sym-ldr':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="27" x2="12" y2="27" strokeWidth="2" />
          <rect x="12" y="20" width="24" height="14" strokeWidth="2" />
          <line x1="36" y1="27" x2="44" y2="27" strokeWidth="2" />
          {/* Two diagonal arrows pointing inward toward top-left of resistor rectangle (no outer circle) */}
          <line x1="9" y1="7" x2="17" y2="15" strokeWidth="1.8" />
          <path d="M 13 15 L 17 15 L 17 11" strokeWidth="1.8" />
          <line x1="17" y1="5" x2="25" y2="13" strokeWidth="1.8" />
          <path d="M 21 13 L 25 13 L 25 9" strokeWidth="1.8" />
        </svg>
      );

    case 'sym-heater':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12" y2="24" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" />
          {/* 3 internal vertical lines dividing rectangle into 4 equal sections */}
          <line x1="18" y1="17" x2="18" y2="31" strokeWidth="2" />
          <line x1="24" y1="17" x2="24" y2="31" strokeWidth="2" />
          <line x1="30" y1="17" x2="30" y2="31" strokeWidth="2" />
          <line x1="36" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-potential-divider':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="28" x2="12" y2="28" strokeWidth="2" />
          <rect x="12" y="21" width="24" height="14" strokeWidth="2" />
          <line x1="36" y1="28" x2="44" y2="28" strokeWidth="2" />
          {/* Upper lead from left turning down with arrow onto top edge of resistor */}
          <path d="M 4 10 L 24 10 L 24 20.5" strokeWidth="2" />
          <path d="M 21 16 L 24 20.5 L 27 16" strokeWidth="2" />
        </svg>
      );

    case 'sym-transformer':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Primary vertical 3-loop coil */}
          <line x1="4" y1="12" x2="15" y2="12" strokeWidth="2" />
          <path d="M 15 12 A 4 4 0 0 1 15 20 A 4 4 0 0 1 15 28 A 4 4 0 0 1 15 36" strokeWidth="2" />
          <line x1="15" y1="36" x2="4" y2="36" strokeWidth="2" />
          {/* Single vertical iron core line */}
          <line x1="24" y1="10" x2="24" y2="38" strokeWidth="2" />
          {/* Secondary vertical 3-loop coil */}
          <line x1="44" y1="12" x2="33" y2="12" strokeWidth="2" />
          <path d="M 33 12 A 4 4 0 0 0 33 20 A 4 4 0 0 0 33 28 A 4 4 0 0 0 33 36" strokeWidth="2" />
          <line x1="33" y1="36" x2="44" y2="36" strokeWidth="2" />
        </svg>
      );

    case 'sym-magnetising-coil':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="28" x2="8" y2="28" strokeWidth="2" />
          <path d="M 8 28 A 4 4 0 0 1 16 28 A 4 4 0 0 1 24 28 A 4 4 0 0 1 32 28 A 4 4 0 0 1 40 28" strokeWidth="2" />
          <line x1="40" y1="28" x2="46" y2="28" strokeWidth="2" />
        </svg>
      );

    case 'sym-switch-open':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12.5" y2="24" strokeWidth="2" />
          <circle cx="15" cy="24" r="2.5" strokeWidth="2" />
          <line x1="17" y1="22.5" x2="31" y2="12" strokeWidth="2" />
          <circle cx="33" cy="24" r="2.5" strokeWidth="2" />
          <line x1="35.5" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-switch-closed':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="12.5" y2="24" strokeWidth="2" />
          <circle cx="15" cy="24" r="2.5" strokeWidth="2" />
          <line x1="17.5" y1="24" x2="30.5" y2="24" strokeWidth="2" />
          <circle cx="33" cy="24" r="2.5" strokeWidth="2" />
          <line x1="35.5" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-earth':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="24" y1="8" x2="24" y2="24" strokeWidth="2" />
          <line x1="10" y1="24" x2="38" y2="24" strokeWidth="2" />
          <line x1="15" y1="30" x2="33" y2="30" strokeWidth="2" />
          <line x1="20" y1="36" x2="28" y2="36" strokeWidth="2" />
        </svg>
      );

    case 'sym-junction':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="28" x2="44" y2="28" strokeWidth="2" />
          <line x1="24" y1="8" x2="24" y2="28" strokeWidth="2" />
          <circle cx="24" cy="28" r="3.2" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'sym-lamp':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="10" y2="24" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" strokeWidth="2" />
          <line x1="14.1" y1="14.1" x2="33.9" y2="33.9" strokeWidth="2" />
          <line x1="14.1" y1="33.9" x2="33.9" y2="14.1" strokeWidth="2" />
          <line x1="38" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-motor':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="10" y2="24" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" strokeWidth="2" />
          <text x="24" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fontFamily="sans-serif" fill="currentColor" stroke="none">
            M
          </text>
          <line x1="18" y1="31" x2="30" y2="31" strokeWidth="1.8" />
          <line x1="38" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-generator':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="11" y2="24" strokeWidth="2" />
          <rect x="11" y="11" width="26" height="26" strokeWidth="2" />
          <text x="24" y="29.5" textAnchor="middle" fontSize="15" fontWeight="bold" fontFamily="sans-serif" fill="currentColor" stroke="none">
            G
          </text>
          <line x1="37" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-ammeter':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="10" y2="24" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" strokeWidth="2" />
          <text x="24" y="29.5" textAnchor="middle" fontSize="15" fontWeight="bold" fontFamily="sans-serif" fill="currentColor" stroke="none">
            A
          </text>
          <line x1="38" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-voltmeter':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="10" y2="24" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" strokeWidth="2" />
          <text x="24" y="29.5" textAnchor="middle" fontSize="15" fontWeight="bold" fontFamily="sans-serif" fill="currentColor" stroke="none">
            V
          </text>
          <line x1="38" y1="24" x2="44" y2="24" strokeWidth="2" />
        </svg>
      );

    case 'sym-diode':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Horizontal wire running all the way through the center of the triangle */}
          <line x1="4" y1="24" x2="44" y2="24" strokeWidth="2" />
          <polygon points="15,13 32,24 15,35" strokeWidth="2" fill="none" />
          <line x1="32" y1="13" x2="32" y2="35" strokeWidth="2" />
        </svg>
      );

    case 'sym-led':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Horizontal wire running all the way through the center of the triangle */}
          <line x1="4" y1="26" x2="44" y2="26" strokeWidth="2" />
          <polygon points="15,15 31,26 15,37" strokeWidth="2" fill="none" />
          <line x1="31" y1="15" x2="31" y2="37" strokeWidth="2" />
          {/* Two outward diagonal arrows at top-right */}
          <line x1="26" y1="13" x2="33" y2="6" strokeWidth="1.8" />
          <path d="M 29.5 6 L 33 6 L 33 9.5" strokeWidth="1.8" />
          <line x1="32" y1="16" x2="39" y2="9" strokeWidth="1.8" />
          <path d="M 35.5 9 L 39 9 L 39 12.5" strokeWidth="1.8" />
        </svg>
      );

    case 'sym-fuse':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="24" x2="44" y2="24" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" fill="none" />
        </svg>
      );

    case 'sym-relay':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Vertical leads from top-center and bottom-center of empty horizontal rectangle */}
          <line x1="24" y1="5" x2="24" y2="17" strokeWidth="2" />
          <rect x="12" y="17" width="24" height="14" strokeWidth="2" fill="none" />
          <line x1="24" y1="31" x2="24" y2="43" strokeWidth="2" />
        </svg>
      );

    case 'sym-bell':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Semicircular dome cap on top with flat base */}
          <path d="M 11 24 A 13 13 0 0 1 37 24 Z" strokeWidth="2" fill="none" />
          {/* Two vertical parallel legs extending downward from the flat base */}
          <line x1="19" y1="24" x2="19" y2="42" strokeWidth="2" />
          <line x1="29" y1="24" x2="29" y2="42" strokeWidth="2" />
        </svg>
      );

    default:
      return null;
  }
};

const getCategoryPillClass = (type: CircuitSymbolItem['symbolType']) => {
  switch (type) {
    case 'power':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'switch':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'resistor':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    case 'semiconductor':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
    case 'output':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    case 'meter':
      return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
    default:
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
  }
};

export const CircuitSymbols: React.FC<CircuitSymbolsProps> = ({ searchQuery = '' }) => {
  const query = searchQuery.trim().toLowerCase();

  const filteredSymbols = useMemo(() => {
    if (!query) return CIRCUIT_SYMBOLS;
    return CIRCUIT_SYMBOLS.filter(
      (sym) =>
        sym.name.toLowerCase().includes(query) ||
        sym.description.toLowerCase().includes(query) ||
        sym.symbolType.toLowerCase().includes(query)
    );
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Official electrical circuit symbols specified in Cambridge IGCSE Physics (0625).
        </p>
        <span className="text-[11px] text-slate-400 shrink-0">
          {filteredSymbols.length} / {CIRCUIT_SYMBOLS.length}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {filteredSymbols.map((sym) => (
          <div
            key={sym.id}
            className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-indigo-500/30 transition-all flex items-center gap-3 shadow-xs"
          >
            {/* 48x48 preview box on the left */}
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0 p-1">
              {renderCircuitSvg(sym.id)}
            </div>

            {/* Information on the right */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {sym.name}
                </span>
                <span
                  className={`text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${getCategoryPillClass(
                    sym.symbolType
                  )}`}
                >
                  {sym.symbolType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                {sym.description}
              </p>
            </div>
          </div>
        ))}

        {filteredSymbols.length === 0 && (
          <div className="sm:col-span-2 p-6 text-center text-xs text-slate-400 italic">
            No circuit symbols matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitSymbols;
