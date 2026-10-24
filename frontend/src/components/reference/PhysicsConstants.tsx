import React, { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { MathFormula } from '../MathFormula';
import { METRIC_MULTIPLIERS } from '../../constants/referenceData';

export interface PhysicsConstantDef {
  id: string;
  name: string;
  latex: string;
  copyValue: string;
  unit: string;
  notes: string;
}

export const CAMBRIDGE_PHYSICS_CONSTANTS_DATA: PhysicsConstantDef[] = [
  {
    id: 'const-hubble',
    name: 'Hubble constant',
    latex: String.raw`H_0 \approx 2.2 \times 10^{-18}\text{ s}^{-1}`,
    copyValue: '2.2e-18',
    unit: 's⁻¹',
    notes: 'Recession velocity proportionality (v = H₀d)',
  },
  {
    id: 'const-c',
    name: 'Speed of light in a vacuum',
    latex: String.raw`c = 3.0 \times 10^8\text{ m/s}`,
    copyValue: '3.0e8',
    unit: 'm/s',
    notes: 'Electromagnetic wave speed in vacuum',
  },
  {
    id: 'const-g',
    name: 'Acceleration of free fall (gravity)',
    latex: String.raw`g = 9.8\text{ m/s}^2\text{ (or N/kg)}`,
    copyValue: '9.8',
    unit: 'm/s² (or N/kg)',
    notes: "Earth's surface (9.8 used in 2023+ syllabus)",
  },
  {
    id: 'const-sound',
    name: 'Speed of sound in air',
    latex: String.raw`v = 330\text{--}350\text{ m/s}`,
    copyValue: '340',
    unit: 'm/s',
    notes: 'At standard atmospheric temperature',
  },
];

interface PhysicsConstantsProps {
  searchQuery?: string;
}

export const PhysicsConstants: React.FC<PhysicsConstantsProps> = ({ searchQuery = '' }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredConstants = useMemo(() => {
    if (!query) return CAMBRIDGE_PHYSICS_CONSTANTS_DATA;
    return CAMBRIDGE_PHYSICS_CONSTANTS_DATA.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.notes.toLowerCase().includes(query) ||
        c.copyValue.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredMultipliers = useMemo(() => {
    if (!query) return METRIC_MULTIPLIERS;
    return METRIC_MULTIPLIERS.filter(
      (m) =>
        m.prefix.toLowerCase().includes(query) ||
        m.symbol.toLowerCase().includes(query) ||
        m.factor.toLowerCase().includes(query) ||
        m.power.toString().includes(query)
    );
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Physical Constants Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Cambridge Physical Constants
          </h3>
          <span className="text-[11px] text-slate-400">
            {filteredConstants.length} {filteredConstants.length === 1 ? 'constant' : 'constants'}
          </span>
        </div>

        <div className="grid gap-2">
          {filteredConstants.map((c) => {
            const isCopied = copiedId === c.id;
            return (
              <div
                key={c.id}
                className="group p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {c.name}
                  </div>
                  {c.notes && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      {c.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-right">
                    <MathFormula
                      latex={c.latex}
                      className="text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(c.id, c.copyValue)}
                    title={`Copy value: ${c.copyValue}`}
                    aria-label={`Copy value: ${c.copyValue}`}
                    className={`p-1.5 rounded-lg border transition-all text-xs flex items-center justify-center ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredConstants.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 italic">
              No physical constants matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Metric Multipliers Table */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/[0.07]">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            SI Metric Multipliers &amp; Prefixes
          </h3>
          <span className="text-[11px] text-slate-400">
            {filteredMultipliers.length} prefixes
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-white/[0.07]">
              <tr>
                <th className="py-2 px-3">Prefix</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Factor</th>
                <th className="py-2 px-3 text-right">Power of 10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredMultipliers.map((m) => (
                <tr
                  key={m.prefix}
                  className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2 px-3 font-medium capitalize text-slate-800 dark:text-slate-200">
                    {m.prefix}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {m.symbol}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {m.factor}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                    <MathFormula latex={`10^{${m.power}}`} className="text-xs text-indigo-600 dark:text-indigo-400" />
                  </td>
                </tr>
              ))}
              {filteredMultipliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-xs text-slate-400 italic">
                    No prefixes matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PhysicsConstants;
