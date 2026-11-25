import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bookmark, 
  FilterX,
  ChevronLeft, 
  ChevronRight,
  List,
  X,
  Calculator,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { QuestionItem, MasteryStatus, Subject } from '../types';
import { getQuestionType, getQuestionSubject, isCalculatorAllowed } from '../utils/questionClassification';
import { getCanonicalSubjectTheme } from '../utils/subjectTheme';

interface QuestionListProps {
  questions: QuestionItem[];
  selectedQuestionId: string | null;
  onSelectQuestion: (question: QuestionItem) => void;
  bookmarks: Set<string>;
  onToggleBookmark: (id: string) => void;
  questionStatuses: Record<string, MasteryStatus>;
  onCycleStatus: (id: string) => void;
  activeTab: 'all' | 'bookmarked';
  onTabChange: (tab: 'all' | 'bookmarked') => void;
  onClearFilters: () => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

export const cleanSubtopic = (title: string = ''): string => {
  return title.replace(/^(\d+(\.\d+)*(-\d+(\.\d+)*)?:\s*|topic\s+\d+:\s*)/i, '').trim();
};

/**
 * Parses Cambridge IGCSE metadata from a question or its ID:
 * Format: {subject}_{season}{yy}_{type}_{paper}{variant}_q{num}
 * Example: 0580_s25_qp_22_q04 -> Subject: 0580, Season: s25, Component: 0580/22, Tier: Extended
 */
export const getCambridgeMetadata = (q: QuestionItem) => {
  const qSubject = getQuestionSubject(q);
  const subjectCode = q.subject || (q.id ? q.id.split('_')[0] : '') || (qSubject === 'mathematics' ? '0580' : qSubject === 'physics' ? '0625' : qSubject === 'biology' ? '0610' : '0620');
  
  // Extract paper and variant
  let paperNum = q.paper;
  let variantNum = q.variant;
  let series = q.series;
  let year = q.year;

  if (q.id && (!paperNum || !variantNum || !series || !year)) {
    const parts = q.id.split('_');
    if (parts.length >= 4) {
      // parts[1] e.g. s25, w24, m26
      if (!series && parts[1]) series = parts[1][0];
      if (!year && parts[1] && parts[1].length >= 3) {
        const y2 = parseInt(parts[1].slice(1, 3), 10);
        if (!isNaN(y2)) year = 2000 + y2;
      }
      // parts[3] e.g. 22, 41, 12
      const pv = parts[3];
      if (pv && pv.length >= 2) {
        if (!paperNum) paperNum = parseInt(pv[0], 10);
        if (!variantNum) variantNum = parseInt(pv[1], 10);
      }
    }
  }

  // Paper label e.g. 0580/22, 0625/41
  const paperLabel = paperNum && variantNum ? `${subjectCode}/${paperNum}${variantNum}` : `${subjectCode} P${paperNum || ''}`;

  // Series tag e.g. s25, w24, m26
  const yrStr = year ? String(year).slice(-2) : '';
  const seriesTag = series ? `${series}${yrStr}` : (year ? String(year) : '');

  // Tier calculation
  let tier = q.tier;
  if (!tier && paperNum) {
    if (paperNum === 1 || paperNum === 3) tier = 'core';
    else if (paperNum === 2 || paperNum === 4) tier = 'extended';
    else if (paperNum === 5 || paperNum === 6) tier = 'practical';
  }

  // Calculator allowed
  const calcAllowed = isCalculatorAllowed(q);
  const isNonCalc = !calcAllowed;

  // Obsolete (Pre-cutoff syllabus removals)
  const isObsolete = Boolean(q.is_obsolete ?? q.obsolete);
  const obsoleteReason = q.obsolete_reason;

  return {
    subjectCode,
    paperNum,
    variantNum,
    paperLabel,
    seriesTag,
    series,
    year,
    tier,
    isNonCalc,
    calcAllowed,
    isObsolete,
    obsoleteReason,
  };
};

export const getStatusConfig = (status: MasteryStatus = 'unattempted') => {
  switch (status) {
    case 'mastered':
    case 'correct':
      return {
        label: status === 'correct' ? 'Correct' : 'Mastered',
        shortLabel: status === 'correct' ? 'Correct' : 'Mastered',
        bg: 'bg-[#F0FDF4] hover:bg-emerald-100/80 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-emerald-500/30',
        dot: 'bg-[#15803D] dark:bg-[#4ADE80]',
      };
    case 'review':
    case 'incorrect':
      return {
        label: status === 'incorrect' ? 'Incorrect' : 'Review Needed',
        shortLabel: status === 'incorrect' ? 'Incorrect' : 'Review',
        bg: 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
        dot: 'bg-amber-600 dark:bg-amber-400',
      };
    case 'unattempted':
    default:
      return {
        label: 'Unattempted',
        shortLabel: 'Unattempted',
        bg: 'bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] border-[var(--border-hairline)]',
        dot: 'bg-slate-400 dark:bg-slate-500',
      };
  }
};

export const SERIES_WEIGHT: Record<string, number> = {
  w: 3,
  oct: 3,
  'oct/nov': 3,
  november: 3,
  s: 2,
  jun: 2,
  'may/june': 2,
  m: 1,
  mar: 1,
  'feb/march': 1,
};

function getSeriesWeight(q: QuestionItem): number {
  const seriesKey = String(q.series || '').toLowerCase().trim();
  if (SERIES_WEIGHT[seriesKey]) return SERIES_WEIGHT[seriesKey];
  const sessionKey = String(q.session || '').toLowerCase().trim();
  if (SERIES_WEIGHT[sessionKey]) return SERIES_WEIGHT[sessionKey];
  return 0;
}

export function sortQuestionsLatestFirst(a: QuestionItem, b: QuestionItem): number {
  // 1. Sort by Year Descending (2026 -> 2025 -> 2024...)
  const yearA = Number(a.year) || 0;
  const yearB = Number(b.year) || 0;
  if (yearB !== yearA) return yearB - yearA;

  // 2. Sort by Series Chronological Descending (Winter/w -> Summer/s -> March/m)
  const weightA = getSeriesWeight(a);
  const weightB = getSeriesWeight(b);
  if (weightB !== weightA) return weightB - weightA;

  // 3. Sort by Paper Number Ascending (Paper 1 -> Paper 2 -> Paper 3 -> Paper 4 -> Paper 6)
  const metaA = getCambridgeMetadata(a);
  const metaB = getCambridgeMetadata(b);
  const paperCompare = (metaA.paperNum || 0) - (metaB.paperNum || 0);
  if (paperCompare !== 0) return paperCompare;

  // 4. Sort by Variant (e.g. 21 -> 22 -> 23)
  const variantCompare = (metaA.variantNum || 0) - (metaB.variantNum || 0);
  if (variantCompare !== 0) return variantCompare;

  // 5. Sort by Question Number Ascending (Q1 -> Q2 -> Q3...) and Subpart (a -> b -> c)
  const idA = a.id || '';
  const idB = b.id || '';
  const keyA = idA.split('_').pop() || '';
  const keyB = idB.split('_').pop() || '';
  const numA = parseInt(keyA.replace(/^q/i, ''), 10) || parseInt(String(a.questionNumber ?? a.question_number ?? '0'), 10);
  const numB = parseInt(keyB.replace(/^q/i, ''), 10) || parseInt(String(b.questionNumber ?? b.question_number ?? '0'), 10);
  if (numA !== numB) {
    return numA - numB;
  }
  return keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
}

export function formatQuestionNumber(q: QuestionItem | null | undefined): string {
  if (!q) return '01';
  const idSuffix = q.id ? q.id.split('_').pop()?.replace(/^q/i, '') : '';
  const match = idSuffix?.match(/^(\d+)([a-z])?$/i);
  const subpart = q.subpart ?? q.subPart ?? (match ? match[2] : null);

  if (match) {
    const num = parseInt(match[1], 10);
    const numStr = !isNaN(num) && num < 10 ? `0${num}` : (match[1] || '01');
    const partStr = subpart ? `(${String(subpart).toLowerCase()})` : '';
    return `${numStr}${partStr}`;
  }

  const raw = q.question_number ?? q.questionNumber ?? q.number ?? q.q_num ?? idSuffix ?? '1';
  const rawStr = String(raw).trim();
  const rawMatch = rawStr.match(/^(\d+)(?:\s*\(([a-z])\)|\s*([a-z]))?$/i);
  if (rawMatch) {
    const num = parseInt(rawMatch[1], 10);
    const numStr = !isNaN(num) && num < 10 ? `0${num}` : `${num}`;
    const p = rawMatch[2] || rawMatch[3] || subpart;
    const partStr = p ? `(${String(p).toLowerCase()})` : '';
    return `${numStr}${partStr}`;
  }
  return rawStr;
}

const PAGE_SIZE = 25;

function getPaginationItems(current: number, total: number): (number | '...')[] {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  bookmarks,
  onToggleBookmark,
  questionStatuses,
  onCycleStatus,
  activeTab,
  onTabChange,
  onClearFilters,
  isDrawerOpen = false,
  onCloseDrawer
}) => {
  const sortedQuestions = useMemo(() => {
    return [...questions].sort(sortQuestionsLatestFirst);
  }, [questions]);

  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (selectedQuestionId && sortedQuestions.length > 0) {
      const idx = sortedQuestions.findIndex((q) => q.id === selectedQuestionId);
      if (idx !== -1) return Math.floor(idx / PAGE_SIZE) + 1;
    }
    return 1;
  });
  const listRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef<'all' | 'bookmarked'>(activeTab);

  const totalPages = Math.max(1, Math.ceil(sortedQuestions.length / PAGE_SIZE));

  // Sync currentPage when active question or sorted filtered list changes (including initial reload hydration)
  useEffect(() => {
    if (!selectedQuestionId || sortedQuestions.length === 0) return;
    const idx = sortedQuestions.findIndex((q) => q.id === selectedQuestionId);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
      setCurrentPage(targetPage);
    }
  }, [selectedQuestionId, sortedQuestions]);

  // Scroll the active question card into view when active question or page changes
  useEffect(() => {
    if (!selectedQuestionId || !listRef.current) return;
    const raf = requestAnimationFrame(() => {
      const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(selectedQuestionId) : selectedQuestionId;
      const activeEl = listRef.current?.querySelector<HTMLElement>(`[data-question-id="${safeId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedQuestionId, currentPage, sortedQuestions.length]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 only when switching tabs (not on initial mount)
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      setCurrentPage(1);
    }
  }, [activeTab]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedQuestions = useMemo(() => {
    return sortedQuestions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedQuestions, startIndex]);

  const listSubject: Subject = useMemo(() => getQuestionSubject(sortedQuestions[0]), [sortedQuestions]);
  const listSubjectTheme = getCanonicalSubjectTheme(listSubject);

  // Keyboard shortcuts: 'j'/'ArrowDown' = next, 'k'/'ArrowUp' = prev
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (sortedQuestions.length === 0) return;

      const currentIdx = sortedQuestions.findIndex((q) => q.id === selectedQuestionId);

      if (e.key === 'j' || e.key === 'J' || (e.key === 'ArrowDown' && e.altKey)) {
        e.preventDefault();
        const nextIdx = currentIdx < sortedQuestions.length - 1 ? currentIdx + 1 : 0;
        onSelectQuestion(sortedQuestions[nextIdx]);
      } else if (e.key === 'k' || e.key === 'K' || (e.key === 'ArrowUp' && e.altKey)) {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : sortedQuestions.length - 1;
        onSelectQuestion(sortedQuestions[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedQuestions, selectedQuestionId, onSelectQuestion]);

  return (
    <>
      {/* Mobile/Tablet Backdrop (< 1024px) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onCloseDrawer}
        />
      )}

      {/* Question List Sidebar */}
      <aside
        className={`
          border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col w-72 2xl:w-80 shrink-0 flex-none select-none overflow-hidden transition-transform duration-200
          fixed inset-y-0 left-0 z-40 max-w-[88vw] lg:shadow-none
          lg:static lg:w-72 2xl:w-80 lg:z-auto lg:translate-x-0
          ${isDrawerOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        {/* Mobile/Tablet Drawer Header (< 1024px) */}
        <div className="h-12 px-3 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <List className={`w-4 h-4 ${listSubjectTheme.textClass}`} />
            <span className="font-bold text-xs text-[var(--ink-primary)]">Question Navigator</span>
            <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border ${listSubjectTheme.badgeClass}`}>
              {questions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Tabs: All Questions vs Bookmarked */}
        <div className="p-2 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors border ${
              activeTab === 'all'
                ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] border-transparent'
            }`}
          >
            <span>All Questions</span>
            <span
              className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                activeTab === 'all'
                  ? 'bg-white/15 dark:bg-slate-900/15 text-current'
                  : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)]'
              }`}
            >
              {activeTab === 'all' ? questions.length : 'All'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('bookmarked')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors border ${
              activeTab === 'bookmarked'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/35'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] border-transparent'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarks.size > 0 ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>Bookmarked</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--ink-secondary)]">
              {bookmarks.size}
            </span>
          </button>
        </div>

        {/* Scrollable Questions List Container */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1.5 bg-[var(--bg-inset)]"
        >
          {paginatedQuestions.length === 0 ? (
            activeTab === 'bookmarked' ? (
              <div className="p-8 text-center text-[var(--ink-muted)]">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[var(--ink-primary)]">No bookmarks yet</p>
                <p className="text-[11px] text-[var(--ink-muted)] mt-1">Press [B] or click the bookmark icon on any question to save it for review.</p>
              </div>
            ) : (
              <div className="p-8 text-center text-[var(--ink-muted)]">
                <FilterX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[var(--ink-primary)]">No questions match your filters</p>
                <p className="text-[11px] text-[var(--ink-muted)] mt-1 mb-3">Try adjusting syllabus era, paper component, or subtopics.</p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-1.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--ink-primary)] border border-[var(--border-hairline)] transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )
          ) : (
            paginatedQuestions.map((q) => {
              const isSelected = q.id === selectedQuestionId;
              const isBookmarked = bookmarks.has(q.id);
              const status = questionStatuses[q.id] || 'unattempted';
              const statusCfg = getStatusConfig(status);
              const qType = getQuestionType(q);
              const qSubject = getQuestionSubject(q);
              const qTheme = getCanonicalSubjectTheme(qSubject);
              const meta = getCambridgeMetadata(q);
              const isMath = qSubject === 'mathematics';

              const marks = q.marks ?? q.total_marks ?? 1;
              const rawSubtopic = q.subtopic || q.topic || '';
              const cleanedSubtopic = cleanSubtopic(rawSubtopic);
              const qNumDisplay = formatQuestionNumber(q);

              return (
                <div
                  key={q.id}
                  data-question-id={q.id}
                  onClick={() => {
                    onSelectQuestion(q);
                    if (onCloseDrawer) {
                      onCloseDrawer();
                    }
                  }}
                  className={`group relative min-w-0 overflow-hidden rounded-lg py-2.5 px-3 cursor-pointer transition-colors border-y border-r border-l-[3px] ${
                    isSelected
                      ? `${qTheme.selectedCardClass} text-[var(--ink-primary)]`
                      : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] border-l-transparent hover:bg-[var(--bg-subtle)] hover:border-l-[var(--border-strong)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {/* Top Row: Q Number, Mark Badge, Type Pill, Calc Pill, Bookmark Action */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={`font-mono tabular-nums font-bold text-sm tracking-tight ${isSelected ? qTheme.textClass : 'text-[var(--ink-primary)]'}`}>
                        Q{qNumDisplay}
                      </span>

                      <span className="font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
                        {marks}m
                      </span>

                      {isMath && (
                        meta.isNonCalc ? (
                          <span
                            title="2025+ Non-Calculator Paper (Paper 1 & Paper 2)"
                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                          >
                            <Ban className="w-2.5 h-2.5" />
                            Non-Calc
                          </span>
                        ) : (
                          <span
                            title="Calculator Allowed Paper"
                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F0FDF4] dark:bg-emerald-500/15 text-[#15803D] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-emerald-500/30"
                          >
                            <Calculator className="w-2.5 h-2.5" />
                            Calc
                          </span>
                        )
                      )}

                      {!isMath && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            qType === 'mcq'
                              ? 'bg-[#FAF5FF] dark:bg-purple-500/15 text-[#7E22CE] dark:text-[#C084FC] border-[#E9D5FF] dark:border-purple-400/35'
                              : 'bg-[#EFF6FF] dark:bg-blue-500/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#BFDBFE] dark:border-blue-400/35'
                          }`}
                        >
                          {qType === 'mcq' ? 'MCQ' : 'Theory'}
                        </span>
                      )}

                      {meta.tier && (
                        <span className="text-[9px] font-semibold capitalize px-1.5 py-0.5 rounded border bg-[var(--bg-inset)] text-[var(--ink-muted)] border-[var(--border-hairline)]">
                          {meta.tier}
                        </span>
                      )}

                      {meta.isObsolete && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0"
                          title={q.obsolete_reason || meta.obsoleteReason || 'Tests content removed in official Cambridge syllabus revisions'}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          <span>Obsolete</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(q.id);
                        }}
                        title={isBookmarked ? 'Remove bookmark [B]' : 'Bookmark question [B]'}
                        className={`p-1 rounded hover:bg-[var(--bg-inset)] transition-colors ${
                          isBookmarked ? 'text-amber-500' : 'text-[var(--ink-caption)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row: Cambridge Component and Series Tag */}
                  <div className="text-[11px] tabular-nums text-[var(--ink-muted)] font-medium mt-1 flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-[var(--ink-primary)]">
                      {meta.paperLabel}
                    </span>
                    <span>·</span>
                    <span className="font-mono">
                      {meta.seriesTag}
                    </span>
                    {meta.year && (
                      <span className="text-[10px] text-[var(--ink-caption)]">
                        ({meta.year})
                      </span>
                    )}
                  </div>

                  {/* Subtopic Title */}
                  <div
                    className={`mt-1 transition-colors ${
                      isSelected
                        ? `text-xs font-medium line-clamp-2 ${qTheme.textClass}`
                        : 'text-[11px] text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] truncate'
                    }`}
                    title={rawSubtopic}
                  >
                    {isSelected ? rawSubtopic : (cleanedSubtopic || rawSubtopic)}
                  </div>

                  {/* Bottom Row: Status Pill */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-hairline)] text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCycleStatus(q.id);
                      }}
                      title={`Status: ${statusCfg.label}. Click to cycle: Unattempted -> Review Needed -> Mastered`}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium border transition-colors ${statusCfg.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </button>

                    {isSelected && (
                      <span className="text-[9px] font-mono text-[var(--ink-caption)] hidden sm:inline">
                        <kbd className="kbd-keycap">J</kbd>/<kbd className="kbd-keycap">K</kbd> nav
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {questions.length > 0 && (
          <div className="p-2 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center justify-between w-full px-1 text-[11px] tabular-nums text-[var(--ink-muted)]">
              <span>
                Showing <span className="font-mono tabular-nums font-semibold text-[var(--ink-primary)]">{startIndex + 1}</span>–<span className="font-mono tabular-nums font-semibold text-[var(--ink-primary)]">{Math.min(startIndex + PAGE_SIZE, questions.length)}</span> of <span className="font-mono tabular-nums font-semibold text-[var(--ink-primary)]">{questions.length}</span>
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[var(--ink-caption)]">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 w-full">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                  currentPage <= 1
                    ? 'text-[var(--ink-caption)] cursor-not-allowed opacity-40'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)]'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-5 text-center text-[var(--ink-caption)] text-xs select-none">
                      ...
                    </span>
                  );
                }

                const isCurrent = item === currentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-md text-xs font-mono tabular-nums font-semibold transition-colors border ${
                      isCurrent
                        ? `${listSubjectTheme.badgeClass} font-bold`
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] border-transparent'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                  currentPage >= totalPages
                    ? 'text-[var(--ink-caption)] cursor-not-allowed opacity-40'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)]'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default QuestionList;
