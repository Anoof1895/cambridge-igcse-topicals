import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Paperclip, 
  Eye, 
  EyeOff, 
  Bookmark, 
  FileText, 
  X, 
  ExternalLink, 
  List, 
  CheckCircle2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { QuestionItem, ViewMode, MasteryStatus } from '../types';
import { ImageCanvas } from './ImageCanvas';
import { getStatusConfig, getCambridgeMetadata, formatQuestionNumber } from './QuestionList';
import { getQuestionType, getQuestionSubject } from '../utils/questionClassification';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';
import { useProgress } from '../context/ProgressContext';
import { useTheme } from '../context/ThemeContext';
import { usePrefetchQuestions } from '../hooks/usePrefetchQuestions';
import { getCanonicalSubjectTheme } from '../utils/subjectTheme';

interface SplitViewerProps {
  question: QuestionItem | null;
  prevQuestion?: QuestionItem | null;
  nextQuestion?: QuestionItem | null;
  allQuestions?: QuestionItem[];
  questions?: QuestionItem[];
  onSelectQuestionById?: (id: string) => void;
  viewMode: ViewMode;
  onToggleMarkScheme: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalQuestions: number;
  questionStatus: MasteryStatus;
  onCycleStatus: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpenQuestionList?: () => void;
}

export const SplitViewer: React.FC<SplitViewerProps> = ({
  question,
  prevQuestion,
  nextQuestion,
  allQuestions,
  questions,
  onSelectQuestionById,
  viewMode,
  onToggleMarkScheme,
  onSetViewMode,
  onPrevQuestion,
  onNextQuestion,
  hasPrev,
  hasNext,
  currentIndex,
  totalQuestions,
  questionStatus,
  onCycleStatus,
  isBookmarked,
  onToggleBookmark,
  onOpenQuestionList,
}) => {
  const { userAnswers, setMcqAnswer } = useProgress();
  const { isDarkPaperActive } = useTheme();
  const [isFullQuestionOpen, setIsFullQuestionOpen] = useState(false);
  // Mobile specific view tab: 'question' | 'ms'
  const [mobileTab, setMobileTab] = useState<'question' | 'ms'>('question');
  // Student's interactive selection for MCQ items
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);

  // Non-spoiling practice mode state
  const [mcqAttempts, setMcqAttempts] = useState<number>(0);
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Reset mobile view tab to 'question' & reset attempts ONLY when navigating to a new question
  useEffect(() => {
    setMobileTab('question');
    setMcqAttempts(0);
    setWrongOptions([]);
    setIsShaking(false);
  }, [question?.id]);

  // Sync MCQ selection when question or userAnswers update
  useEffect(() => {
    setSelectedMcqOption(question?.id ? userAnswers[question.id] || null : null);
  }, [question?.id, userAnswers]);

  // Sibling subparts belonging to this question's parent in the same paper
  const siblingSubparts = useMemo(() => {
    if (!question || !allQuestions) return [];
    const pq = question.parentQuestion;
    const pqId = question.parent_question_id;
    return allQuestions
      .filter((q) => {
        const samePaper = q.paperId
          ? q.paperId === question.paperId
          : q.unitCode === question.unitCode &&
            q.year === question.year &&
            q.session === question.session;
        const sameParent =
          (pq && q.parentQuestion === pq) ||
          (pqId && q.parent_question_id === pqId);
        return samePaper && sameParent;
      })
      .sort((a, b) =>
        (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
  }, [question, allQuestions]);

  const activeSubject = getQuestionSubject(question);
  const subjectTheme = getCanonicalSubjectTheme(activeSubject);

  // Adaptive background prefetching: sliding window (2 backward, 5 forward)
  const prefetchPool = useMemo(() => {
    if (questions && questions.length > 0) return questions;
    if (allQuestions && allQuestions.length > 0) return allQuestions;
    return [prevQuestion, question, nextQuestion].filter(Boolean) as QuestionItem[];
  }, [questions, allQuestions, prevQuestion, question, nextQuestion]);

  usePrefetchQuestions(prefetchPool, currentIndex, activeSubject);
  const isMath = activeSubject === 'mathematics';
  const qType = question ? getQuestionType(question) : 'theory';

  const mcqAnswer = question
    ? question.answer ||
      question.correct_answer ||
      question.correctAnswer ||
      question.key
    : null;

  const isMcq = Boolean(question && !isMath && (qType === 'mcq' || !!mcqAnswer));
  const normalizedKey = mcqAnswer ? String(mcqAnswer).trim().toUpperCase() : '';

  const meta = useMemo(() => {
    return question ? getCambridgeMetadata(question) : null;
  }, [question]);

  const qNumDisplay = useMemo(() => {
    if (!question) return '1';
    return formatQuestionNumber(question);
  }, [question]);

  const displayQNum = qNumDisplay;

  const handleMcqSelect = useCallback(
    (opt: string) => {
      if (!question) return;
      setSelectedMcqOption(opt);
      const isCorrect = normalizedKey ? opt.toUpperCase() === normalizedKey.toUpperCase() : undefined;
      
      if (isCorrect) {
        setMcqAnswer(question.id, opt, true);
      } else if (isCorrect === false) {
        setMcqAttempts((prev) => prev + 1);
        setWrongOptions((prev) => (prev.includes(opt) ? prev : [...prev, opt]));
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 450);
        setMcqAnswer(question.id, opt, false);
      } else {
        setMcqAnswer(question.id, opt, undefined);
      }
    },
    [question, normalizedKey, setMcqAnswer]
  );

  const handleResetMcq = useCallback(() => {
    setSelectedMcqOption(null);
    setWrongOptions([]);
    setMcqAttempts(0);
    setIsShaking(false);
    if (question) {
      setMcqAnswer(question.id, '', undefined);
    }
  }, [question, setMcqAnswer]);

  const isMcqAnsweredCorrectly = Boolean(
    selectedMcqOption !== null && normalizedKey && selectedMcqOption === normalizedKey
  );

  // Desktop keyboard shortcuts A-D (and 1-4) for Chemistry & Physics MCQs
  useEffect(() => {
    if (!question || !isMcq || isMath || isFullQuestionOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isMcqAnsweredCorrectly) return;
      // Do not fire when an overlay/modal/drawer is open
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tag = activeEl.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          tag === 'A' ||
          activeEl.isContentEditable ||
          activeEl.closest('[role="button"]')
        ) {
          return;
        }
      }

      const key = e.key.toUpperCase();
      const keyMap: Record<string, string> = {
        A: 'A',
        B: 'B',
        C: 'C',
        D: 'D',
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
      };
      const chosen = keyMap[key];
      if (chosen) {
        e.preventDefault();
        handleMcqSelect(chosen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, isMcq, isMath, isFullQuestionOpen, isMcqAnsweredCorrectly, handleMcqSelect]);

  if (!question) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--bg-paper)] text-[var(--ink-muted)]">
        <div className="text-center p-8">
          <p className="text-sm font-medium">Select a question from the left list to begin</p>
        </div>
      </main>
    );
  }

  const isMarkSchemeVisible = viewMode === 'split' || viewMode === 'ms-only';
  const statusCfg = getStatusConfig(questionStatus);

  const questionImagePath = question ? resolveQuestionImageUrl(question, activeSubject) : '';
  const markSchemePath = question ? resolveMarkSchemeImageUrl(question, activeSubject) : null;

  const isMcqAnswerRevealed = isMarkSchemeVisible || mobileTab === 'ms' || isMcqAnsweredCorrectly;

  const subjectQBadgeClass = subjectTheme.badgeClass;
  const subjectUnitTextClass = subjectTheme.textClass;

  return (
    <main className="flex-1 h-full min-h-0 w-full flex flex-col bg-[var(--bg-paper)] overflow-hidden select-none relative transition-colors">
      {/* ACTIVE QUESTION TOP HEADER */}
      <div className="h-11 px-2.5 sm:px-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 select-none">
        {/* Left: Question Navigator Trigger (on mobile/tablet) & Metadata */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          <button
            type="button"
            onClick={onOpenQuestionList}
            className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-primary)] text-xs font-semibold shrink-0 transition-colors"
            title="Open Question List"
          >
            <List className={`w-3.5 h-3.5 ${subjectUnitTextClass}`} />
            <span className="font-mono tabular-nums font-bold">
              Q{qNumDisplay}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-[var(--ink-muted)] hidden sm:inline">
              ({currentIndex + 1}/{totalQuestions})
            </span>
          </button>

          {/* Cambridge Question ID Badge (shown on desktop >= 1024px) */}
          <span className={`hidden lg:inline-flex font-mono tabular-nums font-bold text-xs tracking-tight px-2 py-0.5 rounded border shrink-0 ${subjectQBadgeClass}`}>
            {meta?.paperLabel ? `${meta.paperLabel} · ${meta.seriesTag} · Q${qNumDisplay}` : `Q${qNumDisplay}`}
          </span>

          {/* Calculator Pill */}
          {meta && (
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold border shrink-0 transition-colors ${
                meta.isNonCalc
                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              }`}
              title={meta.isNonCalc ? 'Non-Calculator Paper (Cambridge 0580 P1 & P2 2025+)' : 'Calculator Permitted'}
            >
              {meta.isNonCalc ? 'Non-Calc' : 'Calc'}
            </span>
          )}

          {/* Tier Badge */}
          {meta?.tier && (
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] shrink-0 capitalize">
              {meta.tier}
            </span>
          )}

          {/* Marks Badge */}
          <span className="font-mono tabular-nums px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-primary)] text-xs font-semibold shrink-0">
            {question.marks ?? question.total_marks ?? 1}m
          </span>

          {/* Question Type Badge (Omitted for Mathematics) */}
          {!isMath && (
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                qType === 'mcq'
                  ? 'bg-[#FAF5FF] dark:bg-purple-500/15 text-[#7E22CE] dark:text-[#C084FC] border-[#E9D5FF] dark:border-purple-400/35'
                  : 'bg-[#EFF6FF] dark:bg-blue-500/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#BFDBFE] dark:border-blue-400/35'
              }`}
            >
              {qType === 'mcq' ? 'MCQ' : 'Theory'}
            </span>
          )}

          {/* Obsolete Syllabus Removal Notice */}
          {meta?.isObsolete && (
            <span
              title={question.obsolete_reason || meta?.obsoleteReason || 'Tests content removed in official Cambridge syllabus revisions'}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0 max-w-[380px] truncate"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate">Obsolete: {question.obsolete_reason || meta?.obsoleteReason || 'Removed in current syllabus'}</span>
            </span>
          )}

          {/* MCQ Answer Key Badge in Header - only shown once revealed (anti-spoiler) */}
          {isMcq && mcqAnswer && isMcqAnswerRevealed && (
            <span className={`${mobileTab === 'ms' || isMcqAnsweredCorrectly ? 'inline-flex' : 'hidden md:inline-flex'} items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0`}>
              <span className="text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Key:</span>
              <span className="font-mono text-white bg-emerald-700 dark:bg-emerald-600 px-1 py-0.5 rounded text-[10px] font-bold">
                [{normalizedKey}]
              </span>
            </span>
          )}

          {/* Cleanly Truncated Topic & Subtopic */}
          <span className="text-xs text-[var(--ink-secondary)] font-medium truncate hidden sm:inline max-w-xs xl:max-w-md">
            <span className={`${subjectUnitTextClass} font-semibold`}>{question.unit || question.topic}:</span>{' '}
            {question.subtopic || question.topic}
          </span>

          {/* Stitched Stem Indicator */}
          {question.hasStem && (
            <span className="hidden 2xl:inline-flex items-center gap-1 text-[9px] text-[var(--ink-secondary)] px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] shrink-0">
              <Paperclip className="w-2.5 h-2.5 text-[var(--ink-muted)]" />
              Stem
            </span>
          )}

          {/* All Parts Drawer Button (if parent question has multiple subparts) */}
          {siblingSubparts.length > 1 && (
            <button
              type="button"
              onClick={() => setIsFullQuestionOpen(true)}
              title={`View complete Question with all ${siblingSubparts.length} parts`}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--ink-primary)] bg-[var(--bg-inset)] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] px-2 py-0.5 rounded shrink-0 transition-colors"
            >
              <FileText className={`w-3 h-3 ${subjectUnitTextClass}`} />
              <span>All Parts ({siblingSubparts.length})</span>
            </button>
          )}
        </div>

        {/* Right: Actions & Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={onCycleStatus}
            title={`Status: ${statusCfg.label}. Click to cycle status`}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border transition-colors ${statusCfg.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            <span className="hidden sm:inline">{statusCfg.label}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark [B]' : 'Bookmark question [B]'}
            className={`p-1.5 rounded border transition-colors ${
              isBookmarked
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                : 'bg-[var(--bg-inset)] text-[var(--ink-muted)] border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>

          <div className="hidden sm:block w-px h-3.5 bg-[var(--border-hairline)] mx-0.5" />

          <div className="hidden sm:flex items-center gap-0.5 shrink-0 bg-[var(--bg-inset)] p-0.5 rounded border border-[var(--border-hairline)] whitespace-nowrap min-w-[80px]">
            <button
              onClick={onPrevQuestion}
              disabled={!hasPrev}
              title="Previous Question [ArrowLeft or []"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="min-w-[80px] px-1 text-center font-mono tabular-nums text-[11px] text-[var(--ink-primary)] select-none shrink-0 font-medium whitespace-nowrap">
              {currentIndex + 1} / {totalQuestions}
            </span>

            <button
              onClick={onNextQuestion}
              disabled={!hasNext}
              title="Next Question [ArrowRight or ]]"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CANVAS AREA */}
      <div className="flex-1 h-full min-h-0 w-full flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0">
        {/* Question Canvas */}
        <div
          className={`flex-1 h-full min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden p-0 sm:p-3 md:p-4 flex flex-col items-center ${
            mobileTab === 'question' ? 'flex' : 'hidden'
          } ${viewMode === 'ms-only' ? 'md:hidden' : 'md:flex'}`}
        >
          <ImageCanvas
            src={questionImagePath}
            title={`Question ${displayQNum}`}
            badgeText={`${question.marks ?? question.total_marks ?? 1} ${(question.marks ?? question.total_marks ?? 1) === 1 ? 'Mark' : 'Marks'}`}
            badgeColor={subjectTheme.badgeColor}
            activeSubject={activeSubject}
            placeholderTitle="Question Image Not Available"
            placeholderMessage="Could not load the question image asset."
            enableAnnotation={true}
            questionId={question.id}
            paperCitation={meta?.paperLabel ? `${meta.paperLabel} · ${meta.seriesTag} · Q${displayQNum}` : undefined}
          >
            {/* Interactive MCQ A/B/C/D Dock */}
            {isMcq && !isMath && (
              <div className="w-full max-w-xl mt-4 px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col items-center gap-2.5 select-none">
                <div className="flex items-center justify-between w-full px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                      Select Option
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[var(--ink-caption)]">
                      Press
                      <kbd className="kbd-keycap">A</kbd>
                      –
                      <kbd className="kbd-keycap">D</kbd>
                    </span>
                  </div>
                  {selectedMcqOption && (
                    <button
                      type="button"
                      onClick={handleResetMcq}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
                      title="Clear selected answer and retry"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* 4 Interactive Option Buttons */}
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
                  {['A', 'B', 'C', 'D'].map((opt, optIdx) => {
                    const isSelected = selectedMcqOption === opt;
                    const isWrong = wrongOptions.includes(opt);
                    const isCorrect = Boolean(normalizedKey && opt === normalizedKey);
                    const isAnsweredCorrectly = isMcqAnsweredCorrectly && isCorrect;

                    let btnStyle =
                      'bg-[var(--bg-inset)] text-[var(--ink-primary)] border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]';

                    if (isAnsweredCorrectly) {
                      btnStyle =
                        'bg-[#15803D] dark:bg-[#16A34A] text-white border-[#15803D] dark:border-[#4ADE80]';
                    } else if (isWrong) {
                      btnStyle = `bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-500 ${
                        isShaking && isSelected ? 'animate-shake' : ''
                      }`;
                    } else if (isMarkSchemeVisible && isCorrect) {
                      btnStyle =
                        'bg-[#F0FDF4] dark:bg-emerald-500/20 text-[#15803D] dark:text-[#4ADE80] border-[#15803D] dark:border-[#4ADE80]';
                    } else if (isMarkSchemeVisible) {
                      btnStyle =
                        'bg-[var(--bg-inset)] text-[var(--ink-caption)] border-[var(--border-hairline)] opacity-50';
                    } else if (isSelected) {
                      btnStyle =
                        'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isMcqAnsweredCorrectly}
                        onClick={() => handleMcqSelect(opt)}
                        className={`h-11 sm:h-12 rounded-lg font-bold font-mono text-sm sm:text-base border flex items-center justify-center gap-1.5 transition-colors ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        <span className="hidden sm:inline-block text-[10px] font-mono opacity-40 font-normal">
                          {optIdx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant visual feedback message banner */}
                {selectedMcqOption !== null && normalizedKey && (
                  <div
                    className={`w-full py-2.5 px-3.5 rounded-md text-xs font-semibold flex items-center justify-between gap-2 ${
                      isMcqAnsweredCorrectly
                        ? 'bg-[#F0FDF4] dark:bg-emerald-950/60 border border-[#BBF7D0] dark:border-emerald-500/40 text-[#15803D] dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isMcqAnsweredCorrectly ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
                          <span>Correct. Option [{normalizedKey}] is the right answer.</span>
                        </>
                      ) : isMarkSchemeVisible ? (
                        <>
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Incorrect. Option [{normalizedKey}] is the correct answer.</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Incorrect{mcqAttempts > 0 ? ` (Attempt ${mcqAttempts})` : ''} — try another option or reveal the answer.</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setMobileTab((prev) => (prev === 'ms' ? 'question' : 'ms'));
                        } else {
                          onSetViewMode(isMarkSchemeVisible ? 'question-only' : 'split');
                        }
                      }}
                      className="text-[11px] font-bold underline shrink-0 hover:opacity-80"
                    >
                      {isMarkSchemeVisible || mobileTab === 'ms' ? 'Hide Mark Scheme' : 'Reveal Mark Scheme'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </ImageCanvas>
        </div>

        {/* Hairline Split Divider (visible in side-by-side split mode) */}
        {viewMode === 'split' && (
          <div
            className="hidden md:block w-px bg-[var(--border-hairline)] shrink-0 select-none"
            aria-hidden="true"
          />
        )}

        {/* Mark Scheme Canvas */}
        <div
          className={`flex-1 h-full min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden p-0 sm:p-3 md:p-4 flex flex-col items-center ${
            mobileTab === 'ms' ? 'flex' : 'hidden'
          } ${viewMode === 'question-only' ? 'md:hidden' : 'md:flex'}`}
        >
          <ImageCanvas
            src={markSchemePath}
            title="Mark Scheme"
            badgeText={
              mcqAnswer
                ? `KEY: [${mcqAnswer.toUpperCase()}]`
                : qType === 'mcq'
                ? 'MCQ Key'
                : 'Answers'
            }
            badgeColor="emerald"
            activeSubject={activeSubject}
            placeholderTitle="Mark Scheme Pending"
            placeholderMessage="This question's mark scheme row is either still processing or was not included in the sample pages."
            enableAnnotation={true}
            questionId={`${question.id}-ms`}
            paperCitation={meta?.paperLabel ? `${meta.paperLabel} · ${meta.seriesTag} · Q${displayQNum}` : undefined}
          />
        </div>
      </div>

      {/* ANCHORED BOTTOM ACTION BAR (Desktop & Tablet >= 768px) */}
      <div className="hidden md:flex sticky bottom-0 w-full py-2.5 px-6 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] items-center justify-center gap-3 z-10 shrink-0 select-none">
        <button
          type="button"
          onClick={onPrevQuestion}
          disabled={!hasPrev}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Previous Question [ArrowLeft or []"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
          <kbd className="hidden lg:inline-block kbd-keycap">←</kbd>
        </button>

        <button
          type="button"
          onClick={onToggleMarkScheme}
          title={isMarkSchemeVisible ? 'Hide Mark Scheme [Space or M]' : 'Show Mark Scheme [Space or M]'}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
            isMarkSchemeVisible
              ? 'bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border-[var(--border-hairline)]'
              : 'bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] border-transparent'
          }`}
        >
          {isMarkSchemeVisible ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Mark Scheme</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show Mark Scheme</span>
            </>
          )}
          <kbd
            className={`px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none rounded border select-none ${
              isMarkSchemeVisible
                ? 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--ink-muted)]'
                : 'bg-white/15 dark:bg-slate-900/15 border-white/25 dark:border-slate-900/20 text-current'
            }`}
          >
            Space
          </kbd>
        </button>

        <button
          type="button"
          onClick={onNextQuestion}
          disabled={!hasNext}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Next Question [ArrowRight or ]]"
        >
          <span>Next</span>
          <kbd className="hidden lg:inline-block kbd-keycap">→</kbd>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (< 768px) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] z-30 px-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevQuestion}
          disabled={!hasPrev}
          className="min-w-[52px] min-h-[40px] px-3 flex items-center justify-center gap-1 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none transition-colors"
          title="Previous Question"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={onOpenQuestionList}
          className="flex-1 min-h-[40px] px-2 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--ink-primary)] transition-colors"
          title="Open Question List"
        >
          <List className={`w-3.5 h-3.5 ${subjectUnitTextClass}`} />
          <span className="font-mono tabular-nums font-bold">
            Q{question.questionNumber} ({currentIndex + 1}/{totalQuestions})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab((prev) => (prev === 'question' ? 'ms' : 'question'));
          }}
          className={`min-h-[40px] px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            mobileTab === 'ms'
              ? 'bg-[var(--bg-inset)] text-[var(--ink-primary)] border-[var(--border-strong)]'
              : 'bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] border-transparent'
          }`}
          title={mobileTab === 'ms' ? 'Show Question' : 'Show Answer'}
        >
          {mobileTab === 'ms' ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Question</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answer</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onNextQuestion}
          disabled={!hasNext}
          className="min-w-[52px] min-h-[40px] px-3 flex items-center justify-center gap-1 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none transition-colors"
          title="Next Question"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Full Question Modal / Drawer */}
      {isFullQuestionOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/50 flex justify-end select-text"
          onClick={() => setIsFullQuestionOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-[var(--bg-surface)] border-l border-[var(--border-hairline)] h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${subjectQBadgeClass}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold text-[var(--ink-primary)] flex items-center gap-2 truncate">
                    Question: {question.parent_question_id || `Q${question.parentQuestion}`}
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${subjectQBadgeClass}`}>
                      {siblingSubparts.length} parts
                    </span>
                  </h2>
                  <p className="text-[11px] text-[var(--ink-muted)] truncate">
                    {question.unit} · {question.series && question.year && question.series.includes(String(question.year))
                      ? question.series
                      : `${question.series || question.session} ${question.year}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullQuestionOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Sequential List of Subparts */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[var(--bg-paper)]">
              {siblingSubparts.map((sub) => {
                const isCurrent = sub.id === question.id;
                const subQNum =
                  sub.question_number ??
                  sub.questionNumber ??
                  sub.number ??
                  (sub.id ? sub.id.split('_').pop()?.replace(/^q/i, '') : '') ??
                  '1';

                return (
                  <div
                    key={sub.id}
                    className={`rounded-lg border p-3 sm:p-4 transition-colors ${
                      isCurrent
                        ? `${subjectTheme.selectedCardClass} border-l-4`
                        : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-hairline)]">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm font-mono ${subjectUnitTextClass}`}>
                          Question {sub.subPart ? `${subQNum} (${sub.subPart})` : subQNum}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
                          {sub.marks ?? sub.total_marks ?? 1} {(sub.marks ?? sub.total_marks ?? 1) === 1 ? 'mark' : 'marks'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectQuestionById) {
                            onSelectQuestionById(sub.id);
                          }
                          setIsFullQuestionOpen(false);
                        }}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                          isCurrent
                            ? `${subjectQBadgeClass}`
                            : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] border-[var(--border-hairline)]'
                        }`}
                      >
                        <span>{isCurrent ? 'Current' : 'Jump to Part'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className={`exam-paper-surface rounded-md overflow-hidden border border-[var(--border-hairline)] ${isDarkPaperActive ? 'bg-[var(--bg-surface)]' : 'bg-white'}`}>
                      <img
                        src={resolveQuestionImageUrl(sub, activeSubject)}
                        alt={`Question ${subQNum}`}
                        crossOrigin="anonymous"
                        className={`w-full h-auto block select-none ${isDarkPaperActive ? 'exam-paper-dark-invert' : ''}`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SplitViewer;
