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
  Sparkles,
  AlertTriangle,
  Award,
  LogIn,
  LogOut,
  Bookmark,
  ChevronDown
} from 'lucide-react';
import { FilterState, ViewMode, QuestionItem, Tier, SyllabusEra, Subject, StatusFilter } from '../types';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { FilterMultiSelect, FilterOption } from './FilterMultiSelect';
import { SubtopicGroup } from '../constants/taxonomy';
import { getQuestionSubject } from '../utils/questionClassification';
import { useAuth } from '../context/AuthContext';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';

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
  allQuestions
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSecondaryPopoverOpen, setIsSecondaryPopoverOpen] = useState(false);
  const secondaryPopoverRef = useRef<HTMLDivElement>(null);

  const { user, openAuthModal, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Debounced search input state
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

  // Detect active Cambridge subject
  const activeSubject: Subject = useMemo(() => {
    if (filters.subject) {
      if (filters.subject === '0580') return 'mathematics';
      if (filters.subject === '0625') return 'physics';
      if (filters.subject === '0610') return 'biology';
      return 'chemistry';
    }
    return getQuestionSubject(allQuestions?.[0]);
  }, [filters.subject, allQuestions]);

  const isMath = activeSubject === 'mathematics';
  const isPhysics = activeSubject === 'physics';
  const isBio = activeSubject === 'biology';

  const activePillBtnClass = isMath
    ? 'bg-amber-600 text-white shadow-sm'
    : isPhysics
    ? 'bg-indigo-600 text-white shadow-sm'
    : isBio
    ? 'bg-emerald-600 text-white shadow-sm'
    : 'bg-cyan-600 text-white shadow-sm';

  // Available Paper Components with Cambridge labels
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

  // Cambridge Exam Series Options (m = Feb/March India, s = May/June, w = Oct/Nov)
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

  // Active filter badge count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedUnits.length > 0) count++;
    if (filters.selectedSubtopics.length > 0) count++;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.selectedTier && filters.selectedTier !== 'extended') count++;
    if (filters.variant && filters.variant !== 'all') count++;
    if (filters.syllabusEra && filters.syllabusEra !== 'all') count++;
    if (filters.hideObsolete === false) count++; // non-default
    if (filters.statusFilter !== 'all') count++;
    if (filters.questionType !== 'all') count++;
    if (filters.bookmarkedOnly) count++;
    if (filters.searchQuery.trim().length > 0) count++;
    return count;
  }, [filters]);

  // Active secondary filter count (Tier, Variant, Year, Series, Status, Obsolete)
  const activeSecondaryCount = useMemo(() => {
    let count = 0;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.selectedTier && filters.selectedTier !== 'extended') count++;
    if (filters.variant && filters.variant !== 'all') count++;
    if (filters.statusFilter !== 'all') count++;
    if (!isMath && filters.hideObsolete === false) count++;
    return count;
  }, [filters.selectedYears, filters.selectedSeries, filters.selectedTier, filters.variant, filters.statusFilter, filters.hideObsolete, isMath]);

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

  const selectedSubject = filters.subject || (isMath ? '0580' : isPhysics ? '0625' : isBio ? '0610' : '0620');

  return (
    <>
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2 w-full min-w-0 shrink-0 bg-[#0B0F19]/90 backdrop-blur-md border-b border-zinc-800/80 overflow-visible select-none">
        {/* Left: Breadcrumb / Paper badge & Search */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 shrink-0">
            <span className="hidden sm:inline">Topical Explorer</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-400">
              {selectedSubject}
            </span>
          </div>
          <div className="relative w-36 sm:w-44 lg:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search topic or Q#..."
              className="w-full h-8 pl-8 pr-2 text-xs bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] text-zinc-200 placeholder-zinc-500 rounded-lg border border-white/[0.08] focus:border-[var(--subject-accent,#F59E0B)] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Center / Filters: Filter pills & controls (Tablet & Desktop >= 768px) */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5 shrink-0 overflow-visible">

          {/* Primary 2: 0580 Mathematics Syllabus Segmented Toggle */}
          {isMath && (
            <div
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={getSubjectSpotlightStyle('mathematics', 200)}
              className="spotlight-surface h-8 flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-lg text-xs shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              title="0580 Mathematics Syllabus Era"
            >
              <button
                type="button"
                onClick={() => onFilterChange({ syllabusEra: '2025-2027' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium flex items-center gap-1 text-xs whitespace-nowrap ${
                  currentSyllabusEra === '2025-2027' || currentSyllabusEra === '2025-2028'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Current (2025–2027)</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ syllabusEra: '2019-2024' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  currentSyllabusEra === '2019-2024' || currentSyllabusEra === '2020-2024'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Old (2019–2024)</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ syllabusEra: 'all' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  currentSyllabusEra === 'all'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>All Syllabi (2019–2026)</span>
              </button>
            </div>
          )}

          {/* Primary 2b: Sciences Pre-2023 Obsolete Toggle */}
          {!isMath && (
            <button
              type="button"
              onClick={() => onFilterChange({ hideObsolete: !hideObsoleteActive })}
              title="Toggle Pre-2023 deprecated science syllabus questions"
              className={`whitespace-nowrap shrink-0 h-8 px-3 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg border transition-all ${
                hideObsoleteActive
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
              }`}
            >
              {hideObsoleteActive ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Pre-2023 Hidden</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Showing Deprecated</span>
                </>
              )}
            </button>
          )}

          {/* Primary 3: Paper Component Multi-Select Dropdown */}
          <FilterMultiSelect
            labelSingular="Paper"
            labelPlural="Papers"
            icon={<Layers className={`w-3.5 h-3.5 shrink-0 ${isMath ? 'text-amber-600 dark:text-amber-400' : isPhysics ? 'text-indigo-600 dark:text-indigo-400' : 'text-cyan-600 dark:text-cyan-400'}`} />}
            options={componentOptions}
            selectedValues={filters.selectedUnits}
            onChange={(units) => onFilterChange({ selectedUnits: units })}
          />

          {/* Primary 4: Subtopic Multi-Select */}
          <SubtopicMultiSelect
            hierarchy={subtopicHierarchy}
            selectedSubtopics={filters.selectedSubtopics}
            onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
            questions={allQuestions}
          />

          {/* Primary 5: Science Question Type (All | MCQ | Theory) Segmented Switch */}
          {!isMath && (
            <div
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={getSubjectSpotlightStyle(isPhysics ? 'physics' : isBio ? 'biology' : 'chemistry', 180)}
              className="spotlight-surface h-8 flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-lg text-xs shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              <button
                type="button"
                onClick={() => onFilterChange({ questionType: 'all' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  filters.questionType === 'all'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ questionType: 'mcq' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  filters.questionType === 'mcq'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                MCQ
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ questionType: 'theory' })}
                className={`relative z-10 h-7 px-2.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  filters.questionType === 'theory'
                    ? activePillBtnClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Theory
              </button>
            </div>
          )}

          {/* Primary 6: Consolidated Filters Popover (Tier, Variant, Year, Series, Status) */}
          <div className="relative shrink-0" ref={secondaryPopoverRef}>
            <button
              type="button"
              onClick={() => setIsSecondaryPopoverOpen((prev) => !prev)}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={getSubjectSpotlightStyle(activeSubject, 180)}
              className={`spotlight-surface h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 whitespace-nowrap ${
                activeSecondaryCount > 0
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              }`}
              title="Consolidated filters: Tier, Variant, Year, Series, Status"
            >
              <SlidersHorizontal className="relative z-10 w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="relative z-10">Filters</span>
              {activeSecondaryCount > 0 && (
                <span className="relative z-10 font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white">
                  • {activeSecondaryCount}
                </span>
              )}
            </button>

            {/* Secondary Filters Popover Dropdown */}
            {isSecondaryPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] min-w-[260px] p-4 space-y-4 rounded-xl bg-[#0B0F19]/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.07]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Cambridge Filters</span>
                    {activeSecondaryCount > 0 && (
                      <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {activeSecondaryCount} active
                      </span>
                    )}
                  </div>
                  {activeSecondaryCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onFilterChange({ selectedYears: [], selectedSeries: [], selectedTier: 'extended', variant: 'all', statusFilter: 'all' })}
                      className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Tier Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Cambridge Tier</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                    {(['all', 'core', 'extended'] as const).map((t) => {
                      const label = t === 'all' ? 'All Tiers' : t === 'core' ? 'Core' : 'Extended';
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onFilterChange({ selectedTier: t, tier: t })}
                          className={`py-1.5 px-2 text-xs font-medium text-center truncate rounded-lg transition-all ${
                            currentTier === t
                              ? activePillBtnClass
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Paper Variant</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
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
                        className={`py-1.5 px-2 text-xs font-medium font-mono tabular-nums text-center truncate rounded-lg transition-all ${
                          currentVariant === v.value
                            ? activePillBtnClass
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Years Grid Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Exam Year</span>
                    </label>
                    {filters.selectedYears.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onFilterChange({ selectedYears: [] })}
                        className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
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
                          className={`w-full text-center py-1 text-xs font-mono tabular-nums rounded-md transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold shadow-sm'
                              : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08]'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Series / Season Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CalendarRange className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Series / Season</span>
                    </label>
                    {filters.selectedSeries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onFilterChange({ selectedSeries: [] })}
                        className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
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
                          className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold shadow-sm'
                              : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08]'
                          }`}
                        >
                          {opt.label} ({opt.count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Revision Status Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      <span>Revision Status</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {([
                      { value: 'all', label: 'All', dot: null },
                      { value: 'unattempted', label: 'Unattempted', dot: 'bg-slate-400 dark:bg-slate-500' },
                      { value: 'review', label: 'Review', dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' },
                      { value: 'mastered', label: 'Mastered', dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' },
                    ] as const).map((st) => {
                      const isSelected = filters.statusFilter === st.value;
                      return (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => onFilterChange({ statusFilter: st.value })}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold shadow-sm'
                              : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
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

            {/* 7. Question / Mark counter chip (h-8 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-mono) */}
            <div className="h-8 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-zinc-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap min-w-[80px]">
              <span className={`font-semibold whitespace-nowrap tabular-nums ${isMath ? 'text-amber-400' : isPhysics ? 'text-indigo-400' : 'text-cyan-400'}`}>
                {totalFiltered}
              </span>{' '}
              Qs
              <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
              <span className="font-semibold text-emerald-400 whitespace-nowrap tabular-nums">{totalMarks}</span> marks
            </div>

            {/* 8. Reset filter icon button (h-8 w-8) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                title="Reset All Filters"
                className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

        </div>

        {/* Right Zone: Mobile Filter Drawer Trigger (< 768px) & View mode controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile Filter Drawer Trigger (< 768px) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`md:hidden h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 whitespace-nowrap ${
              hasActiveFilters
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
            title="Filter Questions"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="md:hidden h-8 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-zinc-300 hidden sm:flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className={`font-semibold tabular-nums ${isMath ? 'text-amber-400' : isPhysics ? 'text-indigo-400' : 'text-cyan-400'}`}>
              {totalFiltered}
            </span>
            <span className="text-[10px] text-zinc-500">Qs</span>
          </div>

          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] h-8 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('question-only')}
              title="Question Only (Focus Mode - Hides Answers)"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${
                viewMode === 'question-only'
                  ? `${activePillBtnClass} shadow-sm`
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Question</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              title="Side-by-Side Split View"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${
                viewMode === 'split'
                  ? `${activePillBtnClass} shadow-sm`
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('ms-only')}
              title="Mark Scheme Only"
              className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${
                viewMode === 'ms-only'
                  ? `${activePillBtnClass} shadow-sm`
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Mark Scheme</span>
            </button>
          </div>

          {/* Authentication & User Profile (Hidden on Mobile/Tablet < 1024px where AppNavbar avatar handles profile) */}
          <div className="hidden lg:flex items-center shrink-0">
            {!user ? (
              <button
                type="button"
                onClick={openAuthModal}
                className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                title="Sign in to sync your progress"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="h-8 px-2 sm:px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate text-[11px] font-mono text-zinc-300 hidden lg:inline">
                    {user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-xl bg-[#0B0F19] border border-zinc-800 shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Signed in as</p>
                      <p className="text-xs font-medium text-zinc-200 truncate mt-0.5">{user.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange({ bookmarkedOnly: !filters.bookmarkedOnly });
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 transition-colors ${
                        filters.bookmarkedOnly
                          ? 'bg-amber-500/15 text-amber-300 font-semibold'
                          : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>My Bookmarks</span>
                      {filters.bookmarkedOnly && (
                        <span className="ml-auto text-[10px] text-amber-400 font-mono">Active</span>
                      )}
                    </button>

                    <div className="my-1 border-t border-zinc-800/80" />

                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* SLIDE-OVER FILTER DRAWER FOR MOBILE (< 768px)                         */}
      {/* ===================================================================== */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 dark:bg-black/70 backdrop-blur-sm md:hidden flex justify-end animate-in fade-in duration-150"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div 
            className="w-full sm:w-[26rem] h-full bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-750 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">Filter Questions</span>
                {hasActiveFilters && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-2 py-1 rounded"
                  >
                    Reset All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Account / Auth in Mobile Drawer */}
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {(user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <span className="text-xs text-zinc-300 truncate">{user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold ml-2 shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Sync progress & bookmarks</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        openAuthModal();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

              {/* Search Query */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Search Keywords
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search topic, question number, or keyword..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 0580 Syllabus Era Toggle (Mobile) */}
              {isMath && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    0580 Syllabus Transition Era
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-750 text-xs">
                    {[
                      { era: '2025-2028' as SyllabusEra, label: '2025–2028 (New)' },
                      { era: '2019-2024' as SyllabusEra, label: '2019–2024 (Old)' },
                      { era: 'all' as SyllabusEra, label: 'All Syllabi (2019–2026)' },
                    ].map(({ era, label }) => (
                      <button
                        key={era}
                        type="button"
                        onClick={() => onFilterChange({ syllabusEra: era })}
                        className={`py-2 rounded-lg font-bold transition-all text-center ${
                          currentSyllabusEra === era || (era === '2019-2024' && currentSyllabusEra === '2020-2024')
                            ? activePillBtnClass
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Science Obsolete Content Toggle (Mobile) */}
              {!isMath && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Pre-2023 Removed Syllabus Content
                  </label>
                  <button
                    type="button"
                    onClick={() => onFilterChange({ hideObsolete: !hideObsoleteActive })}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                      hideObsoleteActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                    }`}
                  >
                    <span>Hide Pre-2023 Obsolete Content</span>
                    <span className="font-bold">{hideObsoleteActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              )}

              {/* Tier Selector (Mobile) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Cambridge Tier
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-750 text-xs">
                  {(['all', 'core', 'extended'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onFilterChange({ selectedTier: t, tier: t })}
                      className={`py-2 rounded-lg font-bold capitalize transition-all ${
                        currentTier === t
                          ? activePillBtnClass
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {t === 'all' ? 'All' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Variant Selector (Mobile) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Paper Variant
                </label>
                <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-750 text-xs">
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
                      className={`py-2 rounded-lg font-bold font-mono tabular-nums transition-all ${
                        currentVariant === v.value
                          ? activePillBtnClass
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Component Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Paper Components
                </label>
                <FilterMultiSelect
                  labelSingular="Paper"
                  labelPlural="Papers"
                  icon={<Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                  options={componentOptions}
                  selectedValues={filters.selectedUnits}
                  onChange={(units) => onFilterChange({ selectedUnits: units })}
                />
              </div>

              {/* Subtopics Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Topic &amp; Subtopics
                </label>
                <SubtopicMultiSelect
                  hierarchy={subtopicHierarchy}
                  selectedSubtopics={filters.selectedSubtopics}
                  onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
                  questions={allQuestions}
                />
              </div>

              {/* Year & Series Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Exam Year
                  </label>
                  <FilterMultiSelect
                    labelSingular="Year"
                    labelPlural="Years"
                    icon={<Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                    options={yearOptions}
                    selectedValues={filters.selectedYears}
                    onChange={(years) => onFilterChange({ selectedYears: years })}
                    badgeFontMono
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Series / Season
                  </label>
                  <FilterMultiSelect
                    labelSingular="Series"
                    labelPlural="Series"
                    icon={<CalendarRange className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                    options={seriesOptions}
                    selectedValues={filters.selectedSeries}
                    onChange={(series) => onFilterChange({ selectedSeries: series })}
                    showSearch={false}
                  />
                </div>
              </div>

              {/* Question Type Filter - Hidden in Mathematics */}
              {!isMath && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Question Format
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-750 text-xs">
                    {(['all', 'mcq', 'theory'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onFilterChange({ questionType: t })}
                        className={`py-2 rounded-lg font-bold capitalize transition-all ${
                          filters.questionType === t
                            ? activePillBtnClass
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {t === 'all' ? 'All' : t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Revision Mastery Status
                </label>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-xl px-3 py-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                    filters.statusFilter === 'mastered' ? 'text-emerald-500 dark:text-emerald-400' :
                    filters.statusFilter === 'review' ? 'text-amber-500 dark:text-amber-400' :
                    filters.statusFilter === 'unattempted' ? 'text-slate-400 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400'
                  }`} />
                  <select
                    value={filters.statusFilter}
                    onChange={(e) => onFilterChange({ statusFilter: e.target.value as StatusFilter })}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full font-medium"
                  >
                    <option value="all" className="bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200">All Questions</option>
                    <option value="unattempted" className="bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400">⚪ Unattempted</option>
                    <option value="review" className="bg-white dark:bg-dark-900 text-amber-600 dark:text-amber-300">🟡 Review Needed</option>
                    <option value="mastered" className="bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-300">🟢 Mastered</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Metrics */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800/80 border border-slate-200 dark:border-dark-750 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Matching Pool:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{totalFiltered}</span> questions •{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{totalMarks}</span> marks
                </span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-dark-800 bg-white/90 dark:bg-dark-900/90 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
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
