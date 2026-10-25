import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Plus,
  Check,
  Search,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Printer,
  AlertCircle,
  X,
  Eye,
  Zap,
  ChevronDown,
  Shuffle,
  PlayCircle,
  Calculator,
  Ban,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  Award,
  Layers,
  Columns,
} from 'lucide-react';
import {
  QuestionItem,
  FilterState,
  Subject,
  SubjectCode,
  subjectSlugToCode,
  getPresetsForSubject,
  MockExamPreset,
  SyllabusEra,
} from '../types';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { SubtopicGroup, buildStaticSubtopicHierarchy } from '../constants/taxonomy';
import { getQuestionType, getQuestionSubject } from '../utils/questionClassification';
import { sortQuestionsLatestFirst } from './QuestionList';
import { ImageCanvas } from './ImageCanvas';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';
import { useProgress } from '../context/ProgressContext';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';
import {
  autoGenerateExam,
  ExamStructure,
  SmartGenerateMode,
} from '../utils/examGenerator';
import { calculateExamDurationMinutes, formatDuration } from '../utils/examDuration';
import { MockSittingModal } from './MockSittingModal';
import { FullPaperPresetsModal } from './FullPaperPresetsModal';

export { autoGenerateExam };
export type { SmartGenerateMode, ExamStructure };

interface TestMakerPageProps {
  subject?: Subject;
  questions: QuestionItem[];
  cartQuestionIds: string[];
  onAddToCart: (id: string) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onReorderCart: (newIds: string[]) => void;
  testTitle: string;
  onSetTestTitle: (title: string) => void;
}

const PAGE_SIZE = 15;

const DEFAULT_EXAM_TITLES: Record<Subject, string> = {
  mathematics: 'Cambridge IGCSE Mathematics (0580) Topical Quiz',
  physics: 'Cambridge IGCSE Physics (0625) Topical Quiz',
  chemistry: 'Cambridge IGCSE Chemistry (0620) Topical Quiz',
  biology: 'Cambridge IGCSE Biology (0610) Topical Quiz',
};

const TARGET_PRESETS = [
  { marks: 20, label: '20m', desc: 'Quiz' },
  { marks: 40, label: '40m', desc: 'Homework' },
  { marks: 50, label: '50m', desc: 'Test' },
];

export const TestMakerPage: React.FC<TestMakerPageProps> = ({
  subject,
  questions,
  cartQuestionIds,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onReorderCart,
  testTitle,
  onSetTestTitle,
}) => {
  // Detect active subject
  const activeSubject: Subject = useMemo(() => {
    return subject || getQuestionSubject(questions[0]) || 'mathematics';
  }, [subject, questions]);

  const subjectCode: SubjectCode = useMemo(() => {
    return subjectSlugToCode(activeSubject);
  }, [activeSubject]);

  const isMath = activeSubject === 'mathematics';

  // Subject reactive color classes
  const accentClasses = useMemo(() => {
    switch (activeSubject) {
      case 'mathematics':
        return {
          primary: 'amber',
          text: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-50 dark:bg-amber-500/15',
          border: 'border-amber-300 dark:border-amber-500/30',
          gradient: 'from-amber-500 to-amber-600',
          shadow: 'shadow-amber-500/25',
          spotlight: 'rgba(245, 158, 11, 0.12)',
          borderGlow: 'rgba(245, 158, 11, 0.45)',
        };
      case 'physics':
        return {
          primary: 'indigo',
          text: 'text-indigo-500 dark:text-indigo-400',
          bg: 'bg-indigo-500',
          bgLight: 'bg-indigo-50 dark:bg-indigo-500/15',
          border: 'border-indigo-300 dark:border-indigo-500/30',
          gradient: 'from-indigo-500 to-indigo-600',
          shadow: 'shadow-indigo-500/25',
          spotlight: 'rgba(99, 102, 241, 0.12)',
          borderGlow: 'rgba(99, 102, 241, 0.45)',
        };
      case 'biology':
        return {
          primary: 'emerald',
          text: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-50 dark:bg-emerald-500/15',
          border: 'border-emerald-300 dark:border-emerald-500/30',
          gradient: 'from-emerald-500 to-emerald-600',
          shadow: 'shadow-emerald-500/25',
          spotlight: 'rgba(16, 185, 129, 0.12)',
          borderGlow: 'rgba(16, 185, 129, 0.45)',
        };
      case 'chemistry':
      default:
        return {
          primary: 'cyan',
          text: 'text-cyan-500 dark:text-cyan-400',
          bg: 'bg-cyan-500',
          bgLight: 'bg-cyan-50 dark:bg-cyan-500/15',
          border: 'border-cyan-300 dark:border-cyan-500/30',
          gradient: 'from-cyan-500 to-cyan-600',
          shadow: 'shadow-cyan-500/25',
          spotlight: 'rgba(6, 182, 212, 0.12)',
          borderGlow: 'rgba(6, 182, 212, 0.45)',
        };
    }
  }, [activeSubject]);

  // Center preview state: question currently being inspected
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'question' | 'ms' | 'split'>('split');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExportingQP, setIsExportingQP] = useState<boolean>(false);
  const [isExportingMS, setIsExportingMS] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [includeFormalHeader, setIncludeFormalHeader] = useState<boolean>(false);
  const [includeSourceTags, setIncludeSourceTags] = useState<boolean>(false);
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState<boolean>(false);

  // In-Browser Sitting Mode & Full Paper Presets Modals
  const [isSittingModalOpen, setIsSittingModalOpen] = useState<boolean>(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);

  // Responsive state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'pool' | 'preview' | 'cart'>('pool');

  // Progressive Disclosure: Popover State & Ref
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Question search and filtering state
  const [filters, setFilters] = useState<FilterState>({
    selectedUnits: [],
    selectedSubtopics: [],
    selectedYears: [],
    selectedSeries: [],
    searchQuery: '',
    statusFilter: 'all',
    questionType: 'all',
    bookmarkedOnly: false,
    selectedTier: 'extended',
    hideObsolete: true,
    variant: 'all',
    syllabusEra: isMath ? 'all' : '2025-2028',
  });

  const [marksFilter, setMarksFilter] = useState<string>('all');
  const [selectedPaperNums, setSelectedPaperNums] = useState<number[]>([]);
  const [searchInput, setSearchInput] = useState<string>(filters.searchQuery);
  const [calcFilter, setCalcFilter] = useState<'all' | 'calc' | 'non-calc'>('all');

  // Mark Target & Smart Auto-Generate Mock Exam State
  const [targetMarks, setTargetMarks] = useState<number>(40); // default 40m topical quiz
  const [isCustomTargetOpen, setIsCustomTargetOpen] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>('40');
  const [generateMode, setGenerateMode] = useState<SmartGenerateMode>('balanced');
  const [examStructure, setExamStructure] = useState<ExamStructure>(isMath ? 'theory_only' : 'authentic');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isSmartGenerateOpen, setIsSmartGenerateOpen] = useState<boolean>(false);
  const [lastGeneratedInfo, setLastGeneratedInfo] = useState<string | null>(null);

  // Official Cambridge Mock Presets for this subject
  const officialPresets: MockExamPreset[] = useMemo(() => {
    return getPresetsForSubject(subjectCode);
  }, [subjectCode]);

  // Click outside to close Filter Popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setIsFilterPopoverOpen(false);
      }
    };
    if (isFilterPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPopoverOpen]);

  // Clean cross-subject state reset when switching subjects inside Test Maker
  useEffect(() => {
    setFilters({
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
      selectedTier: 'extended',
      hideObsolete: true,
      variant: 'all',
      syllabusEra: isMath ? 'all' : '2025-2028',
    });
    setSearchInput('');
    setMarksFilter('all');
    setSelectedPaperNums([]);
    setCurrentPage(1);
    setLastGeneratedInfo(null);
    setSelectedPresetId(null);
    setCalcFilter('all');
    setTargetMarks(40);
    setCustomTargetInput('40');
    setIsCustomTargetOpen(false);
    setIsFilterPopoverOpen(false);
    setIsPresetsModalOpen(false);
    setExamStructure(isMath ? 'theory_only' : 'authentic');
    setPreviewQuestionId(questions[0]?.id || null);

    const isDefaultTitle = Object.values(DEFAULT_EXAM_TITLES).includes(testTitle);
    if (isDefaultTitle || !testTitle) {
      onSetTestTitle(DEFAULT_EXAM_TITLES[activeSubject]);
    }
  }, [activeSubject]);

  const { questionStatuses, bookmarks } = useProgress();

  // Debounced search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.searchQuery !== searchInput) {
        setFilters((prev) => ({ ...prev, searchQuery: searchInput }));
        setCurrentPage(1);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput, filters.searchQuery]);

  // Available filter options
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    questions.forEach((q) => { if (q.year) years.add(q.year); });
    return Array.from(years).sort((a, b) => b - a);
  }, [questions]);

  const seriesList = [
    { value: 'm', label: 'Feb/Mar (m)' },
    { value: 's', label: 'May/Jun (s)' },
    { value: 'w', label: 'Oct/Nov (w)' },
  ];

  // Canonical Subtopic Hierarchy
  const subtopicHierarchy: SubtopicGroup[] = useMemo(() => {
    return buildStaticSubtopicHierarchy([], questions, activeSubject);
  }, [questions, activeSubject]);

  // Active secondary filter count (Paper, Year, Series, Variant, Calc, Marks, Syllabus Era/Obsolete)
  const activeSecondaryCount = useMemo(() => {
    let count = 0;
    if (selectedPaperNums.length > 0) count++;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.variant && filters.variant !== 'all') count++;
    if (calcFilter !== 'all') count++;
    if (marksFilter !== 'all') count++;
    if (isMath && filters.syllabusEra && filters.syllabusEra !== 'all') count++;
    if (filters.hideObsolete === false) count++;
    return count;
  }, [
    selectedPaperNums,
    filters.selectedYears,
    filters.selectedSeries,
    filters.variant,
    calcFilter,
    marksFilter,
    isMath,
    filters.syllabusEra,
    filters.hideObsolete,
  ]);

  const handleResetSecondaryFilters = () => {
    setSelectedPaperNums([]);
    setFilters((prev) => ({
      ...prev,
      selectedYears: [],
      selectedSeries: [],
      variant: 'all',
      syllabusEra: isMath ? 'all' : '2025-2028',
      hideObsolete: true,
    }));
    setCalcFilter('all');
    setMarksFilter('all');
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setSearchInput('');
    setSelectedPaperNums([]);
    setFilters({
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
      selectedTier: 'extended',
      hideObsolete: true,
      variant: 'all',
      syllabusEra: isMath ? 'all' : '2025-2028',
    });
    setCalcFilter('all');
    setMarksFilter('all');
    setCurrentPage(1);
  };

  // Filter the question pool
  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      // 0a. Syllabus Era (0580 Mathematics)
      if (isMath && filters.syllabusEra && filters.syllabusEra !== 'all') {
        const qYear = q.year || 2025;
        if (filters.syllabusEra === '2025-2028' && (qYear < 2025 || qYear > 2026)) return false;
        if ((filters.syllabusEra === '2019-2024' || filters.syllabusEra === '2020-2024') && (qYear < 2019 || qYear > 2024)) return false;
      }

      // 0b. Paper Variant filter ('all' | 1 | 2 | 3)
      if (filters.variant && filters.variant !== 'all') {
        const qVar = Number(q.variant || 0);
        if (qVar !== Number(filters.variant)) return false;
      }

      // Obsolete filter (Tests removed Cambridge syllabus content)
      if (filters.hideObsolete && (q.is_obsolete || q.obsolete)) return false;

      // Tier filter
      if (filters.selectedTier && filters.selectedTier !== 'all') {
        if (filters.selectedTier === 'extended') {
          const isExtended =
            q.tier === 'extended' ||
            q.paper === 2 ||
            q.paper === 4 ||
            (q.paper === 6 && !isMath);
          if (!isExtended) return false;
        } else if (filters.selectedTier === 'core') {
          const isCore = q.tier === 'core' || q.paper === 1 || q.paper === 3;
          if (!isCore) return false;
        }
      }

      // Paper Number filter
      if (selectedPaperNums.length > 0) {
        if (!q.paper || !selectedPaperNums.includes(q.paper)) return false;
      }

      // Calculator filter (Maths 0580)
      if (calcFilter === 'non-calc' && q.calculator_allowed !== false) return false;
      if (calcFilter === 'calc' && q.calculator_allowed === false) return false;

      // Subtopics filter
      if (filters.selectedSubtopics.length > 0) {
        const matchesSubtopic =
          (q.subtopics && q.subtopics.some((s) => filters.selectedSubtopics.includes(s))) ||
          (q.subtopic && filters.selectedSubtopics.includes(q.subtopic));
        if (!matchesSubtopic) return false;
      }

      // Year filter
      if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(String(q.year))) {
        return false;
      }

      // Series filter
      if (filters.selectedSeries.length > 0) {
        const qSeries = (q.series || '').toLowerCase();
        const matches = filters.selectedSeries.some((s) => qSeries.includes(s.toLowerCase()));
        if (!matches) return false;
      }

      // Question Type filter
      if (filters.questionType !== 'all') {
        const isMcq = q.is_mcq || getQuestionType(q) === 'mcq';
        if (filters.questionType === 'mcq' && !isMcq) return false;
        if (filters.questionType === 'theory' && isMcq) return false;
      }

      // Marks filter
      if (marksFilter !== 'all') {
        const marks = q.marks || 0;
        if (isMath) {
          if (marksFilter === '1-4m' && (marks < 1 || marks > 4)) return false;
          if (marksFilter === '5-7m' && (marks < 5 || marks > 7)) return false;
          if (marksFilter === '8-10m' && (marks < 8 || marks > 10)) return false;
          if (marksFilter === '11m+' && marks < 11) return false;
        } else {
          if (marksFilter === '1m' && marks !== 1) return false;
          if (marksFilter === '2-3m' && (marks < 2 || marks > 3)) return false;
          if (marksFilter === '4-5m' && (marks < 4 || marks > 5)) return false;
          if (marksFilter === '6m+' && marks < 6) return false;
        }
      }

      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const qNum = String(q.question_number ?? q.questionNumber ?? '');
        const matchQNum = qNum.toLowerCase().includes(query) || q.id.toLowerCase().includes(query);
        const matchTopic = (q.topic || '').toLowerCase().includes(query);
        const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query);
        const matchSubs = (q.subtopics || []).some((s) => s.toLowerCase().includes(query));
        if (!matchQNum && !matchTopic && !matchSubtopic && !matchSubs) {
          return false;
        }
      }

      return true;
    }).sort(sortQuestionsLatestFirst);
  }, [questions, filters, marksFilter, selectedPaperNums, calcFilter, isMath]);

  const totalPages = Math.max(1, Math.ceil(filteredPool.length / PAGE_SIZE));
  const pagedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPool.slice(start, start + PAGE_SIZE);
  }, [filteredPool, currentPage]);

  // Set active preview question default to first filtered question if none selected
  useEffect(() => {
    if (!previewQuestionId && filteredPool.length > 0) {
      setPreviewQuestionId(filteredPool[0].id);
    }
  }, [filteredPool, previewQuestionId]);

  const activePreviewQuestion = useMemo(() => {
    if (!previewQuestionId) return null;
    return questions.find((q) => q.id === previewQuestionId) || null;
  }, [questions, previewQuestionId]);

  // Current question index in filteredPool for keyboard navigation
  const currentFilteredIndex = useMemo(() => {
    if (!previewQuestionId) return -1;
    return filteredPool.findIndex((q) => q.id === previewQuestionId);
  }, [filteredPool, previewQuestionId]);

  const goToNextQuestion = () => {
    if (filteredPool.length === 0) return;
    const nextIdx = currentFilteredIndex < filteredPool.length - 1 ? currentFilteredIndex + 1 : 0;
    const nextQ = filteredPool[nextIdx];
    if (nextQ) {
      setPreviewQuestionId(nextQ.id);
      const targetPage = Math.floor(nextIdx / PAGE_SIZE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  const goToPrevQuestion = () => {
    if (filteredPool.length === 0) return;
    const prevIdx = currentFilteredIndex > 0 ? currentFilteredIndex - 1 : filteredPool.length - 1;
    const prevQ = filteredPool[prevIdx];
    if (prevQ) {
      setPreviewQuestionId(prevQ.id);
      const targetPage = Math.floor(prevIdx / PAGE_SIZE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  const handleToggleCartActive = () => {
    if (!activePreviewQuestion) return;
    if (cartQuestionIds.includes(activePreviewQuestion.id)) {
      onRemoveFromCart(activePreviewQuestion.id);
    } else {
      onAddToCart(activePreviewQuestion.id);
    }
  };

  // Global Keyboard Navigation in Test Maker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      // Escape always closes open popovers or modals
      if (e.key === 'Escape') {
        setIsFilterPopoverOpen(false);
        setIsPresetsModalOpen(false);
        setIsSittingModalOpen(false);
        return;
      }

      // If presets modal or sitting modal is open, avoid background navigation
      if (isPresetsModalOpen || isSittingModalOpen) {
        return;
      }

      // ArrowRight / ArrowDown / k / K: Next question in the filtered list
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        goToNextQuestion();
        return;
      }

      // ArrowLeft / ArrowUp / j / J: Previous question in the filtered list
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        goToPrevQuestion();
        return;
      }

      // Space: Toggle Mark Scheme preview mode between Question only and Side-by-Side
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setPreviewTab((prev) => (prev === 'split' ? 'question' : 'split'));
        return;
      }

      // Enter or KeyA: Toggle add/remove active preview question to/from quiz cart
      if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleToggleCartActive();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPresetsModalOpen,
    isSittingModalOpen,
    filteredPool,
    currentFilteredIndex,
    currentPage,
    activePreviewQuestion,
    cartQuestionIds,
  ]);

  // Full Cart Question objects preserving cart question ID order
  const cartQuestions = useMemo(() => {
    const qMap = new Map<string, QuestionItem>();
    questions.forEach((q) => qMap.set(q.id, q));
    return cartQuestionIds
      .map((id) => qMap.get(id))
      .filter((q): q is QuestionItem => q !== undefined);
  }, [questions, cartQuestionIds]);

  const totalCartMarks = useMemo(() => {
    return cartQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [cartQuestions]);

  // Check if any question in cart is non-calculator
  const cartHasNonCalc = useMemo(() => {
    return cartQuestions.some((q) => q.calculator_allowed === false);
  }, [cartQuestions]);

  // Topic distribution breakdown in cart
  const topicDistribution = useMemo(() => {
    const map = new Map<string, number>();
    cartQuestions.forEach((q) => {
      const topicName = q.topic || 'General';
      map.set(topicName, (map.get(topicName) || 0) + (q.marks || 1));
    });
    return Array.from(map.entries()).map(([name, marks]) => ({
      name,
      marks,
      percent: totalCartMarks > 0 ? Math.round((marks / totalCartMarks) * 100) : 0,
    }));
  }, [cartQuestions, totalCartMarks]);

  // Estimated standard duration
  const targetTimeMinutes = useMemo(() => {
    const isMcqOnly = cartQuestions.length > 0 && cartQuestions.every((q) => q.is_mcq);
    return calculateExamDurationMinutes(totalCartMarks, subjectCode, {
      isMcqOnly,
      paper: cartQuestions[0]?.paper,
    });
  }, [totalCartMarks, subjectCode, cartQuestions]);

  // 1-Click Cambridge Preset Selection Handler (Called from FullPaperPresetsModal)
  const handleApplyPreset = (preset: MockExamPreset) => {
    setSelectedPresetId(preset.id);
    setTargetMarks(preset.targetMarks);
    setCustomTargetInput(String(preset.targetMarks));
    setIsCustomTargetOpen(false);
    onSetTestTitle(`${preset.label} Mock`);

    let calcOption: 'all' | 'calc' | 'non-calc' = 'all';
    if (preset.calculatorAllowed === false) calcOption = 'non-calc';
    else if (preset.calculatorAllowed === true && isMath) calcOption = 'calc';
    setCalcFilter(calcOption);

    const structure: ExamStructure = preset.isMcqOnly
      ? 'mcq_sprint'
      : isMath
      ? 'theory_only'
      : 'authentic';
    setExamStructure(structure);

    const paperNum = parseInt(preset.component.replace('paper', ''), 10) || undefined;
    if (paperNum) setSelectedPaperNums([paperNum]);
    else setSelectedPaperNums([]);
    setFilters((prev) => ({
      ...prev,
      selectedTier: preset.tier,
      syllabusEra: (preset.syllabusEra as SyllabusEra) || prev.syllabusEra,
    }));

    const pool = questions.filter((q) => {
      if (preset.syllabusEra && preset.syllabusEra !== 'all') {
        const qYear = q.year || 2025;
        if (preset.syllabusEra === '2025-2028' && (qYear < 2025 || qYear > 2026)) return false;
        if ((preset.syllabusEra === '2019-2024' || preset.syllabusEra === '2020-2024') && (qYear < 2019 || qYear > 2024)) return false;
      }
      if (preset.tier && preset.tier !== 'practical' && q.tier && q.tier !== preset.tier) {
        if (preset.tier === 'extended' && q.paper !== 2 && q.paper !== 4 && q.paper !== 6) return false;
        if (preset.tier === 'core' && q.paper !== 1 && q.paper !== 3) return false;
      }
      if (paperNum && q.paper !== paperNum) return false;
      if (preset.isMcqOnly && !q.is_mcq) return false;
      if (!preset.isMcqOnly && preset.id.includes('theory') && q.is_mcq) return false;
      if (preset.calculatorAllowed === false && q.calculator_allowed !== false) return false;
      if (q.is_obsolete || q.obsolete) return false;
      return true;
    });

    const activePool = pool.length >= 5 ? pool : questions.filter((q) => !(q.is_obsolete || q.obsolete));

    const { selected, actualMarks } = autoGenerateExam(activePool, {
      targetMarks: preset.targetMarks,
      questionCount: preset.questionCount,
      mode: 'balanced',
      structure,
      selectedComponents: paperNum ? [paperNum] : undefined,
      tier: preset.tier,
      calculatorAllowed: preset.calculatorAllowed,
      isMcqOnly: preset.isMcqOnly,
      hideObsolete: true,
      questionStatuses,
      bookmarks,
    });

    if (selected.length > 0) {
      const newIds = selected.map((q) => q.id);
      onReorderCart(newIds);
      setPreviewQuestionId(newIds[0]);
      setLastGeneratedInfo(`${selected.length} Qs • ${actualMarks}m`);
    }
  };

  // Progressive Fill Remaining Handler: Appends questions to cart up to targetMarks
  const handleFillRemaining = () => {
    const neededMarks = targetMarks - totalCartMarks;
    if (neededMarks <= 0) return;

    const basePool = (filteredPool.length > 0 ? filteredPool : questions)
      .filter((q) => !cartQuestionIds.includes(q.id));

    if (basePool.length === 0) {
      alert('No remaining questions match your active filters. Try broadening your filters or clearing subtopics.');
      return;
    }

    const { selected, actualMarks } = autoGenerateExam(basePool, {
      targetMarks: neededMarks,
      mode: generateMode,
      structure: examStructure,
      tier: filters.selectedTier,
      selectedComponents: selectedPaperNums.length > 0 ? selectedPaperNums : undefined,
      calculatorAllowed: calcFilter === 'non-calc' ? false : calcFilter === 'calc' ? true : undefined,
      hideObsolete: filters.hideObsolete,
      questionStatuses,
      bookmarks,
    });

    if (selected.length === 0) {
      alert('Could not match remaining questions to target marks. Try relaxing your filters.');
      return;
    }

    const newIds = [...cartQuestionIds, ...selected.map((q) => q.id)];
    onReorderCart(newIds);
    if (!previewQuestionId && selected.length > 0) {
      setPreviewQuestionId(selected[0].id);
    }
    setLastGeneratedInfo(`+${selected.length} Qs • +${actualMarks}m added`);
  };

  // Fresh Auto-Generate Quiz Handler
  const handleSmartGenerate = () => {
    const pool = filteredPool.length > 0 ? filteredPool : questions;
    if (pool.length === 0) {
      alert('No questions available in the current filter pool. Please relax your filters.');
      return;
    }

    const { selected, actualMarks } = autoGenerateExam(pool, {
      targetMarks,
      mode: generateMode,
      structure: examStructure,
      tier: filters.selectedTier,
      selectedComponents: selectedPaperNums.length > 0 ? selectedPaperNums : undefined,
      calculatorAllowed: calcFilter === 'non-calc' ? false : calcFilter === 'calc' ? true : undefined,
      hideObsolete: filters.hideObsolete,
      questionStatuses,
      bookmarks,
    });

    if (selected.length === 0) {
      alert('Could not match questions to target marks. Please broaden your filters.');
      return;
    }

    const newIds = selected.map((q) => q.id);
    onReorderCart(newIds);
    setPreviewQuestionId(newIds[0]);
    onSetTestTitle(`${DEFAULT_EXAM_TITLES[activeSubject]} (${actualMarks}m)`);
    setLastGeneratedInfo(`${selected.length} Qs • ${actualMarks}m`);
  };

  const handleShuffleCart = () => {
    if (cartQuestionIds.length <= 1) return;
    const shuffled = [...cartQuestionIds].sort(() => Math.random() - 0.5);
    onReorderCart(shuffled);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index - 1];
    newIds[index - 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  const handleMoveDown = (index: number) => {
    if (index >= cartQuestionIds.length - 1) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index + 1];
    newIds[index + 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  // PDF Export Handlers
  const handleExportQP = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingQP(true);
    setExportStatus('Generating Question Paper PDF...');
    try {
      const { generateQuestionPaperPDF } = await import('../utils/pdfGenerator');
      await generateQuestionPaperPDF({
        title: testTitle || DEFAULT_EXAM_TITLES[activeSubject],
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Question Paper PDF. Check console for details.');
    } finally {
      setIsExportingQP(false);
      setExportStatus('');
    }
  };

  const handleExportMS = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingMS(true);
    setExportStatus('Generating Mark Scheme PDF...');
    try {
      const { generateMarkSchemePDF } = await import('../utils/pdfGenerator');
      await generateMarkSchemePDF({
        title: testTitle || DEFAULT_EXAM_TITLES[activeSubject],
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Mark Scheme PDF. Check console for details.');
    } finally {
      setIsExportingMS(false);
      setExportStatus('');
    }
  };

  const togglePaper = (pNum: number) => {
    setSelectedPaperNums((prev) =>
      prev.includes(pNum) ? prev.filter((p) => p !== pNum) : [...prev, pNum]
    );
    setCurrentPage(1);
  };

  const toggleYear = (yStr: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedYears.includes(yStr);
      return {
        ...prev,
        selectedYears: isSelected
          ? prev.selectedYears.filter((y) => y !== yStr)
          : [...prev.selectedYears, yStr],
      };
    });
    setCurrentPage(1);
  };

  const toggleSeries = (sCode: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedSeries.includes(sCode);
      return {
        ...prev,
        selectedSeries: isSelected
          ? prev.selectedSeries.filter((s) => s !== sCode)
          : [...prev.selectedSeries, sCode],
      };
    });
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-50/60 dark:bg-transparent text-slate-800 dark:text-slate-100 select-none relative transition-colors">
      {/* ===================================================================== */}
      {/* MOBILE/TABLET TOP TAB BAR: [ Pool (N) | Preview (Q#) | Cart (M) ] (< 1024px) */}
      {/* ===================================================================== */}
      <div className="flex lg:hidden items-center justify-center p-2 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 shrink-0 z-30">
        <div className="grid grid-cols-3 gap-1 w-full max-w-md bg-slate-100 dark:bg-dark-850 p-1 rounded-xl border border-slate-200 dark:border-dark-750">
          <button
            type="button"
            onClick={() => {
              setMobileTab('pool');
              setIsCartDrawerOpen(false);
            }}
            className={`min-h-[38px] px-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all truncate ${
              mobileTab === 'pool'
                ? `${accentClasses.bg} text-white shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pool ({filteredPool.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('preview');
              setIsCartDrawerOpen(false);
            }}
            className={`min-h-[38px] px-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all truncate ${
              mobileTab === 'preview'
                ? `${accentClasses.bg} text-white shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Preview{' '}
              {activePreviewQuestion
                ? `(Q${activePreviewQuestion.question_number ?? activePreviewQuestion.questionNumber ?? '1'})`
                : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('cart');
              setIsCartDrawerOpen(true);
            }}
            className={`min-h-[38px] px-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all truncate ${
              mobileTab === 'cart'
                ? `${accentClasses.bg} text-white shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cart ({cartQuestionIds.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEFT COLUMN: Clean Progressive Disclosure Search & Topical Pool            */}
      {/* ========================================================================= */}
      <aside
        className={`
          border-r border-slate-200 dark:border-dark-800 bg-white/95 lg:bg-slate-50/70 dark:bg-dark-900/80 flex flex-col shrink-0 overflow-hidden
          w-full lg:w-[340px] lg:min-w-[320px] xl:w-[360px]
          ${mobileTab === 'pool' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'}
        `}
      >
        {/* Filter Controls Header */}
        <div className="p-3 border-b border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 space-y-2 relative z-30 overflow-visible">
          {/* Row 1: Subtopic Picker (Promoted to Full-Width, Primary Topical Filter) */}
          <div className="w-full">
            <SubtopicMultiSelect
              hierarchy={subtopicHierarchy}
              selectedSubtopics={filters.selectedSubtopics}
              onChange={(subs) => {
                setFilters((prev) => ({ ...prev, selectedSubtopics: subs }));
                setCurrentPage(1);
              }}
              questions={questions}
              fullWidth
            />
          </div>

          {/* Row 2: Search Input + Tier Segmented Switch */}
          <div className="flex items-center gap-1.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search topic or Q#..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-8 bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-lg pl-8 pr-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tier Switch: All | Core | Extended */}
            <div className="flex bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs font-semibold shrink-0">
              {(['all', 'core', 'extended'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, selectedTier: t }));
                    setCurrentPage(1);
                  }}
                  className={`h-7 px-2 rounded-md capitalize text-center text-[10.5px] transition-all ${
                    filters.selectedTier === t
                      ? `${accentClasses.bg} text-white font-bold shadow-sm`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'core' ? 'Core' : 'Ext'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Secondary Filters Popover Button + Reset + Available Questions Counter */}
          <div className="flex items-center justify-between gap-2 pt-0.5 relative" ref={filterPopoverRef}>
            <div className="flex items-center gap-1.5">
              {/* "Filters (n)" Popover Button */}
              <button
                type="button"
                onClick={() => setIsFilterPopoverOpen((prev) => !prev)}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  activeSecondaryCount > 0
                    ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 shadow-sm'
                    : 'bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-750 hover:bg-slate-200 dark:hover:bg-dark-750'
                }`}
                title="Secondary filters: Paper, Year, Series, Variant, Calc, Marks, Syllabus Era"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Filters</span>
                {activeSecondaryCount > 0 && (
                  <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-dark-950">
                    {activeSecondaryCount}
                  </span>
                )}
              </button>

              {/* Reset All Filters */}
              <button
                type="button"
                onClick={handleResetAllFilters}
                title="Reset search and all filters"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Results Count */}
            <span className={`text-[11px] font-mono font-bold ${accentClasses.text}`}>
              {filteredPool.length} available
            </span>

            {/* Secondary Filters Popover Dropdown Card */}
            {isFilterPopoverOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-88 p-3.5 space-y-3.5 rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                    <span>Secondary Filters</span>
                    {activeSecondaryCount > 0 && (
                      <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        {activeSecondaryCount} active
                      </span>
                    )}
                  </div>
                  {activeSecondaryCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetSecondaryFilters}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold transition-colors"
                    >
                      Reset secondary
                    </button>
                  )}
                </div>

                {/* 1. Cambridge Components / Papers */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" />
                      <span>Cambridge Paper</span>
                    </label>
                    {selectedPaperNums.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaperNums([])}
                        className="text-[10px] text-amber-600 dark:text-amber-400"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(isMath
                      ? [
                          { num: 1, label: 'Paper 1 (Core Non-Calc)' },
                          { num: 2, label: 'Paper 2 (Ext Non-Calc)' },
                          { num: 3, label: 'Paper 3 (Core Calc)' },
                          { num: 4, label: 'Paper 4 (Ext Calc)' },
                        ]
                      : [
                          { num: 1, label: 'Paper 1 (Core MCQ)' },
                          { num: 2, label: 'Paper 2 (Ext MCQ)' },
                          { num: 3, label: 'Paper 3 (Core Theory)' },
                          { num: 4, label: 'Paper 4 (Ext Theory)' },
                          { num: 6, label: 'Paper 6 (ATP)' },
                        ]
                    ).map((p) => {
                      const isSelected = selectedPaperNums.includes(p.num);
                      return (
                        <button
                          key={p.num}
                          type="button"
                          onClick={() => togglePaper(p.num)}
                          className={`py-1.5 px-2 rounded-lg text-left text-xs font-medium border transition-all truncate ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 font-bold'
                              : 'bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="font-mono font-bold mr-1">P{p.num}</span>
                          <span className="text-[10px] text-slate-400">{p.label.replace(/Paper \d+ /, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Syllabus Era (Maths 0580) or Deprecated Content Toggle (Sciences) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isMath ? 'Syllabus Era' : 'Removed Syllabus Content'}
                    </label>
                  </div>
                  {isMath ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs font-semibold">
                        {(['2025-2028', '2019-2024', 'all'] as const).map((era) => (
                          <button
                            key={era}
                            type="button"
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, syllabusEra: era }));
                              setCurrentPage(1);
                            }}
                            className={`py-1 px-1 rounded-md text-center text-[10.5px] truncate transition-all ${
                              (filters.syllabusEra === era || (era === '2019-2024' && filters.syllabusEra === '2020-2024'))
                                ? 'bg-amber-500 text-dark-950 font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {era === '2025-2028' ? 'Current 25–28' : era === '2019-2024' ? 'Old 19–24' : 'All Syllabi'}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, hideObsolete: !prev.hideObsolete }));
                          setCurrentPage(1);
                        }}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          filters.hideObsolete
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {filters.hideObsolete ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Obsolete Hidden</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Showing Obsolete Content</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, hideObsolete: !prev.hideObsolete }));
                        setCurrentPage(1);
                      }}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        filters.hideObsolete
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                      }`}
                    >
                      {filters.hideObsolete ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Obsolete Hidden</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Showing Obsolete Content</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 3. Calculator Filter (Maths 0580) */}
                {isMath && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Calculator Rule
                      </label>
                    </div>
                    <div className="grid grid-cols-3 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs font-semibold">
                      {(['all', 'non-calc', 'calc'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCalcFilter(c);
                            setCurrentPage(1);
                          }}
                          className={`py-1 rounded-md text-center text-[10.5px] transition-all ${
                            calcFilter === c
                              ? 'bg-amber-500 text-dark-950 font-bold shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {c === 'all' ? 'All Calc' : c === 'non-calc' ? 'Non-Calc' : 'Calculator'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Marks Range Filter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Marks Range
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs">
                    {(isMath
                      ? (['all', '1-4m', '5-7m', '8-10m', '11m+'] as const)
                      : (['all', '1m', '2-3m', '4-5m', '6m+'] as const)
                    ).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMarksFilter(m);
                          setCurrentPage(1);
                        }}
                        className={`py-1 rounded-md text-center text-[10.5px] font-medium transition-all ${
                          marksFilter === m
                            ? `${accentClasses.bg} text-white font-bold shadow-sm`
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {m === 'all' ? 'All m' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Exam Years Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>Exam Year</span>
                    </label>
                    {filters.selectedYears.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, selectedYears: [] }))}
                        className="text-[10px] text-amber-600 dark:text-amber-400"
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
                          className={`w-full text-center py-1 text-xs font-mono tabular-nums rounded-md transition-all border ${
                            isSelected
                              ? 'bg-amber-500 text-dark-950 font-bold border-amber-500'
                              : 'bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-white/[0.08]'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Series / Season */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Series / Season
                    </label>
                    {filters.selectedSeries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, selectedSeries: [] }))}
                        className="text-[10px] text-amber-600 dark:text-amber-400"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {seriesList.map((s) => {
                      const isSelected = filters.selectedSeries.includes(s.value);
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => toggleSeries(s.value)}
                          className={`py-1 px-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-dark-950 font-bold border-amber-500'
                              : 'bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Paper Variant */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Paper Variant
                    </label>
                  </div>
                  <div className="grid grid-cols-4 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs font-semibold">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 1, label: 'V1' },
                      { value: 2, label: 'V2' },
                      { value: 3, label: 'V3' },
                    ] as const).map((v) => (
                      <button
                        key={String(v.value)}
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, variant: v.value }));
                          setCurrentPage(1);
                        }}
                        className={`py-1 rounded-md text-center text-[10.5px] font-mono tabular-nums transition-all ${
                          (filters.variant || 'all') === v.value
                            ? `${accentClasses.bg} text-white font-bold shadow-sm`
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Filter Chips: Dismissible tags for secondary filters */}
          {activeSecondaryCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-100 dark:border-dark-800">
              {selectedPaperNums.map((p) => (
                <span
                  key={`paper-${p}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 font-mono"
                >
                  P{p}
                  <button
                    type="button"
                    onClick={() => togglePaper(p)}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              {filters.selectedYears.map((y) => (
                <span
                  key={`year-${y}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 font-mono"
                >
                  {y}
                  <button
                    type="button"
                    onClick={() => toggleYear(y)}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              {filters.selectedSeries.map((s) => (
                <span
                  key={`series-${s}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 font-mono"
                >
                  {s.toUpperCase()}
                  <button
                    type="button"
                    onClick={() => toggleSeries(s)}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              {filters.variant && filters.variant !== 'all' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
                  V{filters.variant}
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, variant: 'all' }))}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {calcFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300">
                  {calcFilter === 'non-calc' ? 'Non-Calc' : 'Calculator'}
                  <button
                    type="button"
                    onClick={() => setCalcFilter('all')}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {marksFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
                  {marksFilter}
                  <button
                    type="button"
                    onClick={() => setMarksFilter('all')}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {isMath && filters.syllabusEra && filters.syllabusEra !== 'all' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[10px] text-amber-700 dark:text-amber-300">
                  {filters.syllabusEra === '2025-2028'
                    ? 'New Syllabus (2025-2028)'
                    : filters.syllabusEra === '2019-2024' || filters.syllabusEra === '2020-2024'
                    ? 'Old Syllabus (2019-2024)'
                    : filters.syllabusEra}
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, syllabusEra: 'all' }))}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {filters.hideObsolete === false && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[10px] text-amber-700 dark:text-amber-300">
                  Showing Obsolete
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, hideObsolete: true }))}
                    className="hover:text-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetSecondaryFilters}
                className="text-[10px] text-rose-500 hover:text-rose-400 font-semibold underline underline-offset-2 ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Filtered Questions List: High-Density Fast Skim Cards */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-800/60 p-2 space-y-1 pb-4">
          {pagedQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
              <p className="text-xs">No matching questions found.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">
                Try relaxing subtopic or secondary filters.
              </p>
            </div>
          ) : (
            pagedQuestions.map((q) => {
              const isSelected = previewQuestionId === q.id;
              const isInCart = cartQuestionIds.includes(q.id);
              const qNum =
                q.question_number ??
                q.questionNumber ??
                (q.id ? q.id.split('_').pop()?.replace(/^q/i, '') : '') ??
                '1';
              const paperLabel = q.paper ? `P${q.paper}` : '';
              const isNonCalcQuestion = q.calculator_allowed === false;

              return (
                <div
                  key={q.id}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  style={getSubjectSpotlightStyle(activeSubject, 280)}
                  onClick={() => setPreviewQuestionId(q.id)}
                  className={`spotlight-surface p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? `${accentClasses.bgLight} ${accentClasses.border} shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]`
                      : 'bg-white dark:bg-[#0B0E16]/75 hover:bg-slate-50 dark:hover:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/12'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-mono tabular-nums font-bold text-xs ${accentClasses.text}`}>
                        Q{qNum}
                      </span>
                      <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        {q.marks}m
                      </span>
                      {paperLabel && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          {paperLabel}
                        </span>
                      )}
                      {isNonCalcQuestion && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                          Non-Calc
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInCart) {
                          onRemoveFromCart(q.id);
                        } else {
                          onAddToCart(q.id);
                        }
                      }}
                      title={isInCart ? 'Remove from test' : 'Add to test'}
                      className={`flex items-center justify-center gap-1 h-6 px-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        isInCart
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
                      }`}
                    >
                      {isInCart ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="relative z-10 text-[11px] text-slate-800 dark:text-slate-200 truncate font-medium">
                    {q.subtopic || q.topic}
                  </p>
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    <span>
                      {q.series && q.year ? `${q.series.toUpperCase()} ${q.year}` : `${q.year || ''}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                      {q.is_mcq ? 'MCQ' : 'Theory'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="h-10 px-3 border-t border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-center justify-between shrink-0 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* CENTER COLUMN: Live Question & Mark Scheme Preview Pane                  */}
      {/* ========================================================================= */}
      <main
        className={`
          flex-1 min-w-0 flex flex-col h-full bg-slate-100 dark:bg-[#0B0F19] overflow-hidden border-r border-slate-200 dark:border-dark-800
          w-full
          ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}
        `}
      >
        {/* Preview Header Bar */}
        <div className="h-14 px-2.5 sm:px-4 border-b border-slate-200 dark:border-dark-800 bg-white/95 dark:bg-dark-900/90 flex items-center justify-between shrink-0 gap-2 overflow-hidden">
          {activePreviewQuestion ? (
            <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 overflow-hidden">
              {/* Prev / Next question navigation with [← / →] hotkey hint */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={goToPrevQuestion}
                  disabled={filteredPool.length <= 1}
                  title="Previous question (←, ↑, j)"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={filteredPool.length <= 1}
                  title="Next question (→, ↓, k)"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="hidden 2xl:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-dark-700 select-none shrink-0 whitespace-nowrap">
                  ← / →
                </span>
              </div>

              <span className={`hidden sm:inline font-mono font-bold text-sm ${accentClasses.text} shrink-0 whitespace-nowrap`}>
                Question{' '}
                {activePreviewQuestion.question_number ??
                  activePreviewQuestion.questionNumber ??
                  '1'}
              </span>
              <span className="text-slate-300 dark:text-dark-600 hidden sm:inline shrink-0">•</span>
              <div className="hidden sm:flex items-center gap-2 text-xs min-w-0 flex-1 overflow-hidden">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold shrink-0 whitespace-nowrap">
                  {activePreviewQuestion.marks} marks
                </span>
                {activePreviewQuestion.calculator_allowed === false && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold shrink-0 whitespace-nowrap">
                    Non-Calc
                  </span>
                )}
                <span
                  className="text-slate-700 dark:text-slate-300 font-medium min-w-0 flex-1 truncate hidden xl:block"
                  title={`${activePreviewQuestion.topic} / ${activePreviewQuestion.subtopic}`}
                >
                  {activePreviewQuestion.topic} / {activePreviewQuestion.subtopic}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              No question selected for preview
            </span>
          )}

          {/* Preview Controls & Add/Remove Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 dark:bg-dark-850 p-0.5 rounded-lg border border-slate-200 dark:border-dark-750 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('question')}
                title="Question Only"
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded transition-all font-medium whitespace-nowrap shrink-0 ${
                  previewTab === 'question'
                    ? `${accentClasses.bg} text-white`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Question</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('split')}
                title="Side-by-Side Split View (Space)"
                className={`hidden md:inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded transition-all font-medium whitespace-nowrap shrink-0 ${
                  previewTab === 'split'
                    ? `${accentClasses.bg} text-white`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Side-by-Side</span>
                <span className="hidden 2xl:inline-block text-[9px] font-mono opacity-70 px-1 py-0.2 rounded bg-black/15 dark:bg-white/10 select-none">
                  Space
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('ms')}
                title="Mark Scheme Only"
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded transition-all font-medium whitespace-nowrap shrink-0 ${
                  previewTab === 'ms'
                    ? `${accentClasses.bg} text-white`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Mark Scheme</span>
              </button>
            </div>

            {activePreviewQuestion && (
              <button
                type="button"
                onClick={handleToggleCartActive}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap ${
                  cartQuestionIds.includes(activePreviewQuestion.id)
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100'
                    : `bg-gradient-to-r ${accentClasses.gradient} text-white shadow-lg`
                }`}
              >
                {cartQuestionIds.includes(activePreviewQuestion.id) ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Remove</span>
                    <span className="hidden 2xl:inline-block text-[10px] font-mono font-normal opacity-75 px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 select-none">
                      A
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="2xl:hidden">Add</span>
                    <span className="hidden 2xl:inline">Add to Quiz</span>
                    <span className="hidden 2xl:inline-block text-[10px] font-mono font-normal opacity-85 px-1 py-0.2 rounded bg-black/20 dark:bg-white/20 select-none">
                      A
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preview Canvas Workspace: Vertical stack below 2xl when split, side-by-side at 2xl+ */}
        <div
          className={`flex-1 relative bg-slate-100 dark:bg-[#0B0F19] ${
            previewTab === 'split'
              ? 'flex flex-col 2xl:grid 2xl:grid-cols-2 overflow-y-auto 2xl:overflow-hidden pb-16 lg:pb-0'
              : 'flex flex-col overflow-hidden pb-16 lg:pb-0'
          }`}
        >
          {activePreviewQuestion ? (
            <>
              {(previewTab === 'question' || previewTab === 'split') && (
                <div
                  className={`flex flex-col min-w-0 ${
                    previewTab === 'split'
                      ? 'min-h-[420px] flex-1 2xl:min-h-0 2xl:h-full overflow-hidden border-b 2xl:border-b-0 2xl:border-r border-slate-200 dark:border-dark-800'
                      : 'flex-1 h-full overflow-hidden'
                  }`}
                >
                  <ImageCanvas
                    src={resolveQuestionImageUrl(activePreviewQuestion)}
                    title={`Question ${
                      activePreviewQuestion.question_number ??
                      activePreviewQuestion.questionNumber ??
                      '1'
                    }`}
                    badgeText={`${activePreviewQuestion.marks}m`}
                    badgeColor={
                      activeSubject === 'mathematics'
                        ? 'amber'
                        : activeSubject === 'physics'
                        ? 'indigo'
                        : activeSubject === 'biology'
                        ? 'emerald'
                        : 'cyan'
                    }
                    activeSubject={activeSubject}
                    placeholderTitle="Question Image"
                    placeholderMessage="Question crop image is loading or not indexed."
                    enableAnnotation={true}
                    questionId={activePreviewQuestion.id}
                  />
                </div>
              )}

              {(previewTab === 'ms' || previewTab === 'split') && (
                <div
                  className={`flex flex-col min-w-0 ${
                    previewTab === 'split'
                      ? 'min-h-[420px] flex-1 2xl:min-h-0 2xl:h-full overflow-hidden'
                      : 'flex-1 h-full overflow-hidden'
                  }`}
                >
                  <ImageCanvas
                    src={resolveMarkSchemeImageUrl(activePreviewQuestion)}
                    title={`Mark Scheme: Q${
                      activePreviewQuestion.question_number ??
                      activePreviewQuestion.questionNumber ??
                      '1'
                    }`}
                    badgeText="Answers"
                    badgeColor="emerald"
                    activeSubject={activeSubject}
                    placeholderTitle="Mark Scheme Image"
                    placeholderMessage="Official mark scheme slice not indexed for this item."
                    enableAnnotation={true}
                    questionId={`${activePreviewQuestion.id}-ms`}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
              Select any question on the left to preview.
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING EXAM CART BADGE BUTTON (1024px - 1279px)                         */}
      {/* Hidden on < 1024px where the top [ Pool | Preview | Cart ] bar is shown   */}
      {/* ========================================================================= */}
      {!isCartDrawerOpen && mobileTab !== 'cart' && (
        <div className="fixed bottom-5 right-5 z-40 hidden lg:block xl:hidden">
          <button
            type="button"
            onClick={() => {
              setIsCartDrawerOpen(true);
            }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r ${accentClasses.gradient} text-white font-bold text-xs shadow-2xl border border-white/20 active:scale-95 transition-all`}
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Quiz Cart ({cartQuestionIds.length})</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-dark-950 font-bold font-mono text-[11px]">
              {totalCartMarks} / {targetMarks}m
            </span>
          </button>
        </div>
      )}

      {/* Laptop Backdrop for Cart Drawer (1024px - 1279px) */}
      {isCartDrawerOpen && (
        <div
          className="hidden lg:block xl:hidden fixed inset-0 top-14 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            setIsCartDrawerOpen(false);
            if (mobileTab === 'cart') setMobileTab('pool');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Quiz Cart & Dynamic Mark Target Meter & Exporter            */}
      {/* ========================================================================= */}
      <aside
        className={`
          bg-white dark:bg-dark-900 flex flex-col shrink-0 transition-transform duration-200
          w-full flex-1 min-h-0 h-full max-h-full lg:flex-none
          lg:fixed lg:top-14 lg:bottom-0 lg:right-0 lg:z-50 lg:w-[26rem] lg:border-l lg:border-slate-200 lg:dark:border-dark-750 lg:shadow-2xl
          xl:static xl:w-84 2xl:w-96 xl:z-auto xl:border-l xl:border-slate-200 xl:dark:border-dark-800 xl:shadow-none xl:translate-x-0
          ${mobileTab === 'cart' ? 'flex' : 'hidden'}
          ${isCartDrawerOpen ? 'lg:translate-x-0 lg:flex' : 'lg:translate-x-full xl:translate-x-0 xl:flex'}
        `}
      >
        {/* Dedicated Sticky Mobile/Tablet/Laptop Navigation Header inside Cart (< 1280px) */}
        <div className="flex xl:hidden items-center justify-between px-3 py-2.5 bg-slate-100 dark:bg-dark-950 border-b border-slate-200 dark:border-dark-800 shrink-0 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => {
              setIsCartDrawerOpen(false);
              setMobileTab('pool');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-dark-850 border border-slate-200 dark:border-dark-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-800 active:scale-95 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Pool</span>
          </button>

          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Quiz Cart ({cartQuestionIds.length})
          </span>

          <button
            type="button"
            onClick={() => {
              setIsCartDrawerOpen(false);
              if (mobileTab === 'cart') setMobileTab('pool');
            }}
            aria-label="Close Quiz Cart"
            title="Close Quiz Cart"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-dark-850 border border-slate-200 dark:border-dark-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Cart Content Wrapper */}
        <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden flex flex-col [-webkit-overflow-scrolling:touch]">

        {/* Cart Top Header: Title & Actions */}
        <div className="p-3 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className={`w-3.5 h-3.5 ${accentClasses.text}`} />
              Topical Quiz Cart
            </h3>
            <div className="flex items-center gap-1.5">
              {cartQuestionIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleShuffleCart}
                    title="Shuffle questions order"
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[11px] text-rose-500 hover:text-rose-400 font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Test Title Input */}
          <div>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => onSetTestTitle(e.target.value)}
              placeholder="e.g. Physics 3.2 Waves Topical Homework"
              className="w-full bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Dynamic Mark Target Meter */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0B0F19]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-2">
            {/* Numbers & Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {totalCartMarks}
                </span>
                <span className="text-xs font-semibold text-slate-400">/</span>
                <span className="text-xs font-bold font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {targetMarks} Marks
                </span>
              </div>

              {totalCartMarks === targetMarks ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Check className="w-3 h-3" />
                  Target Met
                </span>
              ) : totalCartMarks > targetMarks ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  +{totalCartMarks - targetMarks}m over target
                </span>
              ) : (
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {targetMarks - totalCartMarks}m needed
                </span>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  totalCartMarks === targetMarks
                    ? 'bg-emerald-500'
                    : totalCartMarks > targetMarks
                    ? 'bg-amber-500'
                    : `bg-gradient-to-r ${accentClasses.gradient}`
                }`}
                style={{
                  width: `${Math.min(100, Math.round((totalCartMarks / Math.max(1, targetMarks)) * 100))}%`,
                }}
              />
            </div>

            {/* Target Mark Pills: [ 20m Quiz | 40m Homework | 50m Test ] + Custom */}
            <div className="flex items-center gap-1 pt-1">
              {TARGET_PRESETS.map((pill) => {
                const isSelected = targetMarks === pill.marks && !isCustomTargetOpen;
                return (
                  <button
                    key={pill.marks}
                    type="button"
                    onClick={() => {
                      setTargetMarks(pill.marks);
                      setIsCustomTargetOpen(false);
                    }}
                    className={`flex-1 py-1 px-1 rounded-lg text-center transition-all border text-[11px] font-semibold ${
                      isSelected
                        ? `${accentClasses.bg} text-white font-bold shadow-sm border-transparent`
                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="font-mono tabular-nums">{pill.label}</span>
                    <span className="text-[8.5px] font-normal text-slate-400 block -mt-0.5 truncate">
                      {pill.desc}
                    </span>
                  </button>
                );
              })}

              {/* Custom Target Input */}
              {isCustomTargetOpen ? (
                <div className="flex items-center gap-1 w-16 shrink-0">
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={customTargetInput}
                    onChange={(e) => {
                      setCustomTargetInput(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) setTargetMarks(val);
                    }}
                    onBlur={() => {
                      if (!targetMarks || targetMarks <= 0) {
                        setTargetMarks(40);
                        setCustomTargetInput('40');
                      }
                    }}
                    autoFocus
                    className="w-full h-7 px-1 text-center text-xs font-mono font-bold bg-white dark:bg-dark-800 border border-amber-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">m</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTargetOpen(true);
                    setCustomTargetInput(String(targetMarks));
                  }}
                  className={`px-2 py-1 rounded-lg text-center transition-all border text-[11px] font-semibold shrink-0 ${
                    targetMarks !== 20 && targetMarks !== 40 && targetMarks !== 50
                      ? `${accentClasses.bg} text-white font-bold shadow-sm border-transparent`
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="font-mono tabular-nums">
                    {targetMarks !== 20 && targetMarks !== 40 && targetMarks !== 50
                      ? `${targetMarks}m`
                      : 'Custom'}
                  </span>
                  <span className="text-[8.5px] font-normal text-slate-400 block -mt-0.5">Edit</span>
                </button>
              )}
            </div>

            {/* Mini Telemetry Strip */}
            <div className="grid grid-cols-3 pt-1.5 border-t border-slate-100 dark:border-white/[0.05] text-center">
              <div>
                <span className="text-[9px] uppercase font-semibold text-slate-400 block">Questions</span>
                <span className="text-xs font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {cartQuestions.length}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-slate-400 block">Est. Time</span>
                <span className="text-xs font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {formatDuration(targetTimeMinutes)}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-slate-400 block">Calculator</span>
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center gap-1 ${
                    cartHasNonCalc ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {cartHasNonCalc ? (
                    <>
                      <Ban className="w-3 h-3" />
                      <span>Non-Calc</span>
                    </>
                  ) : (
                    <>
                      <Calculator className="w-3 h-3" />
                      <span>Permitted</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Topic Balance Distribution Chips */}
          {topicDistribution.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
              {topicDistribution.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-[9px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]"
                  title={`${t.name}: ${t.marks}m (${t.percent}%)`}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="font-mono font-bold text-slate-400 shrink-0">{t.percent}%</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Selected Questions List: Pinned Right Below The Meter */}
        <div className="shrink-0 xl:flex-1 xl:min-h-0 overflow-visible xl:overflow-y-auto p-2.5 space-y-1.5">
          {cartQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-5 text-slate-400 dark:text-slate-500">
              <FileText className="w-7 h-7 text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Quiz Cart is Empty
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 max-w-[14rem]">
                1. Select subtopics on the left
                <br />
                2. Click &quot;+ Add&quot; on questions or use &quot;Fill Remaining&quot; below
              </p>
            </div>
          ) : (
            cartQuestions.map((q, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === cartQuestions.length - 1;
              const isPreviewed = previewQuestionId === q.id;
              const qNum =
                q.question_number ??
                q.questionNumber ??
                (q.id ? q.id.split('_').pop()?.replace(/^q/i, '') : '') ??
                String(idx + 1);

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setPreviewQuestionId(q.id);
                    if (window.innerWidth < 1024) {
                      setMobileTab('preview');
                      setIsCartDrawerOpen(false);
                    } else if (window.innerWidth < 1280) {
                      setIsCartDrawerOpen(false);
                    }
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isPreviewed
                      ? `${accentClasses.bgLight} ${accentClasses.border} shadow-sm`
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#0B0E16]/80 dark:hover:bg-white/[0.04] border-slate-200 dark:border-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/[0.08] flex items-center justify-center font-mono tabular-nums font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono tabular-nums font-bold text-xs ${accentClasses.text}`}>
                          Q{qNum}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          {q.marks}m
                        </span>
                        {q.paper && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            P{q.paper}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {q.subtopic || q.topic}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      title="Move Question Up"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-500 disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      title="Move Question Down"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-500 disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFromCart(q.id)}
                      title="Remove from Cart"
                      className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Collapsible "Fill Remaining" Sampler & Presets Modal Trigger */}
        <div className="p-2.5 border-t border-slate-200 dark:border-dark-800 bg-slate-50/70 dark:bg-dark-850/80 space-y-2 shrink-0">
          {/* Fill Remaining / Auto-Generate Quiz Drawer */}
          <div className="rounded-xl bg-white dark:bg-[#0D111C]/90 p-2.5 border border-slate-200 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={totalCartMarks < targetMarks && totalCartMarks > 0 ? handleFillRemaining : handleSmartGenerate}
                className={`flex-1 py-1.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all bg-gradient-to-r ${accentClasses.gradient}`}
              >
                {totalCartMarks < targetMarks && totalCartMarks > 0 ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Fill Remaining ({targetMarks - totalCartMarks}m)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Auto-Generate ({targetMarks}m)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsSmartGenerateOpen(!isSmartGenerateOpen)}
                title="Configure sampler settings"
                className="ml-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isSmartGenerateOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {lastGeneratedInfo && (
              <div className="text-[10px] text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {lastGeneratedInfo}
              </div>
            )}

            {/* Sampler Configuration Options */}
            {isSmartGenerateOpen && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-xs">
                {/* Selection Mode */}
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Selection Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'balanced', label: 'Balanced' },
                        { id: 'review_first', label: 'Review' },
                        { id: 'unattempted_only', label: 'New Only' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setGenerateMode(m.id)}
                        className={`py-1 px-1 text-[10px] rounded text-center font-medium transition-all border ${
                          generateMode === m.id
                            ? `${accentClasses.bg} text-white font-bold shadow-sm`
                            : 'bg-white/80 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-750'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Structure (Sciences) */}
                {!isMath && (
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      Paper Composition
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'authentic', label: 'Authentic Mix' },
                          { id: 'theory_only', label: 'Theory Only' },
                          { id: 'mcq_sprint', label: 'MCQ Sprint' },
                        ] as const
                      ).map((struct) => (
                        <button
                          key={struct.id}
                          type="button"
                          onClick={() => setExamStructure(struct.id)}
                          className={`py-1 px-1 text-[10px] rounded text-center font-medium transition-all border ${
                            examStructure === struct.id
                              ? `${accentClasses.bg} text-white font-bold shadow-sm`
                              : 'bg-white/80 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-750'
                          }`}
                        >
                          {struct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Official Cambridge Presets Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsPresetsModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-[#0B0E16]/80 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Official Cambridge Presets</span>
            </div>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
              Full Papers ▾
            </span>
          </button>
        </div>

        {/* Action Bar: Sit Exam, PDF Export Options & Buttons */}
        <div className="p-3 pb-28 sm:pb-12 xl:pb-3 border-t border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 space-y-2 shrink-0">
          {/* Primary Action 1: In-Browser Exam Sitting Mode */}
          <button
            type="button"
            disabled={cartQuestions.length === 0}
            onClick={() => setIsSittingModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-950/20 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <PlayCircle className="w-4 h-4 text-white" />
            <span>Sit Mock Exam In-Browser ({formatDuration(targetTimeMinutes)})</span>
          </button>

          {/* Export Options Box */}
          <div className="p-2 rounded-xl bg-white dark:bg-[#0B0E16]/90 border border-slate-200 dark:border-white/[0.08] space-y-1 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cambridge PDF Export
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30">
                CAIE Style
              </span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeFormalHeader}
                onChange={(e) => setIncludeFormalHeader(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500"
              />
              <span>Include Cambridge Cover Page</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeSourceTags}
                onChange={(e) => setIncludeSourceTags(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500"
              />
              <span>Include Question Origin Citation (e.g. 0580/22 · s25 Q04)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeHeaderFooter}
                onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500"
              />
              <span>Include Header, Footer &amp; Page Numbers</span>
            </label>
          </div>

          {exportStatus && (
            <div className="text-[11px] text-center text-amber-600 dark:text-amber-300 font-medium py-0.5 animate-pulse">
              {exportStatus}
            </div>
          )}

          {/* Action 2 & 3: Export Question Paper & Mark Scheme */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
              onClick={handleExportQP}
              className={`py-2 px-2 rounded-xl bg-gradient-to-b ${accentClasses.gradient} text-white font-bold text-xs shadow-sm transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export QP</span>
            </button>

            <button
              type="button"
              disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
              onClick={handleExportMS}
              className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-slate-200 dark:border-white/[0.1] hover:border-emerald-500/40 transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export MS</span>
            </button>
          </div>
        </div>
        </div>
      </aside>

      {/* Official Cambridge Full Paper Presets Modal */}
      <FullPaperPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presets={officialPresets}
        selectedPresetId={selectedPresetId}
        onApplyPreset={handleApplyPreset}
        accentClasses={accentClasses}
      />

      {/* In-Browser Exam Sitting Modal */}
      <MockSittingModal
        isOpen={isSittingModalOpen}
        onClose={() => setIsSittingModalOpen(false)}
        title={testTitle || DEFAULT_EXAM_TITLES[activeSubject]}
        questions={cartQuestions}
        durationMinutes={targetTimeMinutes}
        subject={activeSubject}
      />
    </div>
  );
};

export default TestMakerPage;
