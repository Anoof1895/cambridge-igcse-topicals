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
        className={`${
          fullWidth ? 'w-full' : ''
        } flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-colors select-none whitespace-nowrap ${
          selectedValues.length > 0
            ? 'bg-[var(--subject-bg)] border-[var(--subject-border)] text-[var(--subject-accent)] font-semibold'
            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
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

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClearAll(e);
              }}
              title={`Clear ${labelPlural.toLowerCase()}`}
              className="w-4 h-4 rounded-full bg-[var(--action-primary-bg)] hover:bg-rose-600 text-[var(--action-primary-fg)] flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0"
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

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-60 sm:w-64 max-w-[calc(100vw-1.5rem)] max-h-[380px] z-50 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg flex flex-col overflow-hidden`}
          style={{ boxShadow: 'var(--shadow-popover)' }}
        >
          {/* Header Search & Actions */}
          <div className="p-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-inset)] shrink-0 space-y-2">
            {shouldShowSearch && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search ${labelPlural.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-md pl-8 pr-3 py-1.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-caption)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] px-1">
              <span>
                {selectedValues.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[var(--ink-primary)] hover:underline font-medium transition-colors"
                >
                  Select All
                </button>
                <span className="text-[var(--border-strong)]">·</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Options Checkbox List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--ink-muted)]">
                No matching {labelPlural.toLowerCase()}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none border ${
                      isChecked
                        ? 'bg-[var(--subject-bg)] text-[var(--ink-primary)] font-medium border-[var(--subject-border)]'
                        : 'hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-transparent'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-[var(--action-primary-bg)] border-transparent text-[var(--action-primary-fg)]'
                          : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
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
                      <span className="text-[10px] text-[var(--ink-muted)] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] shrink-0">
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
