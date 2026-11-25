import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Columns,
  Eye,
  CheckCircle2,
  Search,
  Layers,
  RotateCcw,
  Calendar,
  CalendarRange,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { FilterState, ViewMode, QuestionItem, Tier, SyllabusEra, Subject } from '../types';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { FilterMultiSelect, FilterOption } from './FilterMultiSelect';
import { SubtopicGroup } from '../constants/taxonomy';
import { getQuestionSubject } from '../utils/questionClassification';
import { useAuth } from '../context/AuthContext';
import { getCanonicalSubjectTheme } from '../utils/subjectTheme';

export type { SubtopicGroup };

interface TopBarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  availableUnits: string[];
  subtopicHierarchy: SubtopicGroup[];
  availableYears: number[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalFiltered: number;
  totalMarks: number;
  onResetFilters: () => void;
  allQuestions?: QuestionItem[];
}

export const TopBar: React.FC<TopBarProps> = ({
  filters,
  onFilterChange,
  availableUnits: _availableUnits,
  subtopicHierarchy,
  availableYears,
  viewMode,
  onViewModeChange,
  totalFiltered,
  totalMarks,
  onResetFilters,
  allQuestions,
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSecondaryPopoverOpen, setIsSecondaryPopoverOpen] = useState(false);
  const secondaryPopoverRef = useRef<HTMLDivElement>(null);

  const { user, openAuthModal, signOut } = useAuth();
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  useEffect(() => {
    setSearchInput(filters.searchQuery);
  }, [filters.searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchQuery) {
        onFilterChange({ searchQuery: searchInput });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput, filters.searchQuery, onFilterChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (secondaryPopoverRef.current && !secondaryPopoverRef.current.contains(e.target as Node)) {
        setIsSecondaryPopoverOpen(false);
      }
    };
    if (isSecondaryPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSecondaryPopoverOpen]);

  const activeSubject: Subject = useMemo(() => {
    if (filters.subject) {
      if (filters.subject === '0580') return 'mathematics';
      if (filters.subject === '0625') return 'physics';
      if (filters.subject === '0610') return 'biology';
      return 'chemistry';
    }
    return getQuestionSubject(allQuestions?.[0]);
  }, [filters.subject, allQuestions]);

  const subjectTheme = getCanonicalSubjectTheme(activeSubject);
  const isMath = activeSubject === 'mathematics';

  const activeSegBtnClass = 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold';

  const componentOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        let pNum = q.paper;
        if (!pNum && q.id) {
          const parts = q.id.split('_');
          if (parts[3] && parts[3][0]) pNum = parseInt(parts[3][0], 10);
        }
        if (pNum) {
          const key = `paper${pNum}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
    }

    if (isMath) {
      return [
        { value: 'paper1', label: 'Paper 1 (Core Non-Calc)', count: counts.get('paper1') },
        { value: 'paper2', label: 'Paper 2 (Extended Non-Calc)', count: counts.get('paper2') },
        { value: 'paper3', label: 'Paper 3 (Core Calc)', count: counts.get('paper3') },
        { value: 'paper4', label: 'Paper 4 (Extended Calc)', count: counts.get('paper4') },
      ];
    }

    return [
      { value: 'paper1', label: 'Paper 1 (Core MCQ)', count: counts.get('paper1') },
      { value: 'paper2', label: 'Paper 2 (Extended MCQ)', count: counts.get('paper2') },
      { value: 'paper3', label: 'Paper 3 (Core Theory)', count: counts.get('paper3') },
      { value: 'paper4', label: 'Paper 4 (Extended Theory)', count: counts.get('paper4') },
      { value: 'paper6', label: 'Paper 6 (ATP)', count: counts.get('paper6') },
    ];
  }, [allQuestions, isMath]);

  const yearOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        if (q.year) {
          const yStr = String(q.year);
          counts.set(yStr, (counts.get(yStr) || 0) + 1);
        }
      });
    }
    return availableYears.map((yr) => ({
      value: String(yr),
      label: String(yr),
      count: counts.get(String(yr)),
    }));
  }, [availableYears, allQuestions]);

  const seriesOptions: FilterOption[] = useMemo(() => {
    const seriesList = [
      { value: 'm', label: 'Feb/March (m)' },
      { value: 's', label: 'May/June (s)' },
      { value: 'w', label: 'Oct/Nov (w)' },
    ];
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        let s = String(q.series || '').toLowerCase();
        if (!s && q.id) {
          const parts = q.id.split('_');
          if (parts[1]) s = parts[1][0].toLowerCase();
        }
        if (s) {
          counts.set(s, (counts.get(s) || 0) + 1);
        }
      });
    }
    return seriesList.map((item) => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0,
    }));
  }, [allQuestions]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedUnits.length > 0) count++;
    if (filters.selectedSubtopics.length > 0) count++;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.selectedTier && filters.selectedTier !== 'extended') count++;
    if (filters.variant && filters.variant !== 'all') count++;
    if (filters.syllabusEra && filters.syllabusEra !== 'all') count++;
    if (filters.hideObsolete === false) count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.questionType !== 'all') count++;
    if (filters.bookmarkedOnly) count++;
    if (filters.searchQuery.trim().length > 0) count++;
    return count;
  }, [filters]);

  const activeSecondaryCount = useMemo(() => {
    let count = 0;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.selectedTier && filters.selectedTier !== 'extended') count++;
    if (filters.variant && filters.variant !== 'all') count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.hideObsolete === false) count++;
    return count;
  }, [filters.selectedYears, filters.selectedSeries, filters.selectedTier, filters.variant, filters.statusFilter, filters.hideObsolete]);

  const toggleYear = (yStr: string) => {
    const current = filters.selectedYears;
    const updated = current.includes(yStr)
      ? current.filter((y) => y !== yStr)
      : [...current, yStr];
    onFilterChange({ selectedYears: updated });
  };

  const toggleSeries = (s: string) => {
    const current = filters.selectedSeries;
    const updated = current.includes(s)
      ? current.filter((item) => item !== s)
      : [...current, s];
    onFilterChange({ selectedSeries: updated });
  };

  const currentSyllabusEra: SyllabusEra = filters.syllabusEra || 'all';
  const hideObsoleteActive: boolean = filters.hideObsolete ?? true;
  const currentTier: Tier | 'all' = filters.selectedTier || filters.tier || 'all';
  const currentVariant: 'all' | 1 | 2 | 3 = filters.variant || 'all';

  const hasActiveFilters = activeFilterCount > 0;
  const selectedSubject = filters.subject || subjectTheme.code;

  return (
    <>
      <header className="relative z-30 flex flex-nowrap items-center justify-between gap-2 px-3 h-12 w-full min-w-0 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] overflow-visible select-none transition-colors">
        {/* Left Wing: Title & Subject Badge */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)] shrink-0 whitespace-nowrap">
            <span className="hidden sm:inline">Topical Explorer</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums border ${subjectTheme.badgeClass}`}>
              {selectedSubject}
            </span>
          </div>
        </div>

        {/* Center Group: Search & Filter Controls */}
        <div className="shrink-0 flex items-center justify-center gap-1.5 xl:gap-2 mx-auto overflow-visible">
          <div className="relative w-36 sm:w-44 lg:w-52 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search topic or Q#..."
              className="w-full h-8 pl-8 pr-2 text-xs bg-[var(--bg-inset)] focus:bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder-[var(--ink-caption)] rounded-lg border border-[var(--border-hairline)] focus:border-[var(--border-strong)] focus:outline-none transition-colors"
            />
          </div>

          {/* Inline filter controls (Wide Desktop >= 1536px) */}
          <div className="hidden 2xl:flex flex-nowrap items-center gap-1.5 xl:gap-2 shrink-0 overflow-visible">
            {isMath && (
              <div
                className="h-8 flex items-center bg-[var(--bg-inset)] border border-[var(--border-hairline)] p-0.5 rounded-lg text-xs shrink-0"
                title="0580 Mathematics Syllabus Era"
              >
                <button
                  type="button"
                  onClick={() => onFilterChange({ syllabusEra: '2025-2027' })}
                  className={`h-7 px-2 rounded-md transition-colors text-xs whitespace-nowrap ${
                    currentSyllabusEra === '2025-2027' || currentSyllabusEra === '2025-2028'
                      ? activeSegBtnClass
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                  }`}
                >
                  2025–2027
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange({ syllabusEra: '2019-2024' })}
                  className={`h-7 px-2 rounded-md transition-colors text-xs whitespace-nowrap ${
                    currentSyllabusEra === '2019-2024' || currentSyllabusEra === '2020-2024'
                      ? activeSegBtnClass
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                  }`}
                >
                  2019–2024
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange({ syllabusEra: 'all' })}
                  className={`h-7 px-2 rounded-md transition-colors text-xs whitespace-nowrap ${
                    currentSyllabusEra === 'all'
                      ? activeSegBtnClass
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                  }`}
                >
                  All Syllabi
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onFilterChange({ hideObsolete: !hideObsoleteActive })}
              title="Filter out questions testing content removed from current Cambridge syllabus"
              className={`whitespace-nowrap shrink-0 h-8 px-3 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg border transition-colors ${
                hideObsoleteActive
                  ? 'bg-[#F0FDF4] dark:bg-emerald-500/15 text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-emerald-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              }`}
            >
              {hideObsoleteActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Obsolete Hidden</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Showing Obsolete</span>
                </>
              )}
            </button>

            <FilterMultiSelect
              labelSingular="Paper"
              labelPlural="Papers"
              icon={<Layers className={`w-3.5 h-3.5 shrink-0 ${subjectTheme.textClass}`} />}
              options={componentOptions}
              selectedValues={filters.selectedUnits}
              onChange={(units) => onFilterChange({ selectedUnits: units })}
            />

            <SubtopicMultiSelect
              hierarchy={subtopicHierarchy}
              selectedSubtopics={filters.selectedSubtopics}
              onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
              questions={allQuestions}
            />

            {!isMath && (
              <div className="h-8 flex items-center bg-[var(--bg-inset)] border border-[var(--border-hairline)] p-0.5 rounded-lg text-xs shrink-0">
                {(['all', 'mcq', 'theory'] as const).map((qt) => (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => onFilterChange({ questionType: qt })}
                    className={`h-7 px-2.5 rounded-md transition-colors text-xs whitespace-nowrap ${
                      filters.questionType === qt
                        ? activeSegBtnClass
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                    }`}
                  >
                    {qt === 'all' ? 'All' : qt === 'mcq' ? 'MCQ' : 'Theory'}
                  </button>
                ))}
              </div>
            )}

            {/* Consolidated Filters Popover */}
            <div className="relative shrink-0" ref={secondaryPopoverRef}>
              <button
                type="button"
                onClick={() => setIsSecondaryPopoverOpen((prev) => !prev)}
                className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                  activeSecondaryCount > 0
                    ? `${subjectTheme.badgeClass}`
                    : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border-[var(--border-hairline)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)]'
                }`}
                title="Consolidated filters: Tier, Variant, Year, Series, Status"
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${activeSecondaryCount > 0 ? subjectTheme.textClass : 'text-[var(--ink-muted)]'}`} />
                <span>Filters</span>
                {activeSecondaryCount > 0 && (
                  <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]">
                    {activeSecondaryCount}
                  </span>
                )}
              </button>

              {isSecondaryPopoverOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] min-w-[260px] p-4 space-y-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] z-50 max-h-[85vh] overflow-y-auto"
                  style={{ boxShadow: 'var(--shadow-popover)' }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink-primary)]">
                      <SlidersHorizontal className={`w-3.5 h-3.5 ${subjectTheme.textClass}`} />
                      <span>Cambridge Filters</span>
                      {activeSecondaryCount > 0 && (
                        <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border ${subjectTheme.badgeClass}`}>
                          {activeSecondaryCount} active
                        </span>
                      )}
                    </div>
                    {activeSecondaryCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onFilterChange({ selectedYears: [], selectedSeries: [], selectedTier: 'extended', variant: 'all', statusFilter: 'all' })}
                        className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Tier Selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1 mb-1.5">
                      <Award className={`w-3 h-3 ${subjectTheme.textClass}`} />
                      <span>Cambridge Tier</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-hairline)]">
                      {(['all', 'core', 'extended'] as const).map((t) => {
                        const label = t === 'all' ? 'All Tiers' : t === 'core' ? 'Core' : 'Extended';
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onFilterChange({ selectedTier: t, tier: t })}
                            className={`py-1.5 px-2 text-xs text-center truncate rounded-md transition-colors ${
                              currentTier === t
                                ? activeSegBtnClass
                                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] font-medium'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Paper Variant Selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1 mb-1.5">
                      <Layers className={`w-3 h-3 ${subjectTheme.textClass}`} />
                      <span>Paper Variant</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-hairline)]">
                      {([
                        { value: 'all', label: 'All' },
                        { value: 1, label: 'V1' },
                        { value: 2, label: 'V2' },
                        { value: 3, label: 'V3' },
                      ] as const).map((v) => (
                        <button
                          key={String(v.value)}
                          type="button"
                          onClick={() => onFilterChange({ variant: v.value })}
                          className={`py-1.5 px-2 text-xs font-mono tabular-nums text-center truncate rounded-md transition-colors ${
                            currentVariant === v.value
                              ? activeSegBtnClass
                              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] font-medium'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exam Years Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1">
                        <Calendar className={`w-3 h-3 ${subjectTheme.textClass}`} />
                        <span>Exam Year</span>
                      </label>
                      {filters.selectedYears.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onFilterChange({ selectedYears: [] })}
                          className={`text-[10px] font-medium ${subjectTheme.textClass}`}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 w-full">
                      {availableYears.map((yr) => {
                        const yStr = String(yr);
                        const isSelected = filters.selectedYears.includes(yStr);
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => toggleYear(yStr)}
                            className={`w-full text-center py-1 text-xs font-mono tabular-nums rounded-md transition-colors border ${
                              isSelected
                                ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold border-transparent'
                                : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)]'
                            }`}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Series / Season */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1">
                        <CalendarRange className={`w-3 h-3 ${subjectTheme.textClass}`} />
                        <span>Series / Season</span>
                      </label>
                      {filters.selectedSeries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onFilterChange({ selectedSeries: [] })}
                          className={`text-[10px] font-medium ${subjectTheme.textClass}`}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {seriesOptions.map((opt) => {
                        const isSelected = filters.selectedSeries.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleSeries(opt.value)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                              isSelected
                                ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold border-transparent'
                                : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)]'
                            }`}
                          >
                            {opt.label} ({opt.count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Revision Status */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Revision Status</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {([
                        { value: 'all', label: 'All', dot: null },
                        { value: 'unattempted', label: 'Unattempted', dot: 'bg-slate-400 dark:bg-slate-500' },
                        { value: 'review', label: 'Review', dot: 'bg-amber-500' },
                        { value: 'mastered', label: 'Mastered', dot: 'bg-emerald-500' },
                      ] as const).map((st) => {
                        const isSelected = filters.statusFilter === st.value;
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => onFilterChange({ statusFilter: st.value })}
                            className={`py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                              isSelected
                                ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold border-transparent'
                                : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)]'
                            }`}
                          >
                            {st.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />}
                            <span className="truncate">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Question / Mark counter chip */}
            <div className="h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-xs font-mono text-[var(--ink-secondary)] flex items-center gap-1.5 shrink-0 whitespace-nowrap min-w-[80px]">
              <span className={`font-semibold whitespace-nowrap tabular-nums ${subjectTheme.textClass}`}>
                {totalFiltered}
              </span>{' '}
              Qs
              <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
              <span className="font-semibold text-[var(--ink-primary)] whitespace-nowrap tabular-nums">{totalMarks}</span> marks
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                title="Reset All Filters"
                className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:bg-[var(--bg-inset)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center justify-center transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Compact Filter Drawer Trigger & Counter (< 1536px) */}
          <div className="flex 2xl:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                hasActiveFilters
                  ? `${subjectTheme.badgeClass}`
                  : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border-[var(--border-hairline)] hover:bg-[var(--bg-inset)]'
              }`}
              title="Filter Questions"
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${hasActiveFilters ? subjectTheme.textClass : 'text-[var(--ink-muted)]'}`} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="h-8 px-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-xs font-mono text-[var(--ink-secondary)] hidden sm:flex items-center gap-1 shrink-0 whitespace-nowrap">
              <span className={`font-semibold tabular-nums ${subjectTheme.textClass}`}>
                {totalFiltered}
              </span>
              <span className="text-[10px] text-[var(--ink-muted)]">Qs</span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                title="Reset All Filters"
                className="hidden sm:flex h-8 w-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:bg-[var(--bg-inset)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] items-center justify-center transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Wing: View Mode Controls (>= 768px) */}
        <div className="hidden md:flex flex-1 items-center justify-end min-w-0">
          <div className="inline-flex items-center bg-[var(--bg-inset)] p-0.5 rounded-lg border border-[var(--border-hairline)] h-8 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('question-only')}
              title="Question Only (Focus Mode - Hides Answers)"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${
                viewMode === 'question-only'
                  ? activeSegBtnClass
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Question</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              title="Side-by-Side Split View"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${
                viewMode === 'split'
                  ? activeSegBtnClass
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('ms-only')}
              title="Mark Scheme Only"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${
                viewMode === 'ms-only'
                  ? activeSegBtnClass
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Mark Scheme</span>
            </button>
          </div>
        </div>
      </header>

      {/* SLIDE-OVER FILTER DRAWER (< 1536px) */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/50 2xl:hidden flex justify-end"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-full sm:w-[26rem] h-full bg-[var(--bg-surface)] border-l border-[var(--border-hairline)] flex flex-col"
            style={{ boxShadow: 'var(--shadow-popover)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className={`w-4 h-4 ${subjectTheme.textClass}`} />
                <span className="font-bold text-sm text-[var(--ink-primary)]">Filter Questions</span>
                {hasActiveFilters && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${subjectTheme.badgeClass}`}>
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium px-2 py-1 rounded"
                  >
                    Reset All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-2.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-hairline)]">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <span className="text-xs text-[var(--ink-secondary)] truncate">{user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold ml-2 shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-muted)]">Sync progress &amp; bookmarks</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        openAuthModal();
                      }}
                      className="px-2.5 py-1 rounded-md bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] text-xs font-semibold shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Search Keywords
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                  <input
                    type="text"
                    placeholder="Search topic, question number, or keyword..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-hairline)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-caption)] focus:outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
              </div>

              {isMath && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                    0580 Syllabus Transition Era
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-inset)] p-1 rounded-lg border border-[var(--border-hairline)] text-xs">
                    {[
                      { era: '2025-2028' as SyllabusEra, label: '2025–2028' },
                      { era: '2019-2024' as SyllabusEra, label: '2019–2024' },
                      { era: 'all' as SyllabusEra, label: 'All Syllabi' },
                    ].map(({ era, label }) => (
                      <button
                        key={era}
                        type="button"
                        onClick={() => onFilterChange({ syllabusEra: era })}
                        className={`py-2 rounded-md transition-colors text-center ${
                          currentSyllabusEra === era || (era === '2019-2024' && currentSyllabusEra === '2020-2024')
                            ? activeSegBtnClass
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Removed Syllabus Content
                </label>
                <button
                  type="button"
                  onClick={() => onFilterChange({ hideObsolete: !hideObsoleteActive })}
                  className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                    hideObsoleteActive
                      ? 'bg-[#F0FDF4] dark:bg-emerald-500/15 text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-emerald-500/30'
                      : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                  }`}
                >
                  <span>Hide Obsolete Content</span>
                  <span className="font-mono font-bold">{hideObsoleteActive ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Cambridge Tier
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-inset)] p-1 rounded-lg border border-[var(--border-hairline)] text-xs">
                  {(['all', 'core', 'extended'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onFilterChange({ selectedTier: t, tier: t })}
                      className={`py-2 rounded-md capitalize transition-colors ${
                        currentTier === t
                          ? activeSegBtnClass
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                      }`}
                    >
                      {t === 'all' ? 'All' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Paper Variant
                </label>
                <div className="grid grid-cols-4 gap-1 bg-[var(--bg-inset)] p-1 rounded-lg border border-[var(--border-hairline)] text-xs">
                  {([
                    { value: 'all', label: 'All' },
                    { value: 1, label: 'V1' },
                    { value: 2, label: 'V2' },
                    { value: 3, label: 'V3' },
                  ] as const).map((v) => (
                    <button
                      key={String(v.value)}
                      type="button"
                      onClick={() => onFilterChange({ variant: v.value })}
                      className={`py-2 rounded-md font-mono tabular-nums transition-colors ${
                        currentVariant === v.value
                          ? activeSegBtnClass
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Paper Components
                </label>
                <FilterMultiSelect
                  labelSingular="Paper"
                  labelPlural="Papers"
                  icon={<Layers className={`w-3.5 h-3.5 shrink-0 ${subjectTheme.textClass}`} />}
                  options={componentOptions}
                  selectedValues={filters.selectedUnits}
                  onChange={(units) => onFilterChange({ selectedUnits: units })}
                  fullWidth
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Topic &amp; Subtopics
                </label>
                <SubtopicMultiSelect
                  hierarchy={subtopicHierarchy}
                  selectedSubtopics={filters.selectedSubtopics}
                  onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
                  questions={allQuestions}
                  fullWidth
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                    Exam Year
                  </label>
                  <FilterMultiSelect
                    labelSingular="Year"
                    labelPlural="Years"
                    icon={<Calendar className={`w-3.5 h-3.5 shrink-0 ${subjectTheme.textClass}`} />}
                    options={yearOptions}
                    selectedValues={filters.selectedYears}
                    onChange={(years) => onFilterChange({ selectedYears: years })}
                    badgeFontMono
                    fullWidth
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                    Series / Season
                  </label>
                  <FilterMultiSelect
                    labelSingular="Series"
                    labelPlural="Series"
                    icon={<CalendarRange className={`w-3.5 h-3.5 shrink-0 ${subjectTheme.textClass}`} />}
                    options={seriesOptions}
                    selectedValues={filters.selectedSeries}
                    onChange={(series) => onFilterChange({ selectedSeries: series })}
                    showSearch={false}
                    fullWidth
                  />
                </div>
              </div>

              {!isMath && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                    Question Format
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-inset)] p-1 rounded-lg border border-[var(--border-hairline)] text-xs">
                    {(['all', 'mcq', 'theory'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onFilterChange({ questionType: t })}
                        className={`py-2 rounded-md capitalize transition-colors ${
                          filters.questionType === t
                            ? activeSegBtnClass
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
                        }`}
                      >
                        {t === 'all' ? 'All' : t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Mastery Status (Zero Native <select>, Zero Emojis) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Revision Mastery Status
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {([
                    { value: 'all', label: 'All Questions', dot: null },
                    { value: 'unattempted', label: 'Unattempted', dot: 'bg-slate-400 dark:bg-slate-500' },
                    { value: 'review', label: 'Review Needed', dot: 'bg-amber-500' },
                    { value: 'mastered', label: 'Mastered', dot: 'bg-emerald-500' },
                  ] as const).map((st) => {
                    const isSelected = filters.statusFilter === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => onFilterChange({ statusFilter: st.value })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                          isSelected
                            ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold border-transparent'
                            : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)]'
                        }`}
                      >
                        {st.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />}
                        <span className="truncate">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-hairline)] flex items-center justify-between text-xs">
                <span className="text-[var(--ink-muted)]">Matching Pool:</span>
                <span className="font-mono tabular-nums font-semibold text-[var(--ink-primary)]">
                  <span className={`${subjectTheme.textClass} font-bold`}>{totalFiltered}</span> questions ·{' '}
                  <span className="font-bold">{totalMarks}</span> marks
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-2.5 rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Show {totalFiltered} Questions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
