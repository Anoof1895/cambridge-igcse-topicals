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
        className={`${
          fullWidth ? 'w-full' : ''
        } flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-colors select-none active:scale-[0.98] whitespace-nowrap ${
          selectedPaperNums.length > 0
            ? 'bg-[var(--subject-bg)] border-[var(--subject-border)] text-[var(--subject-accent)] font-semibold'
            : 'bg-[var(--bg-inset)] hover:border-[var(--border-strong)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
        }`}
      >
        <div className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1">
          <Layers className="w-3.5 h-3.5 text-[var(--subject-accent)] shrink-0" />
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
              className="w-4 h-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:bg-rose-500 hover:border-rose-500 hover:text-white text-[var(--ink-muted)] flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 transition-transform duration-150 ${
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
          } top-full mt-1.5 w-64 z-50 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-[var(--shadow-popover)] space-y-2 text-[var(--ink-primary)] animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] pb-1.5 border-b border-[var(--border-hairline)] px-1">
            <span className="font-mono tabular-nums">
              {selectedPaperNums.length} of {options.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(options.map((o) => o.paperNum))}
                className="text-[var(--subject-accent)] hover:underline font-medium transition-colors"
              >
                Select All
              </button>
              <span className="text-[var(--ink-caption)]">•</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 dark:text-rose-400 hover:underline font-medium transition-colors"
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
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none border ${
                    isChecked
                      ? 'bg-[var(--subject-bg)] text-[var(--ink-primary)] font-semibold border-[var(--subject-border)]'
                      : 'hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-[var(--action-primary-bg)] border-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
                          : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {countVal !== undefined && (
                    <span className="text-[10px] text-[var(--ink-muted)] font-mono tabular-nums px-1.5 py-0.2 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] shrink-0">
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
