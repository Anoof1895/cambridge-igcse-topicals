import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { handleSpotlightMove, handleSpotlightLeave } from '../utils/spotlight';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterMultiSelectProps {
  labelSingular: string; // e.g. "Unit", "Year", "Series"
  labelPlural: string;   // e.g. "Units", "Years", "Series"
  icon: React.ReactNode;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  showSearch?: boolean;
  align?: 'left' | 'right';
  badgeFontMono?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  labelSingular,
  labelPlural,
  icon,
  options,
  selectedValues,
  onChange,
  showSearch,
  align = 'left',
  badgeFontMono = false,
  fullWidth = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const shouldShowSearch = showSearch ?? options.length > 5;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        title={`Filter by ${labelSingular}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        className={`spotlight-surface ${
          fullWidth ? 'w-full' : ''
        } flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-all select-none duration-150 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] whitespace-nowrap ${
          selectedValues.length > 0
            ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 shadow-sm shadow-amber-500/10'
            : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <div className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1">
          {icon}
          <span className="truncate text-left">
            {selectedValues.length === 0 ? (
              `All ${labelPlural}`
            ) : selectedValues.length === 1 ? (
              options.find((o) => o.value === selectedValues[0])?.label || `${labelSingular}: ${selectedValues[0]}`
            ) : (
              `${selectedValues.length} ${labelPlural}`
            )}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-1 shrink-0 ml-1">
          {selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClearAll(e);
              }}
              title={`Clear ${labelPlural.toLowerCase()}`}
              className="w-4 h-4 rounded-full bg-cyan-700 dark:bg-cyan-500/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] max-h-[380px] z-50 shadow-2xl bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Search & Actions */}
          <div className="p-2.5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/80 dark:bg-dark-900/90 shrink-0 space-y-2">
            {shouldShowSearch && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search ${labelPlural.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>
                {selectedValues.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium transition-colors"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-dark-700">•</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Options Checkbox List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching {labelPlural.toLowerCase()}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none ${
                      isChecked
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-white font-medium border border-amber-300 dark:border-amber-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/[0.04]'
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`flex-1 leading-snug truncate ${
                        badgeFontMono ? 'font-mono' : ''
                      }`}
                    >
                      {opt.label}
                    </span>
                    {opt.count !== undefined && (
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06] shrink-0">
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
