import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  HelpCircle,
  Award
} from 'lucide-react';
import { QuestionItem, Subject, SubjectCode, subjectCodeToSlug, subjectSlugToCode } from '../types';
import { ImageCanvas } from './ImageCanvas';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';
import { useProgress } from '../context/ProgressContext';
import { getCanonicalSubjectTheme } from '../utils/subjectTheme';

interface MockSittingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  questions: QuestionItem[];
  durationMinutes: number;
  subject: Subject | SubjectCode;
}

export const MockSittingModal: React.FC<MockSittingModalProps> = ({
  isOpen,
  onClose,
  title,
  questions,
  durationMinutes,
  subject,
}) => {
  const { setQuestionStatus, questionStatuses, userAnswers, setMcqAnswer } = useProgress();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sittingMode, setSittingMode] = useState<'test' | 'practice'>('test');
  const [showMarkSchemeInPractice, setShowMarkSchemeInPractice] = useState<boolean>(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  // Live Countdown Timer State
  const initialSeconds = Math.max(60, durationMinutes * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Local student scores and answers for this sitting
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [studentScores, setStudentScores] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset exam session when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSecondsRemaining(Math.max(60, durationMinutes * 60));
      setIsTimerRunning(true);
      setIsExamSubmitted(false);
      setShowMarkSchemeInPractice(false);
      setShowSubmitConfirm(false);
      setLocalAnswers({ ...userAnswers });
    }
  }, [isOpen, durationMinutes]);

  // Timer Tick Effect
  useEffect(() => {
    if (!isOpen || !isTimerRunning || isExamSubmitted) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExamSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isTimerRunning, isExamSubmitted]);

  // Escape Key Confirmation Protection
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSubmitConfirm) {
          setShowSubmitConfirm(false);
          return;
        }
        if (
          window.confirm(
            'Are you sure you want to exit your mock exam? Your progress will be lost.'
          )
        ) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSubmitConfirm, onClose]);

  if (!isOpen || questions.length === 0) return null;

  const activeQuestion = questions[currentIndex];
  const qNumDisplay =
    (activeQuestion as any)?.question_number ??
    activeQuestion.questionNumber ??
    (activeQuestion.id ? activeQuestion.id.split('_').pop()?.replace(/^q/i, '') : '') ??
    String(currentIndex + 1);

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const earnedMarks = Object.values(studentScores).reduce((sum, val) => sum + val, 0);

  // Format Timer mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isTimeCritical = secondsRemaining < 300 && secondsRemaining > 0; // < 5 mins

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleFlag = (id: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectMcq = (choice: 'A' | 'B' | 'C' | 'D') => {
    setLocalAnswers((prev) => ({ ...prev, [activeQuestion.id]: choice }));
    setMcqAnswer(activeQuestion.id, choice);

    if (activeQuestion.correct_answer) {
      if (activeQuestion.correct_answer === choice) {
        setQuestionStatus(activeQuestion.id, 'mastered');
        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: activeQuestion.marks || 1 }));
      } else {
        setQuestionStatus(activeQuestion.id, 'review');
        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: 0 }));
      }
    }
  };

  const handleFinalSubmit = () => {
    setIsExamSubmitted(true);
    setIsTimerRunning(false);
    setShowSubmitConfirm(false);
    // Grade MCQs automatically
    const newScores: Record<string, number> = { ...studentScores };
    questions.forEach((q) => {
      if (q.is_mcq && q.correct_answer) {
        const studentAns = localAnswers[q.id];
        if (studentAns === q.correct_answer) {
          newScores[q.id] = q.marks || 1;
          setQuestionStatus(q.id, 'mastered');
        } else if (studentAns) {
          newScores[q.id] = 0;
          setQuestionStatus(q.id, 'review');
        }
      }
    });
    setStudentScores(newScores);
  };

  const calcGrade = (score: number, max: number) => {
    if (max <= 0) return 'Ungraded';
    const pct = (score / max) * 100;
    if (pct >= 85) return 'A* (Outstanding)';
    if (pct >= 75) return 'A (Excellent)';
    if (pct >= 65) return 'B (Good)';
    if (pct >= 55) return 'C (Pass)';
    if (pct >= 45) return 'D';
    if (pct >= 35) return 'E';
    return 'U (Ungraded)';
  };

  const subjectCode = subjectSlugToCode(subject);
  const subjectSlug = subjectCodeToSlug(subjectCode);
  const subjectTheme = getCanonicalSubjectTheme(subjectSlug);
  const isNonCalc = subjectCode === '0580' && activeQuestion.calculator_allowed === false;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-paper)] text-[var(--ink-primary)] select-none overflow-hidden"
    >
      {/* Top Examination HUD Header */}
      <header className="h-14 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between shrink-0 gap-3 z-20">
        {/* Left: Title & Cambridge Badge */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)]">
            <span className={`w-2 h-2 rounded-[2px] ${subjectTheme.swatchClass}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-primary)]">
              Mock Exam Room
            </span>
          </div>

          <h2 className="font-editorial text-sm sm:text-base font-semibold text-[var(--ink-primary)] truncate max-w-xs md:max-w-md">
            {title}
          </h2>

          {isNonCalc ? (
            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
              Non-Calculator
            </span>
          ) : (
            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F0FDF4] dark:bg-emerald-500/20 text-[#15803D] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-emerald-500/30">
              Calculator Allowed
            </span>
          )}
        </div>

        {/* Center: Live Timer & Mode Segmented Control */}
        <div className="flex items-center gap-3 shrink-0">
          {!isExamSubmitted && (
            <div className="hidden md:flex items-center bg-[var(--bg-inset)] p-0.5 rounded-lg border border-[var(--border-hairline)] text-xs">
              <button
                type="button"
                onClick={() => {
                  setSittingMode('test');
                  setShowMarkSchemeInPractice(false);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors font-semibold ${
                  sittingMode === 'test'
                    ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => setSittingMode('practice')}
                className={`px-2.5 py-1 rounded-md transition-colors font-semibold ${
                  sittingMode === 'practice'
                    ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                Practice Mode
              </button>
            </div>
          )}

          {/* Countdown Clock Display */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono tabular-nums text-sm font-bold ${
              isTimeCritical
                ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300'
                : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-primary)]'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600 dark:text-rose-400' : subjectTheme.textClass}`} />
            <span>{formatTime(secondsRemaining)}</span>
            {!isExamSubmitted && (
              <button
                type="button"
                onClick={() => setIsTimerRunning((r) => !r)}
                title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                className="ml-1 p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Fullscreen, Submit, Close */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExamSubmitted ? (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 py-1.5 rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] font-semibold text-xs transition-colors"
            >
              Finish Exam
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] dark:bg-emerald-500/20 border border-[#BBF7D0] dark:border-emerald-500/40 text-[#15803D] dark:text-[#4ADE80] font-bold text-xs">
              <Award className="w-4 h-4" />
              <span>Exam Complete</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-hairline)] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-rose-50 dark:hover:bg-rose-500/20 text-[var(--ink-secondary)] hover:text-rose-600 dark:hover:text-rose-300 border border-[var(--border-hairline)] transition-colors"
            title="Exit Exam Room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Question Navigation Strip */}
      <nav className="h-11 px-4 bg-[var(--bg-inset)] border-b border-[var(--border-hairline)] flex items-center gap-1.5 overflow-x-auto shrink-0">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isFlagged = flaggedQuestions.has(q.id);
          const hasAnswer = Boolean(localAnswers[q.id]);
          const status = questionStatuses[q.id];
          const isGradedMaster = status === 'mastered';
          const isGradedReview = status === 'review';

          let indicatorColor = 'bg-[var(--border-strong)]';
          if (isGradedMaster) indicatorColor = 'bg-[#15803D] dark:bg-[#4ADE80]';
          else if (isGradedReview) indicatorColor = 'bg-rose-500';
          else if (hasAnswer) indicatorColor = subjectTheme.swatchClass;
          else if (isFlagged) indicatorColor = 'bg-amber-500';

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setShowMarkSchemeInPractice(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-colors shrink-0 border ${
                isCurrent
                  ? 'bg-[var(--action-primary-bg)] border-transparent text-[var(--action-primary-fg)]'
                  : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
              <span>Q{idx + 1}</span>
              {isFlagged && <Bookmark className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
            </button>
          );
        })}
      </nav>

      {/* Main Examination Question Viewing Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-[var(--border-hairline)]">
          {/* Question Meta Bar */}
          <div className="h-11 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--ink-primary)] font-mono tabular-nums">
                Question {currentIndex + 1} of {questions.length} (Q{qNumDisplay})
              </span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold border ${subjectTheme.badgeClass}`}>
                {activeQuestion.marks} marks
              </span>
              <span className="text-[var(--ink-muted)] truncate hidden sm:inline">
                {activeQuestion.topic} / {activeQuestion.subtopic}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFlag(activeQuestion.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
                  flaggedQuestions.has(activeQuestion.id)
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                    : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{flaggedQuestions.has(activeQuestion.id) ? 'Flagged' : 'Flag'}</span>
              </button>

              {(sittingMode === 'practice' || isExamSubmitted) && (
                <button
                  type="button"
                  onClick={() => setShowMarkSchemeInPractice((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
                    showMarkSchemeInPractice
                      ? 'bg-[#F0FDF4] dark:bg-emerald-500/20 border-[#BBF7D0] dark:border-emerald-500/40 text-[#15803D] dark:text-[#4ADE80]'
                      : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {showMarkSchemeInPractice ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showMarkSchemeInPractice ? 'Hide Mark Scheme' : 'Reveal Mark Scheme'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Image Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <ImageCanvas
              src={resolveQuestionImageUrl(activeQuestion)}
              title={`Question ${qNumDisplay}`}
              badgeText={`${activeQuestion.marks}m`}
              badgeColor={subjectTheme.badgeColor}
              activeSubject={subjectSlug}
              enableAnnotation={true}
              questionId={activeQuestion.id}
            />
          </div>

          {/* Interactive MCQ Answer Bar */}
          {activeQuestion.is_mcq && (
            <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
                  Select Answer:
                </span>
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C', 'D'] as const).map((choice) => {
                    const isSelected = localAnswers[activeQuestion.id] === choice;
                    const isCorrect = isExamSubmitted && activeQuestion.correct_answer === choice;
                    const isWrong = isExamSubmitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleSelectMcq(choice)}
                        className={`w-9 h-9 rounded-lg font-bold font-mono text-sm border transition-colors ${
                          isCorrect
                            ? 'bg-[#15803D] dark:bg-[#16A34A] text-white border-transparent'
                            : isWrong
                            ? 'bg-rose-600 text-white border-transparent'
                            : isSelected
                            ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent'
                            : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border-[var(--border-hairline)]'
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeQuestion.correct_answer && (sittingMode === 'practice' || isExamSubmitted) && (
                <div className="text-xs font-mono font-bold text-[#15803D] dark:text-[#4ADE80]">
                  Official Answer: [ {activeQuestion.correct_answer} ]
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Companion Mark Scheme */}
        {(showMarkSchemeInPractice || isExamSubmitted) && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-paper)] border-l border-[var(--border-hairline)]">
            <div className="h-11 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between shrink-0 text-xs">
              <span className="font-bold text-[#15803D] dark:text-[#4ADE80] font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Official Mark Scheme: Q{qNumDisplay}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[var(--ink-muted)] text-[11px] mr-1">Grade:</span>
                {[0, Math.ceil((activeQuestion.marks || 1) / 2), activeQuestion.marks || 1].map((pts) => {
                  const isAwarded = studentScores[activeQuestion.id] === pts;
                  return (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => {
                        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: pts }));
                        if (pts === activeQuestion.marks) setQuestionStatus(activeQuestion.id, 'mastered');
                        else if (pts === 0) setQuestionStatus(activeQuestion.id, 'review');
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                        isAwarded
                          ? 'bg-[#15803D] dark:bg-[#16A34A] text-white border-transparent'
                          : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border-[var(--border-hairline)]'
                      }`}
                    >
                      {pts}m
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <ImageCanvas
                src={resolveMarkSchemeImageUrl(activeQuestion)}
                title={`Mark Scheme: Q${qNumDisplay}`}
                badgeText="Answers"
                badgeColor="emerald"
                activeSubject={subjectSlug}
                placeholderTitle="Mark Scheme Image"
                placeholderMessage="Official mark scheme slice not indexed for this question."
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Paging Toolbar */}
      <footer className="h-12 px-4 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] flex items-center justify-between shrink-0 text-xs z-20">
        <button
          type="button"
          disabled={currentIndex <= 0}
          onClick={() => {
            setCurrentIndex((i) => Math.max(0, i - 1));
            setShowMarkSchemeInPractice(false);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-primary)] font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-[var(--ink-muted)] text-xs">
            {currentIndex + 1} / {questions.length} Questions
          </span>
          {isExamSubmitted && (
            <span className="px-2.5 py-1 rounded-md bg-[#F0FDF4] dark:bg-emerald-500/20 text-[#15803D] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-emerald-500/30 font-bold font-mono tabular-nums">
              Score: {earnedMarks} / {totalMarks} ({Math.round((earnedMarks / (totalMarks || 1)) * 100)}%)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={currentIndex >= questions.length - 1}
          onClick={() => {
            setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
            setShowMarkSchemeInPractice(false);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-primary)] font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
          <div
            className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-popover)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--ink-primary)]">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-editorial text-base font-semibold text-[var(--ink-primary)]">Submit Examination?</h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Are you ready to finish? Time remaining: {formatTime(secondsRemaining)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-hairline)] space-y-1.5 text-xs text-[var(--ink-secondary)]">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-mono font-bold text-[var(--ink-primary)]">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Questions Attempted:</span>
                <span className={`font-mono font-bold ${subjectTheme.textClass}`}>
                  {Object.keys(localAnswers).length} of {questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flagged for Review:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{flaggedQuestions.size}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-primary)] font-semibold text-xs transition-colors"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] font-semibold text-xs transition-colors"
              >
                Yes, Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Exam Final Grade Report Overlay */}
      {isExamSubmitted && !showMarkSchemeInPractice && currentIndex === 0 && (
        <div
          className="absolute top-16 right-6 z-30 w-72 rounded-lg bg-[var(--bg-surface)] border border-[#BBF7D0] dark:border-emerald-500/35 p-4"
          style={{ boxShadow: 'var(--shadow-popover)' }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
            <span className="text-xs font-bold text-[#15803D] dark:text-[#4ADE80] flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Official Mock Result
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-muted)]">Graded</span>
          </div>
          <div className="py-3 text-center">
            <div className="text-2xl font-bold text-[var(--ink-primary)] font-mono tabular-nums">
              {earnedMarks} / {totalMarks}
            </div>
            <div className="text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] mt-0.5">
              {calcGrade(earnedMarks, totalMarks)}
            </div>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] text-center leading-snug">
            Review your answers using the companion Mark Schemes.
          </p>
        </div>
      )}
    </div>
  );
};
