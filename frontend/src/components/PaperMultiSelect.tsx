import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, ChevronDown, Check, X } from 'lucide-react';
import { handleSpotlightMove, handleSpotlightLeave } from '../utils/spotlight';

export interface PaperOption {
  paperNum: number;
  label: string;
}

interface PaperMultiSelectProps {
  isMath: boolean;
  selectedPaperNums: number[];
  onChange: (selected: number[]) => void;
  counts?: Map<number, number> | Record<number, number>;
  fullWidth?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const PaperMultiSelect: React.FC<PaperMultiSelectProps> = ({
  isMath,
  selectedPaperNums,
  onChange,
  counts,
  fullWidth = false,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options: PaperOption[] = useMemo(() => {
    if (isMath) {
      return [
        { paperNum: 1, label: 'Paper 1 (Core Non-Calc)' },
        { paperNum: 2, label: 'Paper 2 (Extended Non-Calc)' },
        { paperNum: 3, label: 'Paper 3 (Core Calc)' },
        { paperNum: 4, label: 'Paper 4 (Extended Calc)' },
      ];
    }
    return [
      { paperNum: 1, label: 'Paper 1 (Core MCQ)' },
      { paperNum: 2, label: 'Paper 2 (Extended MCQ)' },
      { paperNum: 3, label: 'Paper 3 (Core Theory)' },
      { paperNum: 4, label: 'Paper 4 (Extended Theory)' },
      { paperNum: 6, label: 'Paper 6 (ATP)' },
    ];
  }, [isMath]);

  const summaryLabel = useMemo(() => {
    if (selectedPaperNums.length === 0) return 'All Papers';
    if (selectedPaperNums.length === 1) {
      const match = options.find((o) => o.paperNum === selectedPaperNums[0]);
      return match ? match.label : `Paper ${selectedPaperNums[0]}`;
    }
    return `${selectedPaperNums.length} Papers selected`;
  }, [selectedPaperNums, options]);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        title="Filter by Paper Component"
        onClick={() => setIsOpen((prev) => !prev)}
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        className={`spotlight-surface ${
          fullWidth ? 'w-full' : ''
        } flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-all select-none duration-150 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] whitespace-nowrap ${
          selectedPaperNums.length > 0
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
            : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/15 text-slate-300 hover:text-white'
        }`}
      >
        <div className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1">
          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate text-left">{summaryLabel}</span>
        </div>

        <div className="relative z-10 flex items-center gap-1 shrink-0 ml-1">
          {selectedPaperNums.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              title="Clear paper filter"
              className="w-4 h-4 rounded-full bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover Panel */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-64 z-50 p-2.5 rounded-xl bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2 text-white animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-white/[0.08] px-1">
            <span>
              {selectedPaperNums.length} of {options.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(options.map((o) => o.paperNum))}
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Select All
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* List of paper options with custom checkboxes */}
          <div className="space-y-1">
            {options.map((opt) => {
              const isChecked = selectedPaperNums.includes(opt.paperNum);
              const countVal = counts
                ? typeof (counts as any).get === 'function'
                  ? (counts as Map<number, number>).get(opt.paperNum)
                  : (counts as Record<number, number>)[opt.paperNum]
                : undefined;

              return (
                <div
                  key={opt.paperNum}
                  onClick={() => {
                    if (isChecked) {
                      onChange(selectedPaperNums.filter((p) => p !== opt.paperNum));
                    } else {
                      onChange([...selectedPaperNums, opt.paperNum]);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                    isChecked
                      ? 'bg-amber-500/15 text-white font-medium border border-amber-500/30'
                      : 'hover:bg-white/[0.06] text-zinc-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'border-white/20 bg-white/[0.04]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {countVal !== undefined && (
                    <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.2 rounded bg-white/[0.06] shrink-0">
                      {countVal}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default PaperMultiSelect;
