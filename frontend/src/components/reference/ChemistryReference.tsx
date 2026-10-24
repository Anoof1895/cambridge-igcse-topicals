import React, { useState, useMemo } from 'react';
import { MathFormula } from '../MathFormula';
import { QUALITATIVE_ANALYSIS_NOTES, QualitativeTestItem } from '../../constants/referenceData';

interface ChemistryReferenceProps {
  searchQuery?: string;
}

export type QualitativeCategory = 'all' | 'anion' | 'cation' | 'gas' | 'flame';

// Map raw formula string into formatted LaTeX math with \text{}
const formatIonLatex = (formula?: string): string => {
  if (!formula) return '';
  if (formula.startsWith('\\text')) return formula;

  // Handle standard Cambridge formulas
  const map: Record<string, string> = {
    'CO_3^{2-}': String.raw`\text{CO}_3^{2-}`,
    'Cl^-': String.raw`\text{Cl}^-`,
    'Br^-': String.raw`\text{Br}^-`,
    'I^-': String.raw`\text{I}^-`,
    'NO_3^-': String.raw`\text{NO}_3^-`,
    'SO_4^{2-}': String.raw`\text{SO}_4^{2-}`,
    'SO_3^{2-}': String.raw`\text{SO}_3^{2-}`,
    'Al^{3+}': String.raw`\text{Al}^{3+}`,
    'NH_4^+': String.raw`\text{NH}_4^+`,
    'Ca^{2+}': String.raw`\text{Ca}^{2+}`,
    'Cr^{3+}': String.raw`\text{Cr}^{3+}`,
    'Cu^{2+}': String.raw`\text{Cu}^{2+}`,
    'Fe^{2+}': String.raw`\text{Fe}^{2+}`,
    'Fe^{3+}': String.raw`\text{Fe}^{3+}`,
    'Zn^{2+}': String.raw`\text{Zn}^{2+}`,
    'NH_3': String.raw`\text{NH}_3`,
    'CO_2': String.raw`\text{CO}_2`,
    'Cl_2': String.raw`\text{Cl}_2`,
    'H_2': String.raw`\text{H}_2`,
    'O_2': String.raw`\text{O}_2`,
    'SO_2': String.raw`\text{SO}_2`,
    'Li^+': String.raw`\text{Li}^+`,
    'Na^+': String.raw`\text{Na}^+`,
    'K^+': String.raw`\text{K}^+`,
    'Ba^{2+}': String.raw`\text{Ba}^{2+}`,
  };

  return map[formula] || String.raw`\text{${formula}}`;
};

// Render flame test color badge
const renderFlameBadge = (ionOrGas: string) => {
  switch (ionOrGas) {
    case 'Lithium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/60" />
          Red Flame
        </span>
      );
    case 'Sodium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-500/60" />
          Yellow Flame
        </span>
      );
    case 'Potassium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-400/20 text-purple-300 border border-purple-400/40">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-500/60" />
          Lilac Flame
        </span>
      );
    case 'Calcium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/60" />
          Orange-Red Flame
        </span>
      );
    case 'Barium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/60" />
          Light Green Flame
        </span>
      );
    case 'Copper(II)':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-500/60" />
          Blue-Green Flame
        </span>
      );
    default:
      return null;
  }
};

// Render result visual chips (precipitates, gases, color shifts)
const renderResultVisualChips = (item: QualitativeTestItem) => {
  const res = item.result.toLowerCase();

  if (item.type === 'flame') {
    return renderFlameBadge(item.ionOrGas);
  }

  const chips: React.ReactNode[] = [];

  if (res.includes('white precipitate') || res.includes('white ppt')) {
    chips.push(
      <span key="white-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-white/10 text-slate-200 border border-white/20">
        <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:border-white/50" />
        White ppt
      </span>
    );
  }

  if (res.includes('cream precipitate')) {
    chips.push(
      <span key="cream-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-500/10 text-amber-200 border border-amber-300/30">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFF3D1] border border-amber-300" />
        Cream ppt
      </span>
    );
  }

  if (res.includes('yellow precipitate')) {
    chips.push(
      <span key="yellow-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/40">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        Yellow ppt
      </span>
    );
  }

  if (res.includes('light blue ppt')) {
    chips.push(
      <span key="light-blue-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
        Light blue ppt
      </span>
    );
  }

  if (res.includes('dark blue')) {
    chips.push(
      <span key="dark-blue" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        Dark blue soln
      </span>
    );
  }

  if (res.includes('green ppt') || res.includes('grey-green ppt')) {
    chips.push(
      <span key="green-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        Green ppt
      </span>
    );
  }

  if (res.includes('red-brown ppt') || res.includes('reddish-brown')) {
    chips.push(
      <span key="red-brown-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-900/30 text-amber-200 border border-amber-700/40">
        <span className="w-2.5 h-2.5 rounded-full bg-[#8D3B1B]" />
        Red-brown ppt
      </span>
    );
  }

  if (res.includes('purple to colorless')) {
    chips.push(
      <span key="purple-colorless" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-500/15 text-purple-200 border border-purple-400/30">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        ➔
        <span className="w-2 h-2 rounded-full bg-slate-200/50 border border-slate-300" />
        Decolorizes
      </span>
    );
  }

  if (res.includes('cloudy white') || res.includes('milky')) {
    chips.push(
      <span key="milky-white" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-white/10 text-slate-200 border border-white/20">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300" />
        Milky / Cloudy
      </span>
    );
  }

  if (chips.length === 0) return null;

  return <div className="flex flex-wrap items-center gap-1.5 pt-0.5">{chips}</div>;
};

export const ChemistryReference: React.FC<ChemistryReferenceProps> = ({ searchQuery = '' }) => {
  const [qualitativeFilter, setQualitativeFilter] = useState<QualitativeCategory>('all');

  const query = searchQuery.trim().toLowerCase();

  const filteredTests = useMemo(() => {
    return QUALITATIVE_ANALYSIS_NOTES.filter((item) => {
      const matchesCategory =
        qualitativeFilter === 'all' || item.type === qualitativeFilter;
      if (!matchesCategory) return false;

      if (!query) return true;
      return (
        item.ionOrGas.toLowerCase().includes(query) ||
        (item.formulaLatex && item.formulaLatex.toLowerCase().includes(query)) ||
        item.test.toLowerCase().includes(query) ||
        item.result.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    });
  }, [qualitativeFilter, query]);

  const categories: { key: QualitativeCategory; label: string }[] = [
    { key: 'all', label: 'All Tests' },
    { key: 'anion', label: 'Anions' },
    { key: 'cation', label: 'Cations' },
    { key: 'gas', label: 'Gases' }, // Note: correctly labeled "Gases", fixing "gass" typo
    { key: 'flame', label: 'Flame Tests' },
  ];

  return (
    <div className="space-y-3">
      {/* Qualitative Filter Tabs */}
      <div className="flex items-center bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-xs gap-0.5 border border-slate-300/40 dark:border-white/[0.06] overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setQualitativeFilter(cat.key)}
            className={`flex-1 py-1 px-2.5 rounded-md font-semibold text-center transition-all truncate text-[11px] ${
              qualitativeFilter === cat.key
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tests Count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredTests.length} qualitative analysis tests
        </span>
      </div>

      {/* Test Cards */}
      <div className="space-y-2.5">
        {filteredTests.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-cyan-500/30 transition-all space-y-2 shadow-xs"
          >
            {/* Header: Name, KaTeX Ion Formula, and Category */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.ionOrGas}
                </span>
                {item.formulaLatex && (
                  <div className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                    <MathFormula
                      latex={formatIonLatex(item.formulaLatex)}
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400"
                    />
                  </div>
                )}
              </div>
              <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
                {item.type}
              </span>
            </div>

            {/* Test Instructions */}
            <div className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug">
              <strong className="text-slate-800 dark:text-slate-200">Test:</strong> {item.test}
            </div>

            {/* Result Box with Visual Color Chips */}
            <div className="text-[11.5px] space-y-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-start justify-between gap-2">
                <div className="text-slate-800 dark:text-slate-200">
                  <strong className="text-emerald-700 dark:text-emerald-400">Result:</strong>{' '}
                  <span className="text-slate-700 dark:text-slate-300">{item.result}</span>
                </div>
              </div>

              {renderResultVisualChips(item)}
            </div>
          </div>
        ))}

        {filteredTests.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            No qualitative tests matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

export default ChemistryReference;
