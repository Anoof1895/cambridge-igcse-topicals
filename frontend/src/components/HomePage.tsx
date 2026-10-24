import React, { useMemo, useCallback } from 'react';
import {
  FlaskConical,
  Atom,
  Compass,
  FileText,
  Layers,
  ArrowRight,
  Search,
  Printer,
  BookOpen,
  Sigma,
  Dna,
  PenTool,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AppView, QuestionItem } from '../types';
import { useProgress } from '../context/ProgressContext';
import {
  registerSpotlightTarget,
  unregisterSpotlightTarget,
} from '../utils/spotlight';

interface HomePageProps {
  onNavigate: (view: AppView) => void;
  questions?: QuestionItem[];
  physicsQuestions?: QuestionItem[];
  mathematicsQuestions?: QuestionItem[];
  biologyQuestions?: QuestionItem[];
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  enableTilt?: boolean;
  spotlightColor?: string;
  borderGlowColor?: string;
  children: React.ReactNode;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  enableTilt = false,
  spotlightColor = 'rgba(255, 255, 255, 0.06)',
  borderGlowColor = 'rgba(255, 255, 255, 0.35)',
  className = '',
  style,
  children,
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
      registerSpotlightTarget(el, e.clientX, e.clientY);

      if (enableTilt && rect.width > 0 && rect.height > 0) {
        const pctX = x / rect.width - 0.5;
        const pctY = y / rect.height - 0.5;
        el.style.setProperty('--tilt-x', `${(pctY * -4).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(pctX * 4).toFixed(2)}deg`);
      }
    },
    [enableTilt]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      unregisterSpotlightTarget(el);
      if (!enableTilt) return;
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    },
    [enableTilt]
  );

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          ...style,
          '--spotlight-color': spotlightColor,
          '--border-glow-color': borderGlowColor,
        } as React.CSSProperties
      }
      className={`spotlight-card group relative transition-transform duration-200 ease-out ${
        enableTilt ? 'will-change-transform [transform-style:preserve-3d]' : ''
      } ${className}`}
      {...rest}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--spotlight-color), transparent 65%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
        style={{
          boxShadow: `inset 0 0 0 1px var(--border-glow-color)`,
        }}
      />
      {children}
    </div>
  );
};

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
    const mathTot = mathematicsQuestions.length || 1269;
    const mathP = new Set(mathematicsQuestions.map((q) => q.paperId || q.id.slice(0, 14))).size || 142;
    const mathM = mathematicsQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10650;

    const physTot = physicsQuestions.length || 4136;
    const physP = new Set(physicsQuestions.map((q) => q.paperId || q.id.slice(0, 14))).size || 140;
    const physM = physicsQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10230;

    const chemTot = questions.length || 5712;
    const chemP = new Set(questions.map((q) => q.paperId || q.id.slice(0, 14))).size || 140;
    const chemM = questions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0) || 10041;

    const bioTot = biologyQuestions.length || 1850;
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

  // Live Mastery Progress calculation per Cambridge subject code
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

  return (
    <div
      className="relative flex-1 overflow-y-auto bg-transparent text-slate-900 dark:text-slate-100 select-none transition-colors"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Top Hero Pill & Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>2025–2028 Cambridge IGCSE Syllabus Specification Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cambridge IGCSE Workspace
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Interactive topical revision, deterministic mock exam builder, and official mark schemes
            engineered for Mathematics (0580), Physics (0625), Chemistry (0620), and Biology (0610).
          </p>

          {/* Quick Search Jump Trigger */}
          <SpotlightCard
            onClick={triggerCommandPalette}
            spotlightColor="rgba(245, 158, 11, 0.09)"
            borderGlowColor="rgba(245, 158, 11, 0.45)"
            className="w-full max-w-xl mx-auto mt-6 cursor-pointer rounded-xl bg-white/90 dark:bg-[#0C101A]/90 border border-slate-200/90 dark:border-white/[0.09] hover:border-amber-500/40 dark:hover:border-white/[0.16] shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] px-3.5 py-2.5 transition-all duration-200"
          >
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-xs sm:text-sm truncate transition-colors">
                  Jump to any topic, subtopic, or paper (e.g. 0580/22, Vectors, 0625/41)...
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="kbd-keycap">Ctrl K</kbd>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Unified Cambridge Telemetry Ribbon */}
        <SpotlightCard
          spotlightColor="rgba(245, 158, 11, 0.07)"
          borderGlowColor="rgba(148, 163, 184, 0.35)"
          className="mt-8 w-full max-w-4xl mx-auto rounded-2xl bg-white/95 dark:bg-[#0A0E17]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden"
        >
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200/70 dark:divide-white/[0.06]">
            {/* Cell 1: Total Questions */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Total Questions
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalQuestionsCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                4 Cambridge Subjects
              </div>
            </div>

            {/* Cell 2: Past Papers */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Past Papers
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalPapersCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                2019 – 2026 Series (Maths/Physics) • 2021 – 2026 (Chem/Bio)
              </div>
            </div>

            {/* Cell 3: Syllabus Transitions */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Syllabus Engine
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                2025+
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                Non-Calc P1/P2 Filter
              </div>
            </div>

            {/* Cell 4: Available Marks */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Available Marks
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalMarksCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                Official Mark Schemes
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Subject Portal Section Header */}
        <div className="w-full max-w-7xl mx-auto mt-12 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Cambridge IGCSE Portals</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a subject to begin topical practice or create customized mock tests
            </p>
          </div>
        </div>

        {/* 4 Cambridge Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-7xl mx-auto">
          {/* Card 1: Mathematics (0580, Amber Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(245, 158, 11, 0.12)"
            borderGlowColor="rgba(251, 191, 36, 0.45)"
            className="rounded-2xl surface-card p-5 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90 z-10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-400/40 text-white">
                  <Sigma className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  0580 · 2025 Ready
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors tracking-tight">
                Mathematics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Cambridge IGCSE (0580)
              </p>

              {/* Component Chips */}
              <div className="flex flex-wrap gap-1 mb-4">
                {['P1 Non-Calc', 'P2 Non-Calc', 'P3 Calc', 'P4 Calc'].map((u) => (
                  <span
                    key={u}
                    className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300"
                  >
                    {u}
                  </span>
                ))}
              </div>

              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-4 tabular-nums">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>{mathTotal.toLocaleString()} Questions</strong> ({mathPapers} papers)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>2025–2028 Non-Calculator transition filter</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Number, Algebra, Geometry, Stats &amp; Trig</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              <div className="mb-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    <span>Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {mathCompleted.toLocaleString()} / {mathTotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${mathCompleted > 0 ? Math.max(2, mathProgressPct) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('mathematics-topical')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Topical Explorer</span>
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('mathematics-test-maker')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Mock Builder</span>
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2: Physics (0625, Indigo Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(99, 102, 241, 0.12)"
            borderGlowColor="rgba(129, 140, 248, 0.45)"
            className="rounded-2xl surface-card p-5 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-90 z-10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/40 text-white">
                  <Atom className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  0625 · Space Physics
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors tracking-tight">
                Physics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Cambridge IGCSE (0625)
              </p>

              {/* Component Chips */}
              <div className="flex flex-wrap gap-1 mb-4">
                {['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'].map((u) => (
                  <span
                    key={u}
                    className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300"
                  >
                    {u}
                  </span>
                ))}
              </div>

              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-4 tabular-nums">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span><strong>{physTotal.toLocaleString()} Questions</strong> ({physPapers} papers)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Pre-2023 obsolete filtering (logic gates, manometers)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Motion, Thermal, Waves, Electricity &amp; Space</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              <div className="mb-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                    <span>Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {physCompleted.toLocaleString()} / {physTotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400"
                    style={{ width: `${physCompleted > 0 ? Math.max(2, physProgressPct) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('physics-topical')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Topical Explorer</span>
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('physics-test-maker')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Mock Builder</span>
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: Chemistry (0620, Cyan Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(6, 182, 212, 0.12)"
            borderGlowColor="rgba(34, 211, 238, 0.45)"
            className="rounded-2xl surface-card p-5 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-90 z-10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/40 text-white">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  0620 · Practical Ready
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors tracking-tight">
                Chemistry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Cambridge IGCSE (0620)
              </p>

              {/* Component Chips */}
              <div className="flex flex-wrap gap-1 mb-4">
                {['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'].map((u) => (
                  <span
                    key={u}
                    className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300"
                  >
                    {u}
                  </span>
                ))}
              </div>

              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-4 tabular-nums">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span><strong>{chemTotal.toLocaleString()} Questions</strong> ({chemPapers} papers)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span>Stoichiometry, Electrochemistry &amp; Organic</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span>Cation/anion qualitative analysis tables</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              <div className="mb-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                    <span>Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {chemCompleted.toLocaleString()} / {chemTotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{ width: `${chemCompleted > 0 ? Math.max(2, chemProgressPct) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('chemistry-topical')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Topical Explorer</span>
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('chemistry-test-maker')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Mock Builder</span>
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 4: Biology (0610, Emerald Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(16, 185, 129, 0.12)"
            borderGlowColor="rgba(52, 211, 153, 0.45)"
            className="rounded-2xl surface-card p-5 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90 z-10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/40 text-white">
                  <Dna className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  0610 · Genetics &amp; Eco
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors tracking-tight">
                Biology
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Cambridge IGCSE (0610)
              </p>

              {/* Component Chips */}
              <div className="flex flex-wrap gap-1 mb-4">
                {['P1/2 MCQ', 'P3/4 Theory', 'P6 Alt Practical'].map((u) => (
                  <span
                    key={u}
                    className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300"
                  >
                    {u}
                  </span>
                ))}
              </div>

              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-4 tabular-nums">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>{bioTotal.toLocaleString()} Questions</strong> ({bioPapers} papers)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Genetics, Inheritance, Ecology &amp; Human Physiology</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Biological diagrams, food tests &amp; magnification</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              <div className="mb-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {bioCompleted.toLocaleString()} / {bioTotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                    style={{ width: `${bioCompleted > 0 ? Math.max(2, bioProgressPct) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('biology-topical')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Topical Explorer</span>
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('biology-test-maker')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mock Builder</span>
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* 3-Column Bento Architecture */}
        <div className="w-full max-w-7xl mx-auto mt-14 pt-10 border-t border-slate-200 dark:border-white/[0.07]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                CAMBRIDGE ARCHITECTURE
              </span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                Engineered for Cambridge IGCSE
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rigorous syllabus conformity across all 4 subjects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Official Mock Exam Solver */}
            <SpotlightCard
              spotlightColor="rgba(245, 158, 11, 0.1)"
              borderGlowColor="rgba(251, 191, 36, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                    <Printer className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                    Mock Solver
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                  Deterministic Mock Exam Builder &amp; A4 PDF Generator
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Generates full Cambridge-standard mock papers with cover sheets, lined working space,
                  and mark schemes matching real exam specifications.
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap gap-1.5 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                {[
                  { label: '0580 P2 (75–100m)', accent: 'text-amber-600 dark:text-amber-300' },
                  { label: '0580 P4 (100–130m)', accent: 'text-amber-600 dark:text-amber-300' },
                  { label: 'Sciences MCQ (40m)', accent: 'text-indigo-600 dark:text-indigo-300' },
                  { label: 'Theory (80m)', accent: 'text-cyan-600 dark:text-cyan-300' },
                ].map((preset) => (
                  <span
                    key={preset.label}
                    className={`font-mono text-[10px] tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] ${preset.accent}`}
                  >
                    {preset.label}
                  </span>
                ))}
              </div>
            </SpotlightCard>

            {/* Bento Card 2: Split-Screen Canvas */}
            <SpotlightCard
              spotlightColor="rgba(99, 102, 241, 0.1)"
              borderGlowColor="rgba(129, 140, 248, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                    Split Canvas
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                  Split Viewer &amp; Interactive Annotation
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Full canvas annotation tools with anti-spoil mark scheme toggle, interactive MCQ choice bar,
                  and instant keyboard navigation.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                <span>Shortcuts</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="kbd-keycap">Space / M</kbd>
                  <kbd className="kbd-keycap">J / K</kbd>
                  <kbd className="kbd-keycap">B</kbd>
                </div>
              </div>
            </SpotlightCard>

            {/* Bento Card 3: Formula Sheet */}
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.1)"
              borderGlowColor="rgba(52, 211, 153, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                    Drawer Reference
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                  Official Cambridge Formula Sheets &amp; Tables
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Instant slide-over drawer with 0580 formulas, Periodic Table, Physics constants,
                  and qualitative chemical analysis testing notes.
                </p>
              </div>

              <div className="relative z-10 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={triggerDataBooklet}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/90 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Open Formula Sheet</span>
                  </span>
                  <kbd className="kbd-keycap">D</kbd>
                </button>
              </div>
            </SpotlightCard>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} Cambridge IGCSE Topicals. Past papers and mark schemes are copyright UCLES / Cambridge Assessment International Education.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('mathematics-topical')}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium"
            >
              Maths 0580
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('physics-topical')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              Physics 0625
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('chemistry-topical')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
            >
              Chemistry 0620
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('biology-topical')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
            >
              Biology 0610
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
