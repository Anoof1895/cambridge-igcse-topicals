import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QuestionItem, FilterState, ViewMode, AppView, Subject, SyllabusEra } from './types';
import { AppNavbar } from './components/AppNavbar';
import { TopBar } from './components/TopBar';
import { buildStaticSubtopicHierarchy } from './constants/taxonomy';
import { getQuestionType } from './utils/questionClassification';
import { QuestionList, sortQuestionsLatestFirst, getCambridgeMetadata } from './components/QuestionList';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { AmbientBackground } from './components/AmbientBackground';
import { DataBookletDrawer } from './components/DataBookletDrawer';
import { AuthModal } from './components/AuthModal';
import { CommandPalette } from './components/CommandPalette';
import { useAuth } from './context/AuthContext';
import { useProgress } from './context/ProgressContext';
import { useTheme } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// Route-level code-splitting for large views
const HomePage = React.lazy(() => import('./components/HomePage').then((m) => ({ default: m.HomePage })));
const TestMakerPage = React.lazy(() => import('./components/TestMakerPage').then((m) => ({ default: m.TestMakerPage })));
const SplitViewer = React.lazy(() => import('./components/SplitViewer').then((m) => ({ default: m.SplitViewer })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 gap-3">
    <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

// URL hash router helper: parses view and optional ?q=question_id
const parseHashRoute = (): { view: AppView; questionId: string | null } => {
  try {
    const fullHash = window.location.hash || '';
    const [hashPath, hashQuery] = fullHash.split('?');
    const lowerPath = (hashPath || '').toLowerCase();

    let view: AppView = 'home';
    if (lowerPath.includes('math') && (lowerPath.includes('test-maker') || lowerPath.includes('testmaker'))) {
      view = 'mathematics-test-maker';
    } else if (lowerPath.includes('math')) {
      view = 'mathematics-topical';
    } else if (lowerPath.includes('phys') && (lowerPath.includes('test-maker') || lowerPath.includes('testmaker'))) {
      view = 'physics-test-maker';
    } else if (lowerPath.includes('phys')) {
      view = 'physics-topical';
    } else if (lowerPath.includes('bio') && (lowerPath.includes('test-maker') || lowerPath.includes('testmaker'))) {
      view = 'biology-test-maker';
    } else if (lowerPath.includes('bio')) {
      view = 'biology-topical';
    } else if (lowerPath.includes('chem') && (lowerPath.includes('test-maker') || lowerPath.includes('testmaker'))) {
      view = 'chemistry-test-maker';
    } else if (lowerPath.includes('chem')) {
      view = 'chemistry-topical';
    } else if (lowerPath.includes('test-maker') || lowerPath.includes('testmaker')) {
      view = 'mathematics-test-maker';
    } else if (lowerPath.includes('topical')) {
      view = 'mathematics-topical';
    }

    let questionId: string | null = null;
    if (hashQuery) {
      const params = new URLSearchParams(hashQuery);
      questionId = params.get('q');
    }

    return { view, questionId };
  } catch {
    return { view: 'home', questionId: null };
  }
};

// Helper to normalize raw JSON questions to unified QuestionItem format with strict null safety
const normalizeQuestions = (data: unknown[]): QuestionItem[] => {
  if (!Array.isArray(data)) return [];
  return data.map((raw) => {
    const q = (raw || {}) as Partial<QuestionItem>;
    const qNum =
      q.questionNumber ??
      (q.question_number !== undefined
        ? String(q.question_number)
        : q.id
        ? q.id.split('_').pop()?.replace(/^q/i, '') || '1'
        : '1');
    const qImg =
      q.questionImagePath ||
      q.question_image_url ||
      q.question_image ||
      q.image ||
      q.image_url ||
      q.crop_path ||
      (q.id ? `/output/${q.subject || '0580'}/questions/${q.id}.png` : '');
    const msImg =
      q.markSchemeImagePath ||
      q.mark_scheme_image_url ||
      q.mark_scheme_image ||
      q.ms_image ||
      q.ms_image_url ||
      q.ms_crop_path ||
      (q.id ? `/output/${q.subject || '0580'}/mark_schemes/${q.id.replace('_qp_', '_ms_')}.png` : '');
    const totalMarks = Number(q.marks ?? q.total_marks ?? 1) || 1;
    const subtopics = Array.isArray(q.subtopics) && q.subtopics.length > 0
      ? q.subtopics
      : q.subtopic
      ? [q.subtopic]
      : [];

    return {
      ...q,
      id: q.id || '',
      paperId: q.paperId || q.paper_id || '',
      unit: q.unit || q.topic || '',
      unitCode: q.unitCode || q.subject || '',
      year: Number(q.year) || 2024,
      series: q.series || 's',
      questionNumber: String(qNum),
      parentQuestion: q.parentQuestion || String(qNum),
      subPart: q.subPart || q.subpart || '',
      marks: totalMarks,
      total_marks: totalMarks,
      topic: q.topic || 'General',
      subtopic: q.subtopic || subtopics[0] || q.topic || 'General',
      subtopics,
      obsolete: Boolean(q.obsolete),
      obsolete_reason: q.obsolete_reason ?? null,
      calculator_allowed: q.calculator_allowed ?? q.calculator ?? true,
      hasStem: Boolean(q.hasStem),
      stemSummary: q.stemSummary ?? null,
      questionImagePath: qImg,
      markSchemeImagePath: msImg || null,
    };
  });
};

export const App: React.FC = () => {
  const [mathQuestions, setMathQuestions] = useState<QuestionItem[] | null>(null);
  const [physQuestions, setPhysQuestions] = useState<QuestionItem[] | null>(null);
  const [chemQuestions, setChemQuestions] = useState<QuestionItem[] | null>(null);
  const [bioQuestions, setBioQuestions] = useState<QuestionItem[] | null>(null);

  const [loadingSubject, setLoadingSubject] = useState<Subject | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isDataBookletOpen, setIsDataBookletOpen] = useState<boolean>(false);
  const [isDataBookletExpanded, setIsDataBookletExpanded] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Global keyboard shortcut: 'D' to toggle Official Data & Formula Booklet Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isCommandPaletteOpen) return;
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

      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsDataBookletOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const initialRoute = useRef(parseHashRoute());
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.current.view);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialRoute.current.questionId);

  const activeSubject: Subject = useMemo(() => {
    if (currentView.startsWith('physics')) return 'physics';
    if (currentView.startsWith('chemistry')) return 'chemistry';
    if (currentView.startsWith('biology')) return 'biology';
    if (currentView.startsWith('mathematics')) return 'mathematics';
    // Persisted or default
    try {
      const saved = localStorage.getItem('cambridge_active_subject') as Subject;
      if (saved && ['mathematics', 'physics', 'chemistry', 'biology'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'mathematics';
  }, [currentView]);

  const { setSubjectTheme } = useTheme();
  useEffect(() => {
    setSubjectTheme(activeSubject);
    try {
      localStorage.setItem('cambridge_active_subject', activeSubject);
    } catch {}
  }, [activeSubject, setSubjectTheme]);

  const handleNavigate = useCallback((view: AppView) => {
    const nextSubject: Subject = view.startsWith('physics')
      ? 'physics'
      : view.startsWith('biology')
      ? 'biology'
      : view.startsWith('chemistry')
      ? 'chemistry'
      : 'mathematics';

    const isSameSubject = nextSubject === activeSubject;
    const targetQ = isSameSubject ? selectedQuestionId : null;

    setCurrentView(view);
    if (!isSameSubject) {
      setSelectedQuestionId(null);
    }

    if (view === 'mathematics-topical') {
      window.location.hash = targetQ ? `#/mathematics/topical?q=${encodeURIComponent(targetQ)}` : '#/mathematics/topical';
    } else if (view === 'mathematics-test-maker') {
      window.location.hash = '#/mathematics/test-maker';
    } else if (view === 'physics-topical') {
      window.location.hash = targetQ ? `#/physics/topical?q=${encodeURIComponent(targetQ)}` : '#/physics/topical';
    } else if (view === 'physics-test-maker') {
      window.location.hash = '#/physics/test-maker';
    } else if (view === 'chemistry-topical') {
      window.location.hash = targetQ ? `#/chemistry/topical?q=${encodeURIComponent(targetQ)}` : '#/chemistry/topical';
    } else if (view === 'chemistry-test-maker') {
      window.location.hash = '#/chemistry/test-maker';
    } else if (view === 'biology-topical') {
      window.location.hash = targetQ ? `#/biology/topical?q=${encodeURIComponent(targetQ)}` : '#/biology/topical';
    } else if (view === 'biology-test-maker') {
      window.location.hash = '#/biology/test-maker';
    } else {
      window.location.hash = '#/';
    }
  }, [activeSubject, selectedQuestionId]);

  // Listen to popstate / hashchange for browser back and forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const { view, questionId } = parseHashRoute();
      setCurrentView((prev) => (prev !== view ? view : prev));
      if (questionId) {
        setSelectedQuestionId(questionId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync selected question ID to URL hash in topical view
  useEffect(() => {
    if (!currentView.endsWith('-topical')) return;
    if (!selectedQuestionId) return;

    const basePath = currentView === 'mathematics-topical'
      ? '#/mathematics/topical'
      : currentView === 'physics-topical'
      ? '#/physics/topical'
      : currentView === 'biology-topical'
      ? '#/biology/topical'
      : '#/chemistry/topical';

    const newHash = `${basePath}?q=${encodeURIComponent(selectedQuestionId)}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [currentView, selectedQuestionId]);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (currentView === 'mathematics-topical') {
      document.title = 'Mathematics 0580 Topicals | Cambridge IGCSE';
    } else if (currentView === 'mathematics-test-maker') {
      document.title = 'Mathematics 0580 Mock Builder | Cambridge IGCSE';
    } else if (currentView === 'physics-topical') {
      document.title = 'Physics 0625 Topicals | Cambridge IGCSE';
    } else if (currentView === 'physics-test-maker') {
      document.title = 'Physics 0625 Mock Builder | Cambridge IGCSE';
    } else if (currentView === 'chemistry-topical') {
      document.title = 'Chemistry 0620 Topicals | Cambridge IGCSE';
    } else if (currentView === 'chemistry-test-maker') {
      document.title = 'Chemistry 0620 Mock Builder | Cambridge IGCSE';
    } else if (currentView === 'biology-topical') {
      document.title = 'Biology 0610 Topicals | Cambridge IGCSE';
    } else if (currentView === 'biology-test-maker') {
      document.title = 'Biology 0610 Mock Builder | Cambridge IGCSE';
    } else {
      document.title = 'Cambridge IGCSE Topicals | Interactive Workspace & Mock Builder';
    }
  }, [currentView]);

  const questions = useMemo(() => {
    if (activeSubject === 'mathematics') return mathQuestions || [];
    if (activeSubject === 'physics') return physQuestions || [];
    if (activeSubject === 'chemistry') return chemQuestions || [];
    if (activeSubject === 'biology') return bioQuestions || [];
    return mathQuestions || [];
  }, [activeSubject, mathQuestions, physQuestions, chemQuestions, bioQuestions]);

  // Default view: Question Only mode so answers aren't spoiled
  const [viewMode, setViewMode] = useState<ViewMode>('question-only');

  // Cloud-synced bookmarks and question statuses from ProgressContext
  const { 
    bookmarks, 
    questionStatuses, 
    toggleBookmark, 
    cycleQuestionStatus 
  } = useProgress();
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  // Persisted custom test maker carts separated by subject
  const [mathTestCart, setMathTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cambridge_math_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [physTestCart, setPhysTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cambridge_phys_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chemTestCart, setChemTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cambridge_chem_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bioTestCart, setBioTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cambridge_bio_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const testCart = activeSubject === 'physics'
    ? physTestCart
    : activeSubject === 'chemistry'
    ? chemTestCart
    : activeSubject === 'biology'
    ? bioTestCart
    : mathTestCart;

  const [mathTestTitle, setMathTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('cambridge_math_test_title') || 'Custom Maths 0580 Mock Exam';
    } catch {
      return 'Custom Maths 0580 Mock Exam';
    }
  });

  const [physTestTitle, setPhysTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('cambridge_phys_test_title') || 'Custom Physics 0625 Mock Exam';
    } catch {
      return 'Custom Physics 0625 Mock Exam';
    }
  });

  const [chemTestTitle, setChemTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('cambridge_chem_test_title') || 'Custom Chemistry 0620 Mock Exam';
    } catch {
      return 'Custom Chemistry 0620 Mock Exam';
    }
  });

  const [bioTestTitle, setBioTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('cambridge_bio_test_title') || 'Custom Biology 0610 Mock Exam';
    } catch {
      return 'Custom Biology 0610 Mock Exam';
    }
  });

  const testTitle = activeSubject === 'physics'
    ? physTestTitle
    : activeSubject === 'chemistry'
    ? chemTestTitle
    : activeSubject === 'biology'
    ? bioTestTitle
    : mathTestTitle;

  const setTestTitle = useCallback((title: string) => {
    if (activeSubject === 'physics') {
      setPhysTestTitle(title);
    } else if (activeSubject === 'chemistry') {
      setChemTestTitle(title);
    } else if (activeSubject === 'biology') {
      setBioTestTitle(title);
    } else {
      setMathTestTitle(title);
    }
  }, [activeSubject]);

  useEffect(() => {
    localStorage.setItem('cambridge_math_test_cart', JSON.stringify(mathTestCart));
  }, [mathTestCart]);

  useEffect(() => {
    localStorage.setItem('cambridge_phys_test_cart', JSON.stringify(physTestCart));
  }, [physTestCart]);

  useEffect(() => {
    localStorage.setItem('cambridge_chem_test_cart', JSON.stringify(chemTestCart));
  }, [chemTestCart]);

  useEffect(() => {
    localStorage.setItem('cambridge_bio_test_cart', JSON.stringify(bioTestCart));
  }, [bioTestCart]);

  useEffect(() => {
    localStorage.setItem('cambridge_math_test_title', mathTestTitle);
  }, [mathTestTitle]);

  useEffect(() => {
    localStorage.setItem('cambridge_phys_test_title', physTestTitle);
  }, [physTestTitle]);

  useEffect(() => {
    localStorage.setItem('cambridge_chem_test_title', chemTestTitle);
  }, [chemTestTitle]);

  useEffect(() => {
    localStorage.setItem('cambridge_bio_test_title', bioTestTitle);
  }, [bioTestTitle]);

  const handleAddToCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else if (activeSubject === 'chemistry') {
      setChemTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else if (activeSubject === 'biology') {
      setBioTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setMathTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, [activeSubject]);

  const handleRemoveFromCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => prev.filter((item) => item !== id));
    } else if (activeSubject === 'chemistry') {
      setChemTestCart((prev) => prev.filter((item) => item !== id));
    } else if (activeSubject === 'biology') {
      setBioTestCart((prev) => prev.filter((item) => item !== id));
    } else {
      setMathTestCart((prev) => prev.filter((item) => item !== id));
    }
  }, [activeSubject]);

  const handleClearCart = useCallback(() => {
    if (activeSubject === 'physics') {
      setPhysTestCart([]);
    } else if (activeSubject === 'chemistry') {
      setChemTestCart([]);
    } else if (activeSubject === 'biology') {
      setBioTestCart([]);
    } else {
      setMathTestCart([]);
    }
  }, [activeSubject]);

  const handleReorderCart = useCallback((newIds: string[]) => {
    if (activeSubject === 'physics') {
      setPhysTestCart(newIds);
    } else if (activeSubject === 'chemistry') {
      setChemTestCart(newIds);
    } else if (activeSubject === 'biology') {
      setBioTestCart(newIds);
    } else {
      setMathTestCart(newIds);
    }
  }, [activeSubject]);

  // On-demand dataset loading per active subject (avoids fetching all concurrently on cold start)
  useEffect(() => {
    if (currentView === 'home') {
      return;
    }

    let isMounted = true;

    if (activeSubject === 'mathematics' && !mathQuestions) {
      setLoadingSubject('mathematics');
      setDatasetError(null);
      fetch('/dataset_math.json')
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load Mathematics dataset: ${res.statusText}`);
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setMathQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Mathematics dataset');
            setLoadingSubject(null);
          }
        });
    } else if (activeSubject === 'physics' && !physQuestions) {
      setLoadingSubject('physics');
      setDatasetError(null);
      fetch('/dataset_physics.json')
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load Physics dataset: ${res.statusText}`);
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setPhysQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Physics dataset');
            setLoadingSubject(null);
          }
        });
    } else if (activeSubject === 'chemistry' && !chemQuestions) {
      setLoadingSubject('chemistry');
      setDatasetError(null);
      fetch('/dataset_chemistry.json')
        .then((res) => {
          if (!res.ok) return [];
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setChemQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setChemQuestions([]);
            setLoadingSubject(null);
          }
        });
    } else if (activeSubject === 'biology' && !bioQuestions) {
      setLoadingSubject('biology');
      setDatasetError(null);
      fetch('/dataset_biology.json')
        .then((res) => {
          if (!res.ok) return [];
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setBioQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setBioQuestions([]);
            setLoadingSubject(null);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeSubject, currentView, mathQuestions, physQuestions, chemQuestions, bioQuestions]);

  // Active drawer tab: 'all' | 'bookmarked'
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarked'>('all');

  // Responsive question list drawer state (< 1024px)
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState<boolean>(false);

  // Filter state for Cambridge IGCSE topical explorer (Defaults to 'extended' tier)
  const [filters, setFilters] = useState<FilterState>(() => {
    const savedEra = (localStorage.getItem('cambridge_math_era') as SyllabusEra) || 'all';
    return {
      syllabusEra: savedEra,
      hideObsolete: true,
      selectedTier: 'extended',
      variant: 'all',
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    };
  });

  const prevSubjectRef = useRef<Subject>(activeSubject);
  useEffect(() => {
    if (prevSubjectRef.current !== activeSubject) {
      prevSubjectRef.current = activeSubject;
      setActiveTab('all');
      setFilters((prev) => ({
        ...prev,
        selectedUnits: [],
        selectedSubtopics: [],
        selectedYears: [],
        selectedSeries: [],
        selectedTier: 'extended',
        variant: 'all',
        searchQuery: '',
        statusFilter: 'all',
        questionType: 'all',
        bookmarkedOnly: false,
      }));
      if (questions.length > 0) {
        setSelectedQuestionId(questions[0].id);
      } else {
        setSelectedQuestionId(null);
      }
    } else if (questions.length > 0) {
      if (!selectedQuestionId || !questions.some((q) => q.id === selectedQuestionId)) {
        setSelectedQuestionId(questions[0].id);
      }
    }
  }, [activeSubject, questions, selectedQuestionId]);

  // Save math syllabus era choice to localStorage
  useEffect(() => {
    if (filters.syllabusEra) {
      try {
        localStorage.setItem('cambridge_math_era', filters.syllabusEra);
      } catch {}
    }
  }, [filters.syllabusEra]);

  // Filter options extraction
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    questions.forEach((q) => {
      if (q.unit) units.add(q.unit);
      else if (q.paper) units.add(`paper${q.paper}`);
    });
    return Array.from(units).sort();
  }, [questions]);

  // Hierarchical taxonomy tree
  const subtopicHierarchy = useMemo(() => {
    return buildStaticSubtopicHierarchy(filters.selectedUnits, questions, activeSubject);
  }, [questions, filters.selectedUnits, activeSubject]);

  const availableYears = useMemo(() => {
    const isMathOrPhys = activeSubject === 'mathematics' || activeSubject === 'physics';
    const minYear = isMathOrPhys ? 2019 : 2021;
    const validYears = new Set<number>();
    for (let y = 2026; y >= minYear; y--) {
      validYears.add(y);
    }
    questions.forEach((q) => {
      if (q.year && q.year >= minYear && q.year <= 2026) {
        validYears.add(q.year);
      }
    });
    return Array.from(validYears).sort((a, b) => b - a);
  }, [questions, activeSubject]);

  // Filtered questions list coordinating Cambridge syllabus era, obsolete questions, tier, and components
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const meta = getCambridgeMetadata(q);

      // 1. 0580 Mathematics Syllabus Transition Engine
      if (activeSubject === 'mathematics') {
        const era = filters.syllabusEra || 'all';
        const qYear = q.year ?? meta.year ?? 2025;
        if (era === '2025-2028') {
          // Strictly 2025–2026 papers
          if (qYear < 2025 || qYear > 2026) return false;
        } else if (era === '2019-2024' || era === '2020-2024') {
          // Strictly 2019–2024 papers
          if (qYear < 2019 || qYear > 2024) return false;
        } else if (era === 'all') {
          // All Syllabi 2019–2026
          if (qYear < 2019 || qYear > 2026) return false;
        }
      }

      // 2. Sciences Pre-2023 Obsolete Filter
      if (activeSubject !== 'mathematics') {
        const hideObsolete = filters.hideObsolete ?? true;
        if (hideObsolete && meta.isObsolete) {
          return false;
        }
      }

      // 3. Cambridge Tier Filter ('all' | 'core' | 'extended' | 'practical')
      const targetTier = filters.selectedTier || filters.tier;
      if (targetTier && targetTier !== 'all') {
        if (targetTier === 'extended') {
          // Extended papers: P2, P4 for 0580 Maths; P2, P4, P6 for Sciences
          const isExtendedPaper =
            meta.tier === 'extended' ||
            meta.paperNum === 2 ||
            meta.paperNum === 4 ||
            (meta.paperNum === 6 && activeSubject !== 'mathematics');
          if (!isExtendedPaper) return false;
        } else if (targetTier === 'core') {
          // Core papers: P1, P3
          const isCorePaper = meta.tier === 'core' || meta.paperNum === 1 || meta.paperNum === 3;
          if (!isCorePaper) return false;
        } else {
          if (meta.tier !== targetTier) {
            return false;
          }
        }
      }

      // 4. Paper Component Multi-Select (e.g. 'paper1', 'paper2', 'paper3', 'paper4', 'paper6')
      if (filters.selectedUnits.length > 0) {
        const qPaperKey = `paper${meta.paperNum}`;
        const matchesComponent = filters.selectedUnits.some((fu) => {
          if (fu === qPaperKey) return true;
          if (fu === meta.paperLabel) return true;
          if (fu.toLowerCase() === `paper ${meta.paperNum}`.toLowerCase()) return true;
          return false;
        });
        if (!matchesComponent) return false;
      }

      // 5. Multi-select subtopic filter: match ANY selected subtopic
      if (filters.selectedSubtopics.length > 0) {
        const matchesSubtopic =
          (q.subtopics && q.subtopics.some((s) => filters.selectedSubtopics.includes(s))) ||
          (q.subtopic && filters.selectedSubtopics.includes(q.subtopic));
        if (!matchesSubtopic) return false;
      }

      // 6. Year multi-select filter
      if (filters.selectedYears.length > 0) {
        const yrStr = String(q.year ?? meta.year ?? '');
        if (!filters.selectedYears.includes(yrStr)) {
          return false;
        }
      }

      // 7. Series / Season multi-select filter (m, s, w)
      if (filters.selectedSeries.length > 0) {
        const qSeries = String(q.series ?? meta.series ?? '').toLowerCase();
        const matchesSeries = filters.selectedSeries.some((s) => {
          const target = s.toLowerCase();
          return qSeries.startsWith(target) || target.startsWith(qSeries);
        });
        if (!matchesSeries) return false;
      }

      // 7b. Variant filter ('all' | 1 | 2 | 3)
      if (filters.variant && filters.variant !== 'all') {
        const qVariant = Number(q.variant ?? meta.variantNum ?? 0);
        if (qVariant !== Number(filters.variant)) return false;
      }

      // 8. Bookmarked filter
      if (filters.bookmarkedOnly && !bookmarks.has(q.id)) return false;

      // 9. Status filter: 'all' | 'unattempted' | 'review' | 'mastered'
      const qStatus = questionStatuses[q.id] || 'unattempted';
      if (filters.statusFilter !== 'all' && qStatus !== filters.statusFilter) return false;

      // 10. Question type filter: 'all' | 'mcq' | 'theory'
      if (filters.questionType !== 'all') {
        const qType = getQuestionType(q);
        if (qType !== filters.questionType) return false;
      }

      // 11. Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchQNum = String(q.questionNumber ?? q.question_number ?? '').toLowerCase().includes(query);
        const matchTopic = (q.topic || '').toLowerCase().includes(query);
        const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query);
        const matchSubs = (q.subtopics || []).some((s) => s.toLowerCase().includes(query));
        const matchStem = (q.stemSummary || '').toLowerCase().includes(query);
        const matchSeries = (q.series || '').toLowerCase().includes(query);
        const matchPaper = meta.paperLabel.toLowerCase().includes(query);
        const matchId = q.id.toLowerCase().includes(query);
        if (!matchQNum && !matchTopic && !matchSubtopic && !matchSubs && !matchStem && !matchSeries && !matchPaper && !matchId) return false;
      }

      return true;
    }).sort(sortQuestionsLatestFirst);
  }, [questions, filters, bookmarks, questionStatuses, activeSubject]);

  // Active question item
  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    const match = filteredQuestions.find((q) => q.id === selectedQuestionId);
    return match || filteredQuestions[0];
  }, [filteredQuestions, selectedQuestionId]);

  useEffect(() => {
    if (activeQuestion && activeQuestion.id !== selectedQuestionId) {
      setSelectedQuestionId(activeQuestion.id);
    }
  }, [activeQuestion, selectedQuestionId]);

  const currentIndex = useMemo(() => {
    if (!activeQuestion) return -1;
    return filteredQuestions.findIndex((q) => q.id === activeQuestion.id);
  }, [filteredQuestions, activeQuestion]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredQuestions.length - 1;

  const handlePrevQuestion = useCallback(() => {
    if (hasPrev) {
      setSelectedQuestionId(filteredQuestions[currentIndex - 1].id);
    }
  }, [hasPrev, currentIndex, filteredQuestions]);

  const handleNextQuestion = useCallback(() => {
    if (hasNext) {
      setSelectedQuestionId(filteredQuestions[currentIndex + 1].id);
    }
  }, [hasNext, currentIndex, filteredQuestions]);

  // Toggle between Question Only and Showing Answers (Split view)
  const handleToggleMarkScheme = useCallback(() => {
    setViewMode((prev) => (prev === 'question-only' ? 'split' : 'question-only'));
  }, []);

  const handleCycleStatus = useCallback((id: string) => {
    cycleQuestionStatus(id);
  }, [cycleQuestionStatus]);

  const handleToggleBookmark = useCallback((id: string) => {
    toggleBookmark(id);
  }, [toggleBookmark]);

  const handleToggleActiveBookmark = useCallback(() => {
    if (!activeQuestion) return;
    toggleBookmark(activeQuestion.id);
  }, [activeQuestion, toggleBookmark]);

  // Global Keyboard shortcuts:
  // - ArrowLeft / [: Previous question
  // - ArrowRight / ]: Next question
  // - M or Space: Toggle mark scheme visibility
  // - B: Toggle Bookmark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentView.endsWith('-topical')) return;
      if (isDataBookletOpen || isAuthModalOpen || isCommandPaletteOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('button, a, [role="button"]'))
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight' || e.key === ']' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === ' ' || e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        handleToggleMarkScheme();
      } else if (e.key === 'm' || e.key === 'M') {
        if (e.repeat) return;
        e.preventDefault();
        setViewMode((prev) => (prev === 'split' ? 'question-only' : prev === 'question-only' ? 'ms-only' : 'split'));
      } else if (e.key === 'b' || e.key === 'B') {
        if (e.repeat) return;
        e.preventDefault();
        handleToggleActiveBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isDataBookletOpen, isAuthModalOpen, isCommandPaletteOpen, handlePrevQuestion, handleNextQuestion, handleToggleMarkScheme, handleToggleActiveBookmark]);

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };
      if (updates.bookmarkedOnly !== undefined) {
        setActiveTab(updates.bookmarkedOnly ? 'bookmarked' : 'all');
      }
      return next;
    });
  };

  const handleTabChange = (tab: 'all' | 'bookmarked') => {
    setActiveTab(tab);
    setFilters((prev) => ({ ...prev, bookmarkedOnly: tab === 'bookmarked' }));
  };

  const handleResetFilters = () => {
    setActiveTab('all');
    setFilters({
      syllabusEra: 'all',
      hideObsolete: true,
      selectedTier: 'extended',
      variant: 'all',
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    });
  };

  const handleSelectUnitFromPalette = useCallback((subject: Subject, unitLabel: string) => {
    prevSubjectRef.current = subject;
    setActiveTab('all');
    setFilters({
      syllabusEra: 'all',
      hideObsolete: true,
      selectedTier: 'extended',
      selectedUnits: [unitLabel],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    });
    setSelectedQuestionId(null);
    const targetView: AppView = subject === 'physics'
      ? 'physics-topical'
      : subject === 'chemistry'
      ? 'chemistry-topical'
      : subject === 'biology'
      ? 'biology-topical'
      : 'mathematics-topical';
    setCurrentView(targetView);
    window.location.hash = subject === 'physics'
      ? '#/physics/topical'
      : subject === 'chemistry'
      ? '#/chemistry/topical'
      : subject === 'biology'
      ? '#/biology/topical'
      : '#/mathematics/topical';
  }, []);

  const handleSelectQuestionFromPalette = useCallback((subject: Subject, questionId: string) => {
    prevSubjectRef.current = subject;
    setActiveTab('all');
    setFilters({
      syllabusEra: 'all',
      hideObsolete: false,
      selectedTier: 'all',
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    });
    setSelectedQuestionId(questionId);
    const targetView: AppView = subject === 'physics'
      ? 'physics-topical'
      : subject === 'chemistry'
      ? 'chemistry-topical'
      : subject === 'biology'
      ? 'biology-topical'
      : 'mathematics-topical';
    setCurrentView(targetView);
    const basePath = subject === 'physics'
      ? '#/physics/topical'
      : subject === 'chemistry'
      ? '#/chemistry/topical'
      : subject === 'biology'
      ? '#/biology/topical'
      : '#/mathematics/topical';
    window.location.hash = `${basePath}?q=${encodeURIComponent(questionId)}`;
  }, []);

  const totalMarks = useMemo(() => {
    return filteredQuestions.reduce((sum, q) => sum + (q.marks ?? q.total_marks ?? 0), 0);
  }, [filteredQuestions]);

  const accentSpotlight = useMemo(() => {
    switch (activeSubject) {
      case 'mathematics':
        return 'rgba(249, 115, 22, 0.06)'; // Orange (0580)
      case 'physics':
        return 'rgba(59, 130, 246, 0.06)'; // Blue (0625)
      case 'chemistry':
        return 'rgba(6, 182, 212, 0.06)';  // Cyan (0620)
      case 'biology':
        return 'rgba(16, 185, 129, 0.06)'; // Emerald (0610)
      default:
        return 'rgba(249, 115, 22, 0.06)';
    }
  }, [activeSubject]);

  const isSubjectLoading = currentView !== 'home' && (
    loadingSubject === activeSubject ||
    (activeSubject === 'mathematics' && !mathQuestions) ||
    (activeSubject === 'physics' && !physQuestions) ||
    (activeSubject === 'chemistry' && !chemQuestions) ||
    (activeSubject === 'biology' && !bioQuestions)
  );

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#080B11] text-zinc-100 flex flex-col relative"
      style={{
        '--accent-spotlight': accentSpotlight,
      } as React.CSSProperties}
    >
      <AmbientBackground />

      {/* Top Application Navbar */}
      <AppNavbar
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={testCart.length}
        totalQuestions={questions.length}
        activeSubject={activeSubject}
        mathCount={mathQuestions?.length ?? 0}
        physCount={physQuestions?.length ?? 0}
        chemCount={chemQuestions?.length ?? 0}
        bioCount={bioQuestions?.length ?? 0}
        onOpenDataBooklet={() => setIsDataBookletOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {isSubjectLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-slate-600 dark:text-slate-400 gap-3 relative z-10">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium">
            Loading Cambridge IGCSE {activeSubject === 'mathematics' ? 'Mathematics (0580)' : activeSubject === 'physics' ? 'Physics (0625)' : activeSubject === 'biology' ? 'Biology (0610)' : 'Chemistry (0620)'} questions...
          </p>
        </div>
      ) : datasetError && currentView !== 'home' && questions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-rose-500 dark:text-rose-400 gap-3 relative z-10">
          <p className="text-sm font-medium">Error: {datasetError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-200 dark:bg-dark-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-dark-750 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Main View Router */}
          {currentView === 'home' && (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <HomePage
                onNavigate={handleNavigate}
                questions={chemQuestions || []}
                physicsQuestions={physQuestions || []}
                mathematicsQuestions={mathQuestions || []}
              />
            </React.Suspense>
          )}

          {currentView.endsWith('-test-maker') && (
            <div className={`flex-1 min-h-0 w-full overflow-hidden flex flex-col relative z-10 transition-[margin] duration-200 ${
              isDataBookletOpen ? (isDataBookletExpanded ? '2xl:mr-[960px] md:mr-[500px] lg:mr-[560px]' : 'md:mr-[500px] lg:mr-[560px]') : ''
            }`}>
              <CanvasErrorBoundary onResetFilters={handleResetFilters}>
                <React.Suspense fallback={<ViewLoadingFallback />}>
                  <TestMakerPage
                    key={activeSubject}
                    subject={activeSubject}
                    questions={questions}
                    cartQuestionIds={testCart}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onClearCart={handleClearCart}
                    onReorderCart={handleReorderCart}
                    testTitle={testTitle}
                    onSetTestTitle={setTestTitle}
                  />
                </React.Suspense>
              </CanvasErrorBoundary>
            </div>
          )}

          {currentView.endsWith('-topical') && (
            <div className={`flex-1 min-h-0 w-full overflow-visible flex flex-col relative z-20 transition-[margin] duration-200 ${
              isDataBookletOpen ? (isDataBookletExpanded ? '2xl:mr-[960px] md:mr-[500px] lg:mr-[560px]' : 'md:mr-[500px] lg:mr-[560px]') : ''
            }`}>
              {/* Top Filter & Search Bar */}
              <TopBar
                key={activeSubject}
                filters={filters}
                onFilterChange={handleFilterChange}
                availableUnits={availableUnits}
                subtopicHierarchy={subtopicHierarchy}
                availableYears={availableYears}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalFiltered={filteredQuestions.length}
                totalMarks={totalMarks}
                onResetFilters={handleResetFilters}
                allQuestions={questions}
              />

              {/* Main Workspace: Left Drawer + Split Canvas */}
              <div className="flex-1 min-h-0 w-full overflow-hidden flex relative">
                <QuestionList
                  questions={filteredQuestions}
                  selectedQuestionId={activeQuestion?.id || null}
                  onSelectQuestion={(q) => setSelectedQuestionId(q.id)}
                  bookmarks={bookmarks}
                  onToggleBookmark={handleToggleBookmark}
                  questionStatuses={questionStatuses}
                  onCycleStatus={handleCycleStatus}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  onClearFilters={handleResetFilters}
                  isDrawerOpen={isQuestionDrawerOpen}
                  onCloseDrawer={() => setIsQuestionDrawerOpen(false)}
                />

                <CanvasErrorBoundary onResetFilters={handleResetFilters}>
                  <React.Suspense fallback={<ViewLoadingFallback />}>
                    <SplitViewer
                      question={activeQuestion}
                      prevQuestion={hasPrev ? filteredQuestions[currentIndex - 1] : null}
                      nextQuestion={hasNext ? filteredQuestions[currentIndex + 1] : null}
                      allQuestions={questions}
                      questions={filteredQuestions}
                      onSelectQuestionById={(id: string) => setSelectedQuestionId(id)}
                      viewMode={viewMode}
                      onToggleMarkScheme={handleToggleMarkScheme}
                      onSetViewMode={setViewMode}
                      onPrevQuestion={handlePrevQuestion}
                      onNextQuestion={handleNextQuestion}
                      hasPrev={hasPrev}
                      hasNext={hasNext}
                      currentIndex={currentIndex}
                      totalQuestions={filteredQuestions.length}
                      questionStatus={activeQuestion ? (questionStatuses[activeQuestion.id] || 'unattempted') : 'unattempted'}
                      onCycleStatus={() => activeQuestion && handleCycleStatus(activeQuestion.id)}
                      isBookmarked={activeQuestion ? bookmarks.has(activeQuestion.id) : false}
                      onToggleBookmark={handleToggleActiveBookmark}
                      onOpenQuestionList={() => setIsQuestionDrawerOpen(true)}
                    />
                  </React.Suspense>
                </CanvasErrorBoundary>
              </div>
            </div>
          )}
        </>
      )}

      <DataBookletDrawer
        isOpen={isDataBookletOpen}
        onClose={() => setIsDataBookletOpen(false)}
        activeSubject={activeSubject}
        onExpandedChange={setIsDataBookletExpanded}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
        currentView={currentView}
        activeSubject={activeSubject}
        onNavigate={handleNavigate}
        onToggleDataBooklet={() => setIsDataBookletOpen((prev) => !prev)}
        onResetFilters={handleResetFilters}
        onToggleMarkScheme={handleToggleMarkScheme}
        onToggleBookmarkedOnly={() => handleTabChange(activeTab === 'bookmarked' ? 'all' : 'bookmarked')}
        onSelectUnitFilter={handleSelectUnitFromPalette}
        onSelectQuestion={handleSelectQuestionFromPalette}
        chemQuestions={chemQuestions}
        physQuestions={physQuestions}
        mathQuestions={mathQuestions}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Analytics />
    </div>
  );
};

export default App;
