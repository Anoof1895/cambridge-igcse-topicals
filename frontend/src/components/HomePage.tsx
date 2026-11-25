import React, { useMemo, useCallback } from 'react';
import {
  FlaskConical,
  Atom,
  Compass,
  FileText,
  ArrowRight,
  Search,
  Printer,
  BookOpen,
  Sigma,
  Dna,
  PenTool,
  CheckCircle2,
} from 'lucide-react';
import { AppView, QuestionItem } from '../types';
import { useProgress } from '../context/ProgressContext';
import { CANONICAL_SUBJECT_THEMES } from '../utils/subjectTheme';

interface HomePageProps {
  onNavigate: (view: AppView) => void;
  questions?: QuestionItem[];
  physicsQuestions?: QuestionItem[];
  mathematicsQuestions?: QuestionItem[];
  biologyQuestions?: QuestionItem[];
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  questions = [],
  physicsQuestions = [],
  mathematicsQuestions = [],
  biologyQuestions = [],
}) => {
  const { questionStatuses } = useProgress();

  const {
    mathTotal,
    mathPapers,
    mathMarks,
    physTotal,
    physPapers,
    physMarks,
    chemTotal,
    chemPapers,
    chemMarks,
    bioTotal,
    bioPapers,
    bioMarks,
  } = useMemo(() => {
    const mathTot = mathematicsQuestions.length || 3936;
    const mathP = new Set(mathematicsQuestions.map((q) => q.paperId || q.id.slice(0, 14))).size || 142;
    const mathM = mathematicsQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10650;

    const physTot = physicsQuestions.length || 5577;
    const physP = new Set(physicsQuestions.map((q) => q.paperId || q.id.slice(0, 14))).size || 140;
    const physM = physicsQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10230;

    const chemTot = questions.length || 3825;
    const chemP = new Set(questions.map((q) => q.paperId || q.id.slice(0, 14))).size || 140;
    const chemM = questions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10041;

    const bioTot = biologyQuestions.length || 3743;
    const bioP = new Set(biologyQuestions.map((q) => q.paperId || q.id.slice(0, 14))).size || 80;
    const bioM = biologyQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 5400;

    return {
      mathTotal: mathTot,
      mathPapers: mathP,
      mathMarks: mathM,
      physTotal: physTot,
      physPapers: physP,
      physMarks: physM,
      chemTotal: chemTot,
      chemPapers: chemP,
      chemMarks: chemM,
      bioTotal: bioTot,
      bioPapers: bioP,
      bioMarks: bioM,
    };
  }, [questions, physicsQuestions, mathematicsQuestions, biologyQuestions]);

  const { mathCompleted, physCompleted, chemCompleted, bioCompleted } = useMemo(() => {
    let math = 0;
    let phys = 0;
    let chem = 0;
    let bio = 0;

    for (const [qId, status] of Object.entries(questionStatuses || {})) {
      const isDone = status === 'mastered' || status === 'correct' || (status as string) === 'completed';
      if (!isDone) continue;

      const lower = qId.toLowerCase();
      if (lower.startsWith('0580') || lower.startsWith('wma') || lower.includes('math')) {
        math++;
      } else if (lower.startsWith('0625') || lower.startsWith('wph') || lower.includes('phys')) {
        phys++;
      } else if (lower.startsWith('0610') || lower.includes('bio')) {
        bio++;
      } else if (lower.startsWith('0620') || lower.startsWith('wch') || lower.includes('chem')) {
        chem++;
      }
    }

    return {
      mathCompleted: math,
      physCompleted: phys,
      chemCompleted: chem,
      bioCompleted: bio,
    };
  }, [questionStatuses]);

  const totalQuestionsCombined = mathTotal + physTotal + chemTotal + bioTotal;
  const totalPapersCombined = mathPapers + physPapers + chemPapers + bioPapers;
  const totalMarksCombined = mathMarks + physMarks + chemMarks + bioMarks;

  const mathProgressPct = Math.min(100, (mathCompleted / mathTotal) * 100);
  const physProgressPct = Math.min(100, (physCompleted / physTotal) * 100);
  const chemProgressPct = Math.min(100, (chemCompleted / chemTotal) * 100);
  const bioProgressPct = Math.min(100, (bioCompleted / bioTotal) * 100);

  const triggerCommandPalette = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
  }, []);

  const triggerDataBooklet = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', bubbles: true })
    );
  }, []);

  const mathTheme = CANONICAL_SUBJECT_THEMES.mathematics;
  const physTheme = CANONICAL_SUBJECT_THEMES.physics;
  const chemTheme = CANONICAL_SUBJECT_THEMES.chemistry;
  const bioTheme = CANONICAL_SUBJECT_THEMES.biology;

  const subjectCards = [
    {
      key: 'mathematics',
      title: 'Mathematics',
      code: '0580',
      badge: '0580 · 2025 Ready',
      subtitle: 'Cambridge IGCSE · 0580',
      Icon: Sigma,
      theme: mathTheme,
      chips: ['P1 Non-Calc', 'P2 Non-Calc', 'P3 Calc', 'P4 Calc'],
      total: mathTotal,
      papers: mathPapers,
      completed: mathCompleted,
      progressPct: mathProgressPct,
      highlights: [
        '2025–2028 Non-Calculator transition filter',
        'Number, Algebra, Geometry, Stats & Trig',
      ],
      topicalView: 'mathematics-topical' as AppView,
      testMakerView: 'mathematics-test-maker' as AppView,
    },
    {
      key: 'physics',
      title: 'Physics',
      code: '0625',
      badge: '0625 · Space Physics',
      subtitle: 'Cambridge IGCSE · 0625',
      Icon: Atom,
      theme: physTheme,
      chips: ['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'],
      total: physTotal,
      papers: physPapers,
      completed: physCompleted,
      progressPct: physProgressPct,
      highlights: [
        'Syllabus exclusion filtering (logic gates, manometers)',
        'Motion, Thermal, Waves, Electricity & Space',
      ],
      topicalView: 'physics-topical' as AppView,
      testMakerView: 'physics-test-maker' as AppView,
    },
    {
      key: 'chemistry',
      title: 'Chemistry',
      code: '0620',
      badge: '0620 · Practical Ready',
      subtitle: 'Cambridge IGCSE · 0620',
      Icon: FlaskConical,
      theme: chemTheme,
      chips: ['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'],
      total: chemTotal,
      papers: chemPapers,
      completed: chemCompleted,
      progressPct: chemProgressPct,
      highlights: [
        'Stoichiometry, Electrochemistry & Organic',
        'Cation/anion qualitative analysis tables',
      ],
      topicalView: 'chemistry-topical' as AppView,
      testMakerView: 'chemistry-test-maker' as AppView,
    },
    {
      key: 'biology',
      title: 'Biology',
      code: '0610',
      badge: '0610 · Genetics & Eco',
      subtitle: 'Cambridge IGCSE · 0610',
      Icon: Dna,
      theme: bioTheme,
      chips: ['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'],
      total: bioTotal,
      papers: bioPapers,
      completed: bioCompleted,
      progressPct: bioProgressPct,
      highlights: [
        'Genetics, Inheritance, Ecology & Physiology',
        'Biological diagrams, food tests & magnification',
      ],
      topicalView: 'biology-topical' as AppView,
      testMakerView: 'biology-test-maker' as AppView,
    },
  ];

  return (
    <div className="relative flex-1 overflow-y-auto bg-[var(--bg-paper)] text-[var(--ink-primary)] min-h-0 select-none transition-colors">
      {/* Editorial Masthead Band */}
      <section className="w-full border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-[62ch]">
              <h1 className="font-editorial text-[30px] sm:text-[40px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--ink-primary)]">
                Cambridge IGCSE Workspace
              </h1>
              <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink-muted)]">
                Interactive topical revision, deterministic mock exam builder, and official mark schemes
                across Mathematics (0580), Physics (0625), Chemistry (0620), and Biology (0610).
              </p>
            </div>

            <button
              type="button"
              onClick={triggerCommandPalette}
              className="w-full lg:w-[340px] shrink-0 cursor-pointer rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
                <span className="text-xs sm:text-[13px] text-[var(--ink-muted)] truncate">
                  Jump to topic, paper (0580/22), or Q...
                </span>
              </span>
              <kbd className="kbd-keycap shrink-0">Ctrl K</kbd>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* Hairline Telemetry Stat Strip */}
        <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-hairline)]">
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${mathTheme.swatchClass}`} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Total Questions
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--ink-primary)] font-mono tabular-nums">
                {totalQuestionsCombined.toLocaleString()}
              </div>
              <div className="text-[12px] text-[var(--ink-caption)] mt-1">
                4 Cambridge Subjects
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${physTheme.swatchClass}`} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Past Papers
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--ink-primary)] font-mono tabular-nums">
                {totalPapersCombined.toLocaleString()}
              </div>
              <div className="text-[12px] text-[var(--ink-caption)] mt-1">
                2019–2026 Maths/Physics · 2021–2026 Sciences
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${chemTheme.swatchClass}`} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Syllabus Engine
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--ink-primary)] font-mono tabular-nums">
                2025+
              </div>
              <div className="text-[12px] text-[var(--ink-caption)] mt-1">
                Non-Calc P1/P2 Filter
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${bioTheme.swatchClass}`} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Available Marks
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--ink-primary)] font-mono tabular-nums">
                {totalMarksCombined.toLocaleString()}
              </div>
              <div className="text-[12px] text-[var(--ink-caption)] mt-1">
                Official Mark Schemes
              </div>
            </div>
          </div>
        </div>

        {/* Subject Portals Section */}
        <section>
          <div className="mb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="font-editorial text-[22px] sm:text-[25px] font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Cambridge IGCSE Portals
              </h2>
              <p className="text-[13px] text-[var(--ink-muted)] mt-0.5">
                Select a subject to start topical practice or build customized mock assessments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {subjectCards.map((card) => {
              const Icon = card.Icon;
              return (
                <div
                  key={card.key}
                  className={`rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] border-t-[3px] ${card.theme.borderTopClass} hover:border-[#0F172A]/45 dark:hover:border-slate-500 p-5 flex flex-col justify-between transition-colors duration-150`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${card.theme.badgeClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold border ${card.theme.badgeClass}`}>
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="font-editorial text-[20px] font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5 mb-3">
                      {card.subtitle}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {card.chips.map((chip) => (
                        <span
                          key={chip}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-secondary)]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    <ul className="text-xs text-[var(--ink-secondary)] space-y-1.5 mb-4 tabular-nums">
                      <li className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-[1px] mt-1.5 shrink-0 ${card.theme.swatchClass}`} />
                        <span>
                          <strong className="font-semibold text-[var(--ink-primary)] font-mono">
                            {card.total.toLocaleString()}
                          </strong>{' '}
                          Questions ({card.papers} papers)
                        </span>
                      </li>
                      {card.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className={`w-1.5 h-1.5 rounded-[1px] mt-1.5 shrink-0 ${card.theme.swatchClass}`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-2">
                    <div className="mb-3 p-2.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)]">
                      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1.5">
                        <span className="text-[var(--ink-muted)] flex items-center gap-1">
                          <CheckCircle2 className={`w-3 h-3 ${card.theme.textClass}`} />
                          <span>Mastered</span>
                        </span>
                        <span className="text-[var(--ink-primary)] font-semibold">
                          {card.completed.toLocaleString()} / {card.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${card.theme.bgSolidClass}`}
                          style={{ width: `${card.completed > 0 ? Math.max(2, card.progressPct) : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
                      <button
                        type="button"
                        onClick={() => onNavigate(card.topicalView)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] font-semibold text-xs transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Topical Explorer</span>
                        <ArrowRight className="w-3 h-3 ml-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate(card.testMakerView)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] font-semibold text-xs border border-[var(--border-hairline)] transition-colors"
                      >
                        <FileText className={`w-3.5 h-3.5 ${card.theme.textClass}`} />
                        <span>Mock Builder</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cambridge Architecture 3-Column Strip */}
        <section className="pt-8 border-t border-[var(--border-hairline)]">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-editorial text-[21px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Engineered for Cambridge IGCSE
              </h2>
              <p className="text-[13px] text-[var(--ink-muted)] mt-0.5">
                Rigorous syllabus alignment and distraction-free study workflows across all 4 subjects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-md border ${mathTheme.badgeClass}`}>
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${mathTheme.badgeClass}`}>
                    Mock Solver
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)] mb-1.5">
                  Deterministic Mock Exam Builder &amp; A4 PDF Generator
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
                  Generates full Cambridge-standard mock papers with cover sheets, lined working space,
                  and mark schemes matching real exam specifications.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[var(--border-hairline)]">
                {[
                  { label: '0580 P2 (75–100m)', cls: mathTheme.textClass },
                  { label: '0580 P4 (100–130m)', cls: mathTheme.textClass },
                  { label: 'Sciences MCQ (40m)', cls: physTheme.textClass },
                  { label: 'Theory (80m)', cls: chemTheme.textClass },
                ].map((preset) => (
                  <span
                    key={preset.label}
                    className={`font-mono text-[10px] tabular-nums px-2 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] ${preset.cls}`}
                  >
                    {preset.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-md border ${physTheme.badgeClass}`}>
                    <PenTool className="w-4 h-4" />
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${physTheme.badgeClass}`}>
                    Split Canvas
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)] mb-1.5">
                  Split Viewer &amp; Interactive Annotation
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
                  Full canvas annotation tools with anti-spoil mark scheme toggle, interactive MCQ choice bar,
                  Dark Paper mode, and instant keyboard navigation.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-hairline)] text-[11px] text-[var(--ink-muted)]">
                <span>Shortcuts</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="kbd-keycap">Space / M</kbd>
                  <kbd className="kbd-keycap">J / K</kbd>
                  <kbd className="kbd-keycap">B</kbd>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-md border ${bioTheme.badgeClass}`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${bioTheme.badgeClass}`}>
                    Drawer Reference
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)] mb-1.5">
                  Official Cambridge Formula Sheets &amp; Tables
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
                  Instant slide-over drawer with 0580 formulas, Periodic Table, Physics constants,
                  and qualitative chemical analysis testing notes.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={triggerDataBooklet}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--ink-primary)] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className={`w-3.5 h-3.5 ${bioTheme.textClass}`} />
                    <span>Open Formula Sheet</span>
                  </span>
                  <kbd className="kbd-keycap">D</kbd>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--ink-muted)] gap-4">
          <p>
            © {new Date().getFullYear()} Cambridge IGCSE Topicals. Past papers and mark schemes are copyright UCLES / Cambridge Assessment International Education.
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => onNavigate('mathematics-topical')}
              className="hover:text-[#7E22CE] dark:hover:text-[#C084FC] transition-colors font-medium"
            >
              Maths 0580
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('physics-topical')}
              className="hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] transition-colors font-medium"
            >
              Physics 0625
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('chemistry-topical')}
              className="hover:text-[#C2410C] dark:hover:text-[#FB923C] transition-colors font-medium"
            >
              Chemistry 0620
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('biology-topical')}
              className="hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors font-medium"
            >
              Biology 0610
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
