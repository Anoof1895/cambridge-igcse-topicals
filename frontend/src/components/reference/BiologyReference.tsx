import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { BIOLOGY_FOOD_TESTS, FoodTestItem } from '../../constants/referenceData';

interface BiologyReferenceProps {
  searchQuery?: string;
}

interface ProgressionStep {
  label: string;
  sublabel?: string;
  colorHex: string;
  textColor?: string;
  border?: string;
  dotClass: string;
}

const getProgressionSteps = (nutrient: string): ProgressionStep[] => {
  if (nutrient.toLowerCase().includes('starch')) {
    return [
      {
        label: 'Initial',
        sublabel: 'Yellow-brown',
        colorHex: '#B45309',
        dotClass: 'bg-amber-600 border border-amber-500/40 shadow-xs shadow-amber-600/50',
      },
      {
        label: 'Positive',
        sublabel: 'Blue-black',
        colorHex: '#0B132B',
        dotClass: 'bg-[#0B132B] border border-indigo-400/50 shadow-xs shadow-indigo-900/60 ring-1 ring-indigo-400/40',
      },
    ];
  }

  if (nutrient.toLowerCase().includes('reducing sugar')) {
    return [
      {
        label: 'Initial',
        sublabel: 'Light Blue (0%)',
        colorHex: '#38BDF8',
        dotClass: 'bg-sky-400 border border-sky-300 shadow-xs shadow-sky-400/50',
      },
      {
        label: 'Traces',
        sublabel: 'Green',
        colorHex: '#10B981',
        dotClass: 'bg-emerald-500 border border-emerald-400 shadow-xs shadow-emerald-500/50',
      },
      {
        label: 'Moderate',
        sublabel: 'Yellow',
        colorHex: '#FBBF24',
        dotClass: 'bg-amber-400 border border-amber-300 shadow-xs shadow-amber-400/50',
      },
      {
        label: 'Positive',
        sublabel: 'Brick-red ppt',
        colorHex: '#B91C1C',
        dotClass: 'bg-red-700 border border-red-500 shadow-xs shadow-red-700/60',
      },
    ];
  }

  if (nutrient.toLowerCase().includes('protein')) {
    return [
      {
        label: 'Initial',
        sublabel: 'Light Blue',
        colorHex: '#38BDF8',
        dotClass: 'bg-sky-400 border border-sky-300 shadow-xs shadow-sky-400/50',
      },
      {
        label: 'Positive',
        sublabel: 'Purple / Violet',
        colorHex: '#8B5CF6',
        dotClass: 'bg-purple-600 border border-purple-400 shadow-xs shadow-purple-600/50',
      },
    ];
  }

  if (nutrient.toLowerCase().includes('fat') || nutrient.toLowerCase().includes('lipid')) {
    return [
      {
        label: 'Initial',
        sublabel: 'Colorless',
        colorHex: 'transparent',
        dotClass: 'bg-slate-200/40 dark:bg-white/10 border border-slate-300 dark:border-white/20',
      },
      {
        label: 'Positive',
        sublabel: 'Milky-white emulsion',
        colorHex: '#FFFFFF',
        dotClass: 'bg-white border-2 border-slate-300 dark:border-slate-100 shadow-xs shadow-white/40',
      },
    ];
  }

  if (nutrient.toLowerCase().includes('vitamin c')) {
    return [
      {
        label: 'Initial',
        sublabel: 'Dark Blue',
        colorHex: '#1D4ED8',
        dotClass: 'bg-blue-700 border border-blue-500 shadow-xs shadow-blue-700/50',
      },
      {
        label: 'Positive',
        sublabel: 'Decolorizes (Colorless)',
        colorHex: 'transparent',
        dotClass: 'bg-slate-200/40 dark:bg-white/10 border border-slate-300 dark:border-white/20',
      },
    ];
  }

  return [];
};

export const BiologyReference: React.FC<BiologyReferenceProps> = ({ searchQuery = '' }) => {
  const query = searchQuery.trim().toLowerCase();

  const filteredTests = useMemo(() => {
    if (!query) return BIOLOGY_FOOD_TESTS;
    return BIOLOGY_FOOD_TESTS.filter(
      (t) =>
        t.nutrient.toLowerCase().includes(query) ||
        t.reagent.toLowerCase().includes(query) ||
        t.method.toLowerCase().includes(query) ||
        t.initialColor.toLowerCase().includes(query) ||
        t.positiveColor.toLowerCase().includes(query)
    );
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Standard Cambridge IGCSE Biology biochemical tests for nutrients with visual color progression.
        </p>
        <span className="text-[11px] text-slate-400 shrink-0">
          {filteredTests.length} tests
        </span>
      </div>

      <div className="space-y-3">
        {filteredTests.map((t: FoodTestItem) => {
          const progression = getProgressionSteps(t.nutrient);

          return (
            <div
              key={t.nutrient}
              className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-emerald-500/30 transition-all space-y-3 shadow-xs"
            >
              {/* Nutrient and Reagent Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs shadow-emerald-500/50" />
                  {t.nutrient}
                </h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  {t.reagent}
                </span>
              </div>

              {/* Method */}
              <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug">
                <strong className="text-slate-800 dark:text-slate-200">Method:</strong> {t.method}
              </p>

              {/* Arrow Color Progression Cards */}
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Visual Color Progression
                </span>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center gap-2 overflow-x-auto">
                  {progression.map((step, idx) => (
                    <React.Fragment key={step.label + step.sublabel}>
                      {idx > 0 && (
                        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      )}

                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] shrink-0">
                        <span
                          className={`w-3.5 h-3.5 rounded-full shrink-0 ${step.dotClass}`}
                        />
                        <div className="leading-tight">
                          <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400 block">
                            {step.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {step.sublabel}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTests.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            No biology food tests matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

export default BiologyReference;
