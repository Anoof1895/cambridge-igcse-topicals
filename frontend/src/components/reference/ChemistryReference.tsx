import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MathFormula } from '../MathFormula';
import { QUALITATIVE_ANALYSIS_NOTES, QualitativeTestItem } from '../../constants/referenceData';

interface ChemistryReferenceProps {
  searchQuery?: string;
}

export type QualitativeCategory = 'all' | 'anion' | 'cation' | 'gas' | 'flame';

const formatIonLatex = (formula?: string): string => {
  if (!formula) return '';
  if (formula.startsWith('\\text')) return formula;

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

const renderFlameBadge = (ionOrGas: string) => {
  switch (ionOrGas) {
    case 'Lithium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Red Flame
        </span>
      );
    case 'Sodium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          Yellow Flame
        </span>
      );
    case 'Potassium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-400/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/40">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          Lilac Flame
        </span>
      );
    case 'Calcium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          Orange-Red Flame
        </span>
      );
    case 'Barium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/40">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Light Green Flame
        </span>
      );
    case 'Copper(II)':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/40">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          Blue-Green Flame
        </span>
      );
    default:
      return null;
  }
};

const renderResultVisualChips = (item: QualitativeTestItem) => {
  const res = item.result.toLowerCase();

  if (item.type === 'flame') {
    return renderFlameBadge(item.ionOrGas);
  }

  const chips: React.ReactNode[] = [];

  if (res.includes('white precipitate') || res.includes('white ppt')) {
    chips.push(
      <span key="white-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[var(--bg-surface)] text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
        <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
        White ppt
      </span>
    );
  }

  if (res.includes('cream precipitate')) {
    chips.push(
      <span key="cream-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-300/30">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFF3D1] border border-amber-300" />
        Cream ppt
      </span>
    );
  }

  if (res.includes('yellow precipitate')) {
    chips.push(
      <span key="yellow-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-400/40">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        Yellow ppt
      </span>
    );
  }

  if (res.includes('light blue ppt')) {
    chips.push(
      <span key="light-blue-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-400/30">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
        Light blue ppt
      </span>
    );
  }

  if (res.includes('dark blue')) {
    chips.push(
      <span key="dark-blue" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 dark:bg-blue-600/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        Dark blue soln
      </span>
    );
  }

  if (res.includes('green ppt') || res.includes('grey-green ppt')) {
    chips.push(
      <span key="green-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/30">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        Green ppt
      </span>
    );
  }

  if (res.includes('red-brown ppt') || res.includes('reddish-brown')) {
    chips.push(
      <span key="red-brown-ppt" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-orange-50 dark:bg-amber-900/30 text-orange-800 dark:text-amber-200 border border-orange-200 dark:border-amber-700/40">
        <span className="w-2.5 h-2.5 rounded-full bg-[#8D3B1B]" />
        Red-brown ppt
      </span>
    );
  }

  if (res.includes('purple to colorless')) {
    chips.push(
      <span key="purple-colorless" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 dark:bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-400/30">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        <ArrowRight className="w-2.5 h-2.5 shrink-0" />
        <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300" />
        Decolorizes
      </span>
    );
  }

  if (res.includes('cloudy white') || res.includes('milky')) {
    chips.push(
      <span key="milky-white" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[var(--bg-surface)] text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
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
    { key: 'gas', label: 'Gases' },
    { key: 'flame', label: 'Flame Tests' },
  ];

  return (
    <div className="space-y-3">
      {/* Qualitative Filter Tabs */}
      <div className="flex items-center bg-[var(--bg-inset)] p-0.5 rounded-lg text-xs gap-0.5 border border-[var(--border-hairline)] overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setQualitativeFilter(cat.key)}
            className={`flex-1 py-1 px-2.5 rounded-md font-semibold text-center transition-colors truncate text-[11px] ${
              qualitativeFilter === cat.key
                ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tests Count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-[var(--ink-muted)]">
          Showing {filteredTests.length} qualitative analysis tests
        </span>
      </div>

      {/* Test Cards */}
      <div className="space-y-2.5">
        {filteredTests.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-colors space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {item.ionOrGas}
                </span>
                {item.formulaLatex && (
                  <div className="px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[rgba(249,115,22,0.16)] border border-[#FED7AA] dark:border-[rgba(251,146,60,0.35)]">
                    <MathFormula
                      latex={formatIonLatex(item.formulaLatex)}
                      className="text-xs font-semibold text-[#C2410C] dark:text-[#FB923C]"
                    />
                  </div>
                )}
              </div>
              <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[rgba(249,115,22,0.16)] text-[#C2410C] dark:text-[#FB923C] border border-[#FED7AA] dark:border-[rgba(251,146,60,0.35)] shrink-0">
                {item.type}
              </span>
            </div>

            <div className="text-[11.5px] text-[var(--ink-secondary)] leading-snug">
              <strong className="text-[var(--ink-primary)]">Test:</strong> {item.test}
            </div>

            <div className="text-[11.5px] space-y-1.5 p-2.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)]">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[var(--ink-primary)]">
                  <strong className="text-[#15803D] dark:text-[#4ADE80]">Result:</strong>{' '}
                  <span className="text-[var(--ink-secondary)]">{item.result}</span>
                </div>
              </div>

              {renderResultVisualChips(item)}
            </div>
          </div>
        ))}

        {filteredTests.length === 0 && (
          <div className="p-6 text-center text-xs text-[var(--ink-muted)] italic">
            No qualitative tests matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

export default ChemistryReference;
