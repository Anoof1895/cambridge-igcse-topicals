import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bookmark, 
  FilterX,
  ChevronLeft, 
  ChevronRight,
  List,
  X,
  AlertTriangle,
  Calculator,
  Ban
} from 'lucide-react';
import { QuestionItem, MasteryStatus, Subject } from '../types';
import { getQuestionType, getQuestionSubject, isCalculatorAllowed } from '../utils/questionClassification';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';

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

  // Obsolete (Pre-2023 Sciences / Pre-2020 Math)
  const isObsolete = Boolean(q.obsolete);
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
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      };
    case 'review':
    case 'incorrect':
      return {
        label: status === 'incorrect' ? 'Incorrect' : 'Review Needed',
        shortLabel: status === 'incorrect' ? 'Incorrect' : 'Review',
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      };
    case 'unattempted':
    default:
      return {
        label: 'Unattempted',
        shortLabel: 'Unattempted',
        bg: 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-400 dark:border-white/[0.08]',
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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const listRef = useRef<HTMLDivElement>(null);
  const prevSelectedIdRef = useRef<string | null>(selectedQuestionId);
  const firstQuestionId = sortedQuestions[0]?.id;
  const prevFirstIdRef = useRef<string | undefined>(firstQuestionId);

  const totalPages = Math.max(1, Math.ceil(sortedQuestions.length / PAGE_SIZE));

  // Sync currentPage when active question changes
  useEffect(() => {
    if (selectedQuestionId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedQuestionId;
      if (selectedQuestionId) {
        const idx = sortedQuestions.findIndex((q) => q.id === selectedQuestionId);
        if (idx !== -1) {
          const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedQuestionId, sortedQuestions]);

  // Handle filter changes
  useEffect(() => {
    if (firstQuestionId !== prevFirstIdRef.current) {
      prevFirstIdRef.current = firstQuestionId;
      if (selectedQuestionId) {
        const idx = sortedQuestions.findIndex((q) => q.id === selectedQuestionId);
        if (idx !== -1) {
          setCurrentPage(Math.floor(idx / PAGE_SIZE) + 1);
          return;
        }
      }
      setCurrentPage(1);
    }
  }, [firstQuestionId, selectedQuestionId, sortedQuestions]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setCurrentPage(1);
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

  // Linear / Raycast keyboard shortcuts: 'j'/'ArrowDown' = next, 'k'/'ArrowUp' = prev
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
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-150"
          onClick={onCloseDrawer}
        />
      )}

      {/* Question List Sidebar */}
      <aside 
        className={`
          border-r border-slate-200 dark:border-white/[0.07] bg-white/95 lg:bg-slate-50/70 dark:bg-[#07090D]/95 lg:dark:bg-[#07090D]/75 backdrop-blur-xl flex flex-col shrink-0 select-none overflow-hidden transition-transform duration-200
          fixed inset-y-0 left-0 z-40 w-84 max-w-[88vw] shadow-2xl lg:shadow-none
          lg:static lg:w-84 lg:z-auto lg:translate-x-0
          ${isDrawerOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        {/* Mobile/Tablet Drawer Header (< 1024px) */}
        <div className="h-12 px-3 border-b border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#07090D] flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="font-bold text-xs text-slate-800 dark:text-white">Question Navigator</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-amber-700 dark:text-amber-300">
              {questions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Tabs: All Questions vs Bookmarked */}
        <div
          style={getSubjectSpotlightStyle(listSubject, 220)}
          className="p-2 border-b border-slate-200 dark:border-white/[0.07] bg-white/80 dark:bg-[#07090D]/80 backdrop-blur-md flex items-center gap-1.5 shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <button
            type="button"
            onClick={() => onTabChange('all')}
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            className={`spotlight-surface flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-slate-200 dark:border-white/12'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
            }`}
          >
            <span className="relative z-10">All Questions</span>
            <span className="relative z-10 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.07] text-slate-700 dark:text-slate-300">
              {activeTab === 'all' ? questions.length : 'All'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('bookmarked')}
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle('amber', 200)}
            className={`spotlight-surface flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bookmarked'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-amber-300 dark:border-amber-500/30'
                : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Bookmark className={`relative z-10 w-3.5 h-3.5 ${bookmarks.size > 0 ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span className="relative z-10">Bookmarked</span>
            <span className="relative z-10 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
              {bookmarks.size}
            </span>
          </button>
        </div>

        {/* Scrollable Questions List Container */}
        <div 
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1.5"
        >
          {paginatedQuestions.length === 0 ? (
            activeTab === 'bookmarked' ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No bookmarks yet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1">Press [B] or click the bookmark icon on any question to save it for review.</p>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <FilterX className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No questions match your filters</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1 mb-3">Try adjusting syllabus era, paper component, or subtopics.</p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-white/10 transition-colors"
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
              const meta = getCambridgeMetadata(q);
              const isMath = qSubject === 'mathematics';
              const isPhysics = qSubject === 'physics';
              const isBio = qSubject === 'biology';

              const marks = q.marks ?? q.total_marks ?? 1;
              const rawSubtopic = q.subtopic || q.topic || '';
              const cleanedSubtopic = cleanSubtopic(rawSubtopic);
              const qNumDisplay = formatQuestionNumber(q);

              // Reactive accent card styling
              const selectedCardAccent = isMath
                ? 'bg-amber-50/70 dark:bg-[#16130D] border-y-amber-300/80 dark:border-y-white/10 border-r-amber-300/80 dark:border-r-white/10 border-l-amber-500 dark:border-l-amber-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-amber-500/20 dark:ring-amber-400/20'
                : isPhysics
                ? 'bg-indigo-50/70 dark:bg-[#0D111A] border-y-indigo-300/80 dark:border-y-white/10 border-r-indigo-300/80 dark:border-r-white/10 border-l-indigo-500 dark:border-l-indigo-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-indigo-500/20 dark:ring-indigo-400/20'
                : isBio
                ? 'bg-emerald-50/70 dark:bg-[#0A1612] border-y-emerald-300/80 dark:border-y-white/10 border-r-emerald-300/80 dark:border-r-white/10 border-l-emerald-500 dark:border-l-emerald-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-emerald-500/20 dark:ring-emerald-400/20'
                : 'bg-cyan-50/70 dark:bg-[#0A141A] border-y-cyan-300/80 dark:border-y-white/10 border-r-cyan-300/80 dark:border-r-white/10 border-l-cyan-500 dark:border-l-cyan-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-cyan-500/20 dark:ring-cyan-400/20';

              const selectedSubtopicText = isMath
                ? 'text-xs text-amber-800 dark:text-amber-300 font-medium line-clamp-2'
                : isPhysics
                ? 'text-xs text-indigo-800 dark:text-indigo-300 font-medium line-clamp-2'
                : isBio
                ? 'text-xs text-emerald-800 dark:text-emerald-300 font-medium line-clamp-2'
                : 'text-xs text-cyan-800 dark:text-cyan-300 font-medium line-clamp-2';

              return (
                <div
                  key={q.id}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  style={getSubjectSpotlightStyle(qSubject, 280)}
                  onClick={() => {
                    onSelectQuestion(q);
                    if (onCloseDrawer) {
                      onCloseDrawer();
                    }
                  }}
                  className={`spotlight-surface group relative rounded-xl py-2.5 px-3.5 cursor-pointer transition-all duration-150 border-y border-r border-l-4 ${
                    isSelected
                      ? `${selectedCardAccent} text-slate-900 dark:text-white`
                      : 'bg-white dark:bg-[#0B0E16]/70 border-slate-200/80 dark:border-white/[0.06] border-l-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/10 hover:border-l-slate-400 dark:hover:border-l-slate-600 text-slate-700 dark:text-slate-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  }`}
                >
                  {/* Top Row: Q Number, Mark Badge, Type Pill, Calc Pill, Bookmark Action */}
                  <div className="relative z-10 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Prominent Question Number */}
                      <span className={`font-mono tabular-nums font-bold text-sm tracking-tight ${isSelected ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-300'}`}>
                        Q{qNumDisplay}
                      </span>

                      {/* Marks Badge */}
                      <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
                        {marks}m
                      </span>

                      {/* 0580 Non-Calc / Calc Badging */}
                      {isMath && (
                        meta.isNonCalc ? (
                          <span 
                            title="2025+ Non-Calculator Paper (Paper 1 & Paper 2)"
                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                          >
                            <Ban className="w-2.5 h-2.5 text-rose-500" />
                            Non-Calc
                          </span>
                        ) : (
                          <span 
                            title="Calculator Allowed Paper"
                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          >
                            <Calculator className="w-2.5 h-2.5 text-emerald-500" />
                            Calc
                          </span>
                        )
                      )}

                      {/* Science Question Type Pill (MCQ vs Theory) */}
                      {!isMath && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            qType === 'mcq'
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {qType === 'mcq' ? 'MCQ' : 'Theory'}
                        </span>
                      )}

                      {/* Tier Badge (Core / Extended / Practical) */}
                      {meta.tier && (
                        <span className={`text-[9px] font-semibold capitalize px-1.5 py-0.5 rounded border ${
                          meta.tier === 'extended'
                            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                            : meta.tier === 'core'
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                            : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                        }`}>
                          {meta.tier}
                        </span>
                      )}

                      {/* Pre-2023 Obsolete Topic Badge for Sciences / Pre-2020 Math */}
                      {meta.isObsolete && (
                        <span 
                          title={q.obsolete_reason || meta.obsoleteReason || "Tests content removed in official Cambridge syllabus revisions"}
                          className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                          Pre-2023 Deprecated
                        </span>
                      )}
                    </div>

                    {/* Bookmark Action */}
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(q.id);
                        }}
                        title={isBookmarked ? "Remove bookmark [B]" : "Bookmark question [B]"}
                        className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors ${
                          isBookmarked ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row: Cambridge Component and Series Tag (e.g. 0580/22 · s25 or 0625/41 · w24) */}
                  <div className="relative z-10 text-[11px] tabular-nums text-slate-600 dark:text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {meta.paperLabel}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {meta.seriesTag}
                    </span>
                    {meta.year && (
                      <span className="text-[10px] text-slate-400">
                        ({meta.year})
                      </span>
                    )}
                  </div>

                  {/* Subtopic Title */}
                  <div 
                    className={`relative z-10 mt-1 transition-colors ${
                      isSelected 
                        ? selectedSubtopicText
                        : 'text-[11px] text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 truncate'
                    }`}
                    title={rawSubtopic}
                  >
                    {isSelected ? rawSubtopic : (cleanedSubtopic || rawSubtopic)}
                  </div>

                  {/* Bottom Row: Status Pill */}
                  <div className="relative z-10 flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.06] text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCycleStatus(q.id);
                      }}
                      title={`Status: ${statusCfg.label}. Click to cycle: Unattempted → Review Needed → Mastered`}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium border transition-all active:scale-95 ${statusCfg.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </button>
                    
                    {/* Keyboard navigation helper on selected card */}
                    {isSelected && (
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                        <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10">J</kbd>/<kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10">K</kbd> to nav
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
          <div
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle(listSubject, 280)}
            className="spotlight-surface p-2 border-t border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#07090D]/95 backdrop-blur-xl flex flex-col items-center gap-1.5 shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          >
            <div className="relative z-10 flex items-center justify-between w-full px-1 text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
              <span>
                Showing <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</span>–<span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{Math.min(startIndex + PAGE_SIZE, questions.length)}</span> of <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{questions.length}</span>
              </span>
              <span className="text-[10px] font-mono tabular-nums text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-1 w-full">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  currentPage <= 1
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-5 text-center text-slate-400 dark:text-slate-500 text-xs select-none">
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
                    className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-mono tabular-nums font-semibold transition-all ${
                      isCurrent
                        ? listSubject === 'mathematics'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-bold'
                          : listSubject === 'physics'
                          ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 dark:border-indigo-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-bold'
                          : listSubject === 'biology'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-bold'
                          : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 dark:border-cyan-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent'
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
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  currentPage >= totalPages
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95'
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
