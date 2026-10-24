import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Compass,
  FileText,
  BookOpen,
  Home,
  FlaskConical,
  Atom,
  Sigma,
  Dna,
  Sun,
  Moon,
  FilterX,
  Bookmark,
  Eye,
  CornerDownLeft,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { AppView, QuestionItem, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  currentView: AppView;
  activeSubject: Subject;
  onNavigate: (view: AppView) => void;
  onToggleDataBooklet: () => void;
  onResetFilters: () => void;
  onSelectUnitFilter: (subject: Subject, unitLabel: string) => void;
  onSelectQuestion?: (subject: Subject, questionId: string) => void;
  onToggleMarkScheme?: () => void;
  onToggleBookmarkedOnly?: () => void;
  chemQuestions: QuestionItem[] | null;
  physQuestions: QuestionItem[] | null;
  mathQuestions: QuestionItem[] | null;
  bioQuestions?: QuestionItem[] | null;
}

type CommandCategory =
  | 'Navigation / Views'
  | 'Subject Switching'
  | 'Quick Actions'
  | 'Papers & Components'
  | 'Questions';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  keywords: string;
  icon: React.ReactNode;
  shortcut?: string;
  badge?: string;
  subjectAccent?: Subject;
  action: () => void;
}

// Canonical Cambridge IGCSE Paper Components directory
const CANONICAL_UNITS: Array<{
  code: string;
  unit: string;
  title: string;
  subject: Subject;
  keywords: string;
}> = [
  // Mathematics (0580)
  { code: '0580/P1', unit: 'Paper 1', title: '0580 Paper 1 — Core Non-Calculator (1h, 56 marks)', subject: 'mathematics', keywords: '0580 paper 1 p1 core non-calculator maths mathematics' },
  { code: '0580/P2', unit: 'Paper 2', title: '0580 Paper 2 — Extended Non-Calculator (1h 30m / 2h, 75–100 marks)', subject: 'mathematics', keywords: '0580 paper 2 p2 extended non-calculator maths mathematics' },
  { code: '0580/P3', unit: 'Paper 3', title: '0580 Paper 3 — Core Calculator (1h 30m / 2h, 84–104 marks)', subject: 'mathematics', keywords: '0580 paper 3 p3 core calculator maths mathematics' },
  { code: '0580/P4', unit: 'Paper 4', title: '0580 Paper 4 — Extended Calculator (2h / 2h 30m, 100–130 marks)', subject: 'mathematics', keywords: '0580 paper 4 p4 extended calculator maths mathematics' },

  // Physics (0625)
  { code: '0625/P1', unit: 'Paper 1', title: '0625 Paper 1 — Core Multiple Choice (45m, 40 marks)', subject: 'physics', keywords: '0625 paper 1 p1 core mcq multiple choice physics' },
  { code: '0625/P2', unit: 'Paper 2', title: '0625 Paper 2 — Extended Multiple Choice (45m, 40 marks)', subject: 'physics', keywords: '0625 paper 2 p2 extended mcq multiple choice physics' },
  { code: '0625/P3', unit: 'Paper 3', title: '0625 Paper 3 — Core Theory (1h 15m, 80 marks)', subject: 'physics', keywords: '0625 paper 3 p3 core theory physics' },
  { code: '0625/P4', unit: 'Paper 4', title: '0625 Paper 4 — Extended Theory (1h 15m, 80 marks)', subject: 'physics', keywords: '0625 paper 4 p4 extended theory physics' },
  { code: '0625/P6', unit: 'Paper 6', title: '0625 Paper 6 — Alternative to Practical (1h, 40 marks)', subject: 'physics', keywords: '0625 paper 6 p6 atp alternative practical skills physics' },

  // Chemistry (0620)
  { code: '0620/P1', unit: 'Paper 1', title: '0620 Paper 1 — Core Multiple Choice (45m, 40 marks)', subject: 'chemistry', keywords: '0620 paper 1 p1 core mcq multiple choice chemistry' },
  { code: '0620/P2', unit: 'Paper 2', title: '0620 Paper 2 — Extended Multiple Choice (45m, 40 marks)', subject: 'chemistry', keywords: '0620 paper 2 p2 extended mcq multiple choice chemistry' },
  { code: '0620/P3', unit: 'Paper 3', title: '0620 Paper 3 — Core Theory (1h 15m, 80 marks)', subject: 'chemistry', keywords: '0620 paper 3 p3 core theory chemistry' },
  { code: '0620/P4', unit: 'Paper 4', title: '0620 Paper 4 — Extended Theory (1h 15m, 80 marks)', subject: 'chemistry', keywords: '0620 paper 4 p4 extended theory chemistry' },
  { code: '0620/P6', unit: 'Paper 6', title: '0620 Paper 6 — Alternative to Practical (1h, 40 marks)', subject: 'chemistry', keywords: '0620 paper 6 p6 atp alternative practical skills chemistry' },

  // Biology (0610)
  { code: '0610/P1', unit: 'Paper 1', title: '0610 Paper 1 — Core Multiple Choice (45m, 40 marks)', subject: 'biology', keywords: '0610 paper 1 p1 core mcq multiple choice biology' },
  { code: '0610/P2', unit: 'Paper 2', title: '0610 Paper 2 — Extended Multiple Choice (45m, 40 marks)', subject: 'biology', keywords: '0610 paper 2 p2 extended mcq multiple choice biology' },
  { code: '0610/P3', unit: 'Paper 3', title: '0610 Paper 3 — Core Theory (1h 15m, 80 marks)', subject: 'biology', keywords: '0610 paper 3 p3 core theory biology' },
  { code: '0610/P4', unit: 'Paper 4', title: '0610 Paper 4 — Extended Theory (1h 15m, 80 marks)', subject: 'biology', keywords: '0610 paper 4 p4 extended theory biology' },
  { code: '0610/P6', unit: 'Paper 6', title: '0610 Paper 6 — Alternative to Practical (1h, 40 marks)', subject: 'biology', keywords: '0610 paper 6 p6 atp alternative practical skills biology' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpen,
  currentView,
  activeSubject,
  onNavigate,
  onToggleDataBooklet,
  onResetFilters,
  onSelectUnitFilter,
  onSelectQuestion,
  onToggleMarkScheme,
  onToggleBookmarkedOnly,
  chemQuestions,
  physQuestions,
  mathQuestions,
  bioQuestions,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Global Ctrl+K / Cmd+K and Escape listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [isOpen, onOpen, onClose]);

  // Reset search & focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 15);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const executeAndClose = useCallback(
    (fn: () => void) => {
      fn();
      onClose();
    },
    [onClose]
  );

  // Build static + dynamic command items
  const allCommands = useMemo<CommandItem[]>(() => {
    const activeSubjectLabel =
      activeSubject === 'mathematics'
        ? 'Mathematics (0580)'
        : activeSubject === 'physics'
        ? 'Physics (0625)'
        : activeSubject === 'biology'
        ? 'Biology (0610)'
        : 'Chemistry (0620)';

    const topicalView: AppView =
      activeSubject === 'mathematics'
        ? 'mathematics-topical'
        : activeSubject === 'physics'
        ? 'physics-topical'
        : activeSubject === 'biology'
        ? 'biology-topical'
        : 'chemistry-topical';

    const testMakerView: AppView =
      activeSubject === 'mathematics'
        ? 'mathematics-test-maker'
        : activeSubject === 'physics'
        ? 'physics-test-maker'
        : activeSubject === 'biology'
        ? 'biology-test-maker'
        : 'chemistry-test-maker';

    const baseItems: CommandItem[] = [
      // 1. Navigation / Views
      {
        id: 'nav-topical-active',
        title: `Open ${activeSubjectLabel} Topical Explorer`,
        subtitle: 'Browse past paper questions by paper, topic, and year',
        category: 'Navigation / Views',
        keywords: `topicals explorer questions ${activeSubject} browse practice`,
        icon: <Compass className="w-4 h-4" />,
        badge: currentView === topicalView ? 'Active' : undefined,
        subjectAccent: activeSubject,
        action: () => executeAndClose(() => onNavigate(topicalView)),
      },
      {
        id: 'nav-test-maker-active',
        title: `Open ${activeSubjectLabel} Mock Exam Builder`,
        subtitle: 'Auto-generate or build custom printable PDF mock exams',
        category: 'Navigation / Views',
        keywords: `test maker mock exam custom paper print pdf worksheet ${activeSubject}`,
        icon: <FileText className="w-4 h-4" />,
        badge: currentView === testMakerView ? 'Active' : undefined,
        subjectAccent: activeSubject,
        action: () => executeAndClose(() => onNavigate(testMakerView)),
      },
      {
        id: 'nav-home',
        title: 'Go to Cambridge Portal Dashboard',
        subtitle: 'Overview of all 4 subjects, specifications & progress telemetry',
        category: 'Navigation / Views',
        keywords: 'home portal dashboard overview landing switch subjects',
        icon: <Home className="w-4 h-4" />,
        badge: currentView === 'home' ? 'Active' : undefined,
        action: () => executeAndClose(() => onNavigate('home')),
      },

      // 2. Subject Switching
      {
        id: 'switch-maths',
        title: 'Switch to Mathematics (0580)',
        subtitle: 'Cambridge IGCSE Core & Extended (Papers 1–4, 2025+ Non-Calc)',
        category: 'Subject Switching',
        keywords: 'mathematics maths 0580 pure number algebra geometry trig non-calc calc',
        icon: <Sigma className="w-4 h-4 text-amber-500" />,
        badge: activeSubject === 'mathematics' ? 'Current' : undefined,
        subjectAccent: 'mathematics',
        action: () => executeAndClose(() => onNavigate('mathematics-topical')),
      },
      {
        id: 'switch-physics',
        title: 'Switch to Physics (0625)',
        subtitle: 'Cambridge IGCSE Core & Extended (Papers 1–4, 6)',
        category: 'Subject Switching',
        keywords: 'physics 0625 mechanics thermal waves electricity space atp',
        icon: <Atom className="w-4 h-4 text-indigo-500" />,
        badge: activeSubject === 'physics' ? 'Current' : undefined,
        subjectAccent: 'physics',
        action: () => executeAndClose(() => onNavigate('physics-topical')),
      },
      {
        id: 'switch-chemistry',
        title: 'Switch to Chemistry (0620)',
        subtitle: 'Cambridge IGCSE Core & Extended (Papers 1–4, 6)',
        category: 'Subject Switching',
        keywords: 'chemistry 0620 states atoms stoichiometry reactions acids organic atp',
        icon: <FlaskConical className="w-4 h-4 text-cyan-500" />,
        badge: activeSubject === 'chemistry' ? 'Current' : undefined,
        subjectAccent: 'chemistry',
        action: () => executeAndClose(() => onNavigate('chemistry-topical')),
      },
      {
        id: 'switch-biology',
        title: 'Switch to Biology (0610)',
        subtitle: 'Cambridge IGCSE Core & Extended (Papers 1–4, 6)',
        category: 'Subject Switching',
        keywords: 'biology 0610 cells organisms nutrition transport genetics ecology atp',
        icon: <Dna className="w-4 h-4 text-emerald-500" />,
        badge: activeSubject === 'biology' ? 'Current' : undefined,
        subjectAccent: 'biology',
        action: () => executeAndClose(() => onNavigate('biology-topical')),
      },

      // 3. Quick Actions
      {
        id: 'action-formulae',
        title: 'Open Cambridge Formula Sheets & Tables',
        subtitle: '0580 formulas, Periodic Table, constants & analysis notes',
        category: 'Quick Actions',
        keywords: 'data booklet formula sheet tables periodic table constants notes',
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        shortcut: 'D',
        action: () => executeAndClose(onToggleDataBooklet),
      },
      {
        id: 'action-reset-filters',
        title: 'Reset All Active Filters',
        subtitle: 'Clear all paper, subtopic, year, and tier filters',
        category: 'Quick Actions',
        keywords: 'reset clear all filters remove selection',
        icon: <FilterX className="w-4 h-4 text-rose-500" />,
        action: () => executeAndClose(onResetFilters),
      },
      {
        id: 'action-toggle-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: `Currently in ${theme === 'dark' ? 'Dark' : 'Light'} theme`,
        category: 'Quick Actions',
        keywords: 'theme dark mode light mode day night color toggle',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />,
        action: () => executeAndClose(toggleTheme),
      },
    ];

    if (onToggleMarkScheme) {
      baseItems.push({
        id: 'action-toggle-ms',
        title: 'Toggle Mark Scheme Visibility',
        subtitle: 'Switch between Question Only and Split View (Anti-Spoil)',
        category: 'Quick Actions',
        keywords: 'mark scheme ms answers show hide toggle reveal',
        icon: <Eye className="w-4 h-4 text-cyan-400" />,
        shortcut: 'Space / M',
        action: () => executeAndClose(onToggleMarkScheme),
      });
    }

    if (onToggleBookmarkedOnly) {
      baseItems.push({
        id: 'action-toggle-bookmarks',
        title: 'Filter Bookmarked Questions Only',
        subtitle: 'Show only flagged questions saved for revision review',
        category: 'Quick Actions',
        keywords: 'bookmarks starred flagged saved review filter',
        icon: <Bookmark className="w-4 h-4 text-amber-500" />,
        shortcut: 'B',
        action: () => executeAndClose(onToggleBookmarkedOnly),
      });
    }

    // 4. Papers & Components
    const unitItems: CommandItem[] = CANONICAL_UNITS.map((u) => ({
      id: `unit-${u.code.toLowerCase().replace('/', '-')}`,
      title: `${u.title}`,
      subtitle: `Filter to ${u.unit} (${u.code}) in ${u.subject === 'mathematics' ? 'Maths 0580' : u.subject === 'physics' ? 'Physics 0625' : u.subject === 'biology' ? 'Biology 0610' : 'Chemistry 0620'}`,
      category: 'Papers & Components',
      keywords: `${u.keywords} ${u.code} ${u.title}`,
      icon: <Layers className="w-4 h-4" />,
      badge: u.code,
      subjectAccent: u.subject,
      action: () => executeAndClose(() => onSelectUnitFilter(u.subject, u.code)),
    }));

    return [...baseItems, ...unitItems];
  }, [
    activeSubject,
    currentView,
    theme,
    onNavigate,
    onToggleDataBooklet,
    onResetFilters,
    toggleTheme,
    onToggleMarkScheme,
    onToggleBookmarkedOnly,
    onSelectUnitFilter,
    executeAndClose,
  ]);

  // Dynamic question search across loaded questions
  const dynamicQuestionCommands = useMemo<CommandItem[]>(() => {
    if (!onSelectQuestion) return [];
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    const activePool =
      activeSubject === 'mathematics'
        ? mathQuestions
        : activeSubject === 'physics'
        ? physQuestions
        : activeSubject === 'biology'
        ? bioQuestions
        : chemQuestions;

    if (!activePool || activePool.length === 0) return [];

    const matches: CommandItem[] = [];
    for (const q of activePool) {
      const qNum = String(q.questionNumber || q.question_number || '').toLowerCase();
      const topic = (q.topic || '').toLowerCase();
      const subtopic = (q.subtopic || '').toLowerCase();
      const id = q.id.toLowerCase();

      if (qNum.includes(trimmed) || topic.includes(trimmed) || subtopic.includes(trimmed) || id.includes(trimmed)) {
        matches.push({
          id: `q-${q.id}`,
          title: `Question ${q.questionNumber || q.question_number || '1'} (${q.marks || q.total_marks || 1}m) — ${q.subtopic || q.topic || 'Topical Question'}`,
          subtitle: `${q.id} • ${q.series ? q.series.toUpperCase() : ''}${q.year || ''}`,
          category: 'Questions',
          keywords: `${q.id} ${qNum} ${topic} ${subtopic}`,
          icon: <Sparkles className="w-4 h-4 text-amber-500" />,
          badge: `${q.marks || q.total_marks || 1}m`,
          subjectAccent: activeSubject,
          action: () => executeAndClose(() => onSelectQuestion(activeSubject, q.id)),
        });
        if (matches.length >= 10) break;
      }
    }

    return matches;
  }, [query, activeSubject, mathQuestions, physQuestions, chemQuestions, bioQuestions, onSelectQuestion, executeAndClose]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return allCommands;
    }

    const staticMatches = allCommands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(trimmed) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(trimmed)) ||
        cmd.keywords.toLowerCase().includes(trimmed)
      );
    });

    return [...dynamicQuestionCommands, ...staticMatches];
  }, [query, allCommands, dynamicQuestionCommands]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 dark:bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center gap-3 shrink-0">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, subject, paper (e.g. 0580/22, Vectors), or keyword..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="kbd-keycap shrink-0">Esc</kbd>
        </div>

        {/* Command List Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No commands found</p>
              <p className="text-[11px] text-slate-500 mt-1">Try searching for a subject, paper, or keyword</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-slate-900 dark:text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 shrink-0">
                      {cmd.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{cmd.title}</span>
                        {cmd.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      {cmd.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd className="kbd-keycap text-[10px] shrink-0">{cmd.shortcut}</kbd>
                  )}
                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-9 px-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="kbd-keycap mr-1">↑</kbd>
              <kbd className="kbd-keycap mr-1">↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="kbd-keycap mr-1">↵</kbd>
              Select
            </span>
          </div>
          <span>Cambridge IGCSE Commands</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
