import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  BookOpen, 
  FlaskConical, 
  Zap,
  Sigma,
  Dna,
  Calculator,
  Grid,
  LayoutList
} from 'lucide-react';
import { Subject } from '../types';
import {
  CAMBRIDGE_MATH_FORMULAE,
  CAMBRIDGE_PHYSICS_EQUATIONS,
  CIRCUIT_SYMBOLS,
  PERIODIC_ELEMENTS,
  BIOLOGY_FOOD_TESTS,
  BIOLOGY_MAGNIFICATION_FORMULAE,
  PeriodicElement,
  EquationItem,
} from '../constants/referenceData';
import { MathFormula } from './MathFormula';
import { PhysicsConstants } from './reference/PhysicsConstants';
import { CircuitSymbols } from './reference/CircuitSymbols';
import { ChemistryReference } from './reference/ChemistryReference';
import { BiologyReference } from './reference/BiologyReference';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';

interface DataBookletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: Subject;
  onExpandedChange?: (isExpanded: boolean) => void;
}

type PhysicsTab = 'equations' | 'constants' | 'symbols';
type ChemistryTab = 'periodic_table' | 'qualitative_analysis';
type BiologyTab = 'food_tests' | 'magnification';
type PeriodicTableView = 'grid' | 'cards';

function getElementCategoryStyle(category?: string) {
  switch (category) {
    case 'alkali':
      return 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-300/60 dark:border-amber-600/40 text-amber-900 dark:text-amber-200';
    case 'alkaline-earth':
      return 'bg-orange-50/70 hover:bg-orange-100/80 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 border-orange-300/60 dark:border-orange-600/40 text-orange-900 dark:text-orange-200';
    case 'transition':
      return 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-850 dark:hover:bg-dark-800 border-slate-200 dark:border-dark-750 text-slate-800 dark:text-slate-200';
    case 'post-transition':
      return 'bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border-sky-300/60 dark:border-sky-600/40 text-sky-900 dark:text-sky-200';
    case 'metalloid':
      return 'bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 border-teal-300/60 dark:border-teal-600/40 text-teal-900 dark:text-teal-200';
    case 'nonmetal':
      return 'bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-300/60 dark:border-blue-600/40 text-blue-900 dark:text-blue-200';
    case 'halogen':
      return 'bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-emerald-300/60 dark:border-emerald-600/40 text-emerald-900 dark:text-emerald-200';
    case 'noble-gas':
      return 'bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 border-purple-300/60 dark:border-purple-600/40 text-purple-900 dark:text-purple-200';
    case 'lanthanide':
      return 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-300/60 dark:border-rose-600/40 text-rose-900 dark:text-rose-200';
    case 'actinide':
      return 'bg-pink-50/70 hover:bg-pink-100/80 dark:bg-pink-950/20 dark:hover:bg-pink-950/40 border-pink-300/60 dark:border-pink-600/40 text-pink-900 dark:text-pink-200';
    default:
      return 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-850 dark:hover:bg-dark-800 border-slate-200 dark:border-dark-750 text-slate-800 dark:text-slate-200';
  }
}

export const DataBookletDrawer: React.FC<DataBookletDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject = 'physics',
  onExpandedChange,
}) => {
  const [subject, setSubject] = useState<Subject>(activeSubject);
  const [physicsTab, setPhysicsTab] = useState<PhysicsTab>('equations');
  const [chemistryTab, setChemistryTab] = useState<ChemistryTab>('periodic_table');
  const [biologyTab, setBiologyTab] = useState<BiologyTab>('food_tests');
  const [mathSection, setMathSection] = useState<'all' | 'Mensuration' | 'Algebra' | 'Trigonometry' | 'Statistics'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<PeriodicElement | null>(null);
  const [periodicView, setPeriodicView] = useState<PeriodicTableView>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'grid';
  });

  // Biology Magnification Interactive Calculator state
  const [calcImageMm, setCalcImageMm] = useState<string>('24');
  const [calcActualUm, setCalcActualUm] = useState<string>('40');
  const [calcMag, setCalcMag] = useState<string>('');
  const [calcMode, setCalcMode] = useState<'find_m' | 'find_a' | 'find_i'>('find_m');

  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Sync subject when drawer opens or activeSubject changes
  useEffect(() => {
    if (isOpen) {
      setSubject(activeSubject);
    }
  }, [isOpen, activeSubject]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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
        if (selectedElement) {
          setSelectedElement(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedElement]);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500);
        })
        .catch(() => {});
    }
  };

  const query = searchQuery.trim().toLowerCase();

  // 1. Filtered Mathematics Formulae
  const filteredMathFormulae = useMemo(() => {
    return CAMBRIDGE_MATH_FORMULAE.filter((f) => {
      const matchSec = mathSection === 'all' || f.section === mathSection;
      if (!matchSec) return false;
      if (!query) return true;
      return (
        f.title.toLowerCase().includes(query) ||
        f.section.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query) ||
        f.latex.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
      );
    });
  }, [mathSection, query]);

  // 2. Filtered Physics Data
  const filteredPhysicsEquations = useMemo(() => {
    if (!query) return CAMBRIDGE_PHYSICS_EQUATIONS;
    return CAMBRIDGE_PHYSICS_EQUATIONS.filter(
      (eq) =>
        eq.title.toLowerCase().includes(query) ||
        eq.formula.toLowerCase().includes(query) ||
        eq.topic.toLowerCase().includes(query) ||
        eq.latex.toLowerCase().includes(query)
    );
  }, [query]);

  // 3. Filtered Chemistry Data
  const filteredElements = useMemo(() => {
    if (!query) return PERIODIC_ELEMENTS;
    return PERIODIC_ELEMENTS.filter(
      (el) =>
        el.symbol.toLowerCase().includes(query) ||
        el.name.toLowerCase().includes(query) ||
        String(el.atomicNumber).includes(query) ||
        el.atomicMass.toLowerCase().includes(query) ||
        el.category.toLowerCase().includes(query)
    );
  }, [query]);

  // 4. Filtered Biology Data

  const filteredMagnificationFormulae = useMemo(() => {
    if (!query) return BIOLOGY_MAGNIFICATION_FORMULAE;
    return BIOLOGY_MAGNIFICATION_FORMULAE.filter(
      (f) =>
        f.title.toLowerCase().includes(query) ||
        f.latex.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
    );
  }, [query]);

  // Grid active state for periodic table drawer expansion
  const isGridActive = subject === 'chemistry' && chemistryTab === 'periodic_table' && !query && periodicView === 'grid';

  useEffect(() => {
    onExpandedChange?.(isOpen && isGridActive);
  }, [isOpen, isGridActive, onExpandedChange]);

  // Group equations by topic
  const groupedEquations = useMemo(() => {
    const groups: Record<string, EquationItem[]> = {};
    for (const eq of filteredPhysicsEquations) {
      const groupKey = eq.topic || 'General';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(eq);
    }
    return groups;
  }, [filteredPhysicsEquations]);

  // Calculation for magnification tool
  const calculatedResult = useMemo(() => {
    const imgMm = parseFloat(calcImageMm);
    const actUm = parseFloat(calcActualUm);
    const magVal = parseFloat(calcMag);

    if (calcMode === 'find_m') {
      if (!isNaN(imgMm) && !isNaN(actUm) && actUm > 0) {
        // M = I (in um) / A (in um) = (imgMm * 1000) / actUm
        const m = (imgMm * 1000) / actUm;
        return {
          label: 'Magnification (M)',
          value: `× ${Math.round(m * 10) / 10}`,
          formula: `M = \\frac{I}{A} = \\frac{${imgMm}\\text{ mm} \\times 1000}{${actUm}\\text{ }\\mu\\text{m}} = \\times ${Math.round(m * 10) / 10}`,
        };
      }
    } else if (calcMode === 'find_a') {
      if (!isNaN(imgMm) && !isNaN(magVal) && magVal > 0) {
        // A (in um) = (imgMm * 1000) / magVal
        const a = (imgMm * 1000) / magVal;
        return {
          label: 'Actual Specimen Size (A)',
          value: `${Math.round(a * 100) / 100} μm`,
          formula: `A = \\frac{I}{M} = \\frac{${imgMm}\\text{ mm} \\times 1000}{${magVal}} = ${Math.round(a * 100) / 100}\\text{ }\\mu\\text{m}`,
        };
      }
    } else if (calcMode === 'find_i') {
      if (!isNaN(actUm) && !isNaN(magVal)) {
        // I (in mm) = (actUm * magVal) / 1000
        const iMm = (actUm * magVal) / 1000;
        return {
          label: 'Image Size (I)',
          value: `${Math.round(iMm * 100) / 100} mm`,
          formula: `I = M \\times A = ${magVal} \\times ${actUm}\\text{ }\\mu\\text{m} = ${(actUm * magVal).toFixed(0)}\\text{ }\\mu\\text{m} = ${Math.round(iMm * 100) / 100}\\text{ mm}`,
        };
      }
    }
    return null;
  }, [calcImageMm, calcActualUm, calcMag, calcMode]);

  if (!isOpen) return null;

  const subjectCode =
    subject === 'mathematics'
      ? '0580'
      : subject === 'physics'
      ? '0625'
      : subject === 'chemistry'
      ? '0620'
      : '0610';

  return (
    <div 
      className="fixed inset-0 z-[60] flex justify-end bg-transparent md:pointer-events-none select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Drawer Container */}
      <div 
        className={`w-full ${
          isGridActive ? 'md:w-[92vw] lg:w-[980px] max-w-6xl' : 'sm:w-[500px] md:w-[580px]'
        } h-full bg-white dark:bg-[#0B0F17] border-l border-slate-200 dark:border-white/[0.08] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 z-10 select-text transition-[width] pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] surface-glass shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  subject === 'mathematics'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : subject === 'physics'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    : subject === 'chemistry'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Cambridge IGCSE Reference
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      subject === 'mathematics'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : subject === 'physics'
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                        : subject === 'chemistry'
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {subjectCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Official 2025–2028 formulae, constants &amp; practical notes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center kbd-keycap">
                Press D
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4-Subject Reactive Switcher */}
          <div className="flex items-center bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-xs w-full gap-0.5 border border-slate-300/40 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setSubject('mathematics');
                setMathSection('all');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                subject === 'mathematics'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sigma className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Maths</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject('physics');
                setPhysicsTab('equations');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                subject === 'physics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Physics</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject('chemistry');
                setChemistryTab('periodic_table');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                subject === 'chemistry'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chem</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject('biology');
                setBiologyTab('food_tests');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                subject === 'biology'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Dna className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bio</span>
            </button>
          </div>

          {/* Real-Time Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                subject === 'mathematics'
                  ? 'Search 0580 formulae (mensuration, algebra, sine rule)...'
                  : subject === 'physics'
                  ? 'Search 0625 equations, constants, circuit symbols...'
                  : subject === 'chemistry'
                  ? 'Search 0620 elements, anion/cation tests, flame tests...'
                  : 'Search 0610 food tests, magnification, conversion factors...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subtopic Segmented Tabs */}
          <div>
            {subject === 'mathematics' ? (
              <div className="flex items-center bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-xs gap-0.5 border border-slate-300/40 dark:border-white/[0.06] overflow-x-auto">
                {(['all', 'Mensuration', 'Algebra', 'Trigonometry', 'Statistics'] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setMathSection(sec)}
                    className={`flex-1 py-1 px-1.5 rounded-md font-semibold text-center transition-all truncate text-[11px] whitespace-nowrap ${
                      mathSection === sec
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sec === 'all' ? 'All Sections' : sec}
                  </button>
                ))}
              </div>
            ) : subject === 'physics' ? (
              <div className="grid grid-cols-3 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setPhysicsTab('equations')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'equations'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Equations ({CAMBRIDGE_PHYSICS_EQUATIONS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('constants')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'constants'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Constants &amp; Prefixes
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('symbols')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'symbols'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Circuit Symbols ({CIRCUIT_SYMBOLS.length})
                </button>
              </div>
            ) : subject === 'chemistry' ? (
              <div className="grid grid-cols-2 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setChemistryTab('periodic_table')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'periodic_table'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Periodic Table (1–118)
                </button>
                <button
                  type="button"
                  onClick={() => setChemistryTab('qualitative_analysis')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'qualitative_analysis'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Qualitative Analysis Notes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setBiologyTab('food_tests')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    biologyTab === 'food_tests'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Food Tests ({BIOLOGY_FOOD_TESTS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBiologyTab('magnification')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    biologyTab === 'magnification'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Magnification &amp; Calculator
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* =================================================================== */}
          {/* 1. MATHEMATICS (0580) — OFFICIAL FORMULA SHEET                      */}
          {/* =================================================================== */}
          {subject === 'mathematics' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="font-semibold">
                  Showing {filteredMathFormulae.length} of {CAMBRIDGE_MATH_FORMULAE.length} formulae
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                  Syllabus 2025–2028
                </span>
              </div>

              {filteredMathFormulae.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No mathematical formulae matched &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredMathFormulae.map((item) => {
                    const isCopied = copiedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onPointerMove={handleSpotlightMove}
                        onPointerLeave={handleSpotlightLeave}
                        style={getSubjectSpotlightStyle('mathematics', 320)}
                        className="spotlight-surface p-3 flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                              {item.section}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold tracking-wide bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
                              {item.unit}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                              {item.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.latex, item.id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 transition-all shrink-0"
                            title="Copy LaTeX formula"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="relative z-10 w-full overflow-x-auto px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#07090D] border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white flex items-center min-h-[38px]">
                          <MathFormula latex={item.latex} className="text-xs sm:text-[13px] whitespace-nowrap" />
                        </div>

                        {item.description && (
                          <div className="relative z-10 text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                            {item.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 2. PHYSICS (0625) — EQUATIONS, CONSTANTS & SYMBOLS                 */}
          {/* =================================================================== */}
          {subject === 'physics' && (
            <div className="space-y-4">
              {physicsTab === 'equations' && (
                <div className="space-y-4">
                  {Object.keys(groupedEquations).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No physics equations matched &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    Object.entries(groupedEquations).map(([topic, eqs]) => (
                      <div key={topic} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {topic}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({eqs.length})
                          </span>
                        </div>

                        <div className="space-y-2">
                          {eqs.map((eq) => {
                            const isCopied = copiedId === eq.id;
                            return (
                              <div
                                key={eq.id}
                                onPointerMove={handleSpotlightMove}
                                onPointerLeave={handleSpotlightLeave}
                                style={getSubjectSpotlightStyle('physics', 320)}
                                className="spotlight-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors"
                              >
                                <div className="relative z-10 sm:max-w-[45%] min-w-[130px] space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                      {eq.unit}
                                    </span>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {eq.title}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    {eq.formula}
                                  </div>
                                </div>

                                <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 flex-1 min-w-0">
                                  <div className="overflow-x-auto max-w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#07090D] border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white flex items-center min-h-[36px]">
                                    <MathFormula latex={eq.latex} className="text-xs sm:text-sm whitespace-nowrap" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(eq.latex, eq.id)}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all shrink-0"
                                    title="Copy LaTeX formula"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {physicsTab === 'constants' && (
                <PhysicsConstants searchQuery={searchQuery} />
              )}

              {physicsTab === 'symbols' && (
                <CircuitSymbols searchQuery={searchQuery} />
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 3. CHEMISTRY (0620) — PERIODIC TABLE & QUALITATIVE ANALYSIS        */}
          {/* =================================================================== */}
          {subject === 'chemistry' && (
            <div className="space-y-4">
              {chemistryTab === 'periodic_table' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Showing {filteredElements.length} elements
                    </span>

                    <div className="flex items-center bg-slate-200/80 dark:bg-dark-800 p-0.5 rounded-lg text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPeriodicView('grid')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                          !query && periodicView === 'grid'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Grid className="w-3 h-3" />
                        <span>18-Col Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPeriodicView('cards')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                          query || periodicView === 'cards'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <LayoutList className="w-3 h-3" />
                        <span>Cards</span>
                      </button>
                    </div>
                  </div>

                  {/* 18-Column Interactive Grid */}
                  {!query && periodicView === 'grid' ? (
                    <div className="overflow-x-auto pb-4">
                      <div className="min-w-[760px] grid gap-0.5 select-text" style={{ gridTemplateColumns: '24px repeat(18, minmax(0, 1fr))' }}>
                        {/* Header Row: Groups 1-18 */}
                        <div className="h-6 flex items-center justify-center text-[9px] font-mono font-bold text-slate-400">
                          P\G
                        </div>
                        {Array.from({ length: 18 }, (_, i) => (
                          <div key={i + 1} className="h-6 flex items-center justify-center text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            {i + 1}
                          </div>
                        ))}

                        {/* Periods 1 to 7 */}
                        {[1, 2, 3, 4, 5, 6, 7].map((periodNum) => (
                          <React.Fragment key={periodNum}>
                            {/* Period row label */}
                            <div className="flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 border-r border-slate-200 dark:border-white/[0.08]">
                              {periodNum}
                            </div>

                            {/* 18 columns */}
                            {Array.from({ length: 18 }, (_, colIndex) => {
                              const groupNum = colIndex + 1;
                              const element = PERIODIC_ELEMENTS.find(
                                (e) => e.period === periodNum && (typeof e.group === 'number' ? e.group === groupNum : false)
                              );

                              if (!element) {
                                return <div key={colIndex} className="min-h-[50px] bg-slate-50/20 dark:bg-transparent" />;
                              }

                              const isSelected = selectedElement?.atomicNumber === element.atomicNumber;
                              const styleClass = getElementCategoryStyle(element.category);

                              return (
                                <button
                                  key={element.atomicNumber}
                                  type="button"
                                  onClick={() => setSelectedElement(element)}
                                  className={`min-h-[50px] p-1 rounded border flex flex-col justify-between text-left transition-all ${styleClass} ${
                                    isSelected ? 'ring-2 ring-cyan-500 shadow-md scale-105 z-10' : ''
                                  }`}
                                  title={`${element.name} (${element.symbol}) - Z: ${element.atomicNumber}, Ar: ${element.atomicMass}`}
                                >
                                  <div className="flex items-center justify-between w-full text-[9px] font-mono leading-none">
                                    <span className="font-bold">{element.atomicNumber}</span>
                                    <span className="text-[8px] opacity-75">{element.atomicMass}</span>
                                  </div>
                                  <div className="font-bold font-mono text-xs text-center my-0.5">
                                    {element.symbol}
                                  </div>
                                  <div className="text-[8px] truncate leading-none opacity-85 text-center">
                                    {element.name}
                                  </div>
                                </button>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Cards Grid */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {filteredElements.map((el) => {
                        const styleClass = getElementCategoryStyle(el.category);
                        return (
                          <button
                            key={el.atomicNumber}
                            type="button"
                            onClick={() => setSelectedElement(el)}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${styleClass}`}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-mono">
                              <span className="font-bold">Z = {el.atomicNumber}</span>
                              <span className="text-[10px] opacity-80 font-semibold">Ar: {el.atomicMass}</span>
                            </div>
                            <div className="font-mono font-extrabold text-base my-0.5 text-center">
                              {el.symbol}
                            </div>
                            <div className="text-xs font-semibold text-center truncate">
                              {el.name}
                            </div>
                            <div className="text-[9.5px] uppercase tracking-wider text-center opacity-70">
                              {el.category}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Element Details Modal / Banner */}
                  {selectedElement && (
                    <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-950/30 flex items-center justify-between gap-4 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex flex-col items-center justify-center font-mono shadow-md">
                          <span className="text-[10px] font-bold leading-none">{selectedElement.atomicNumber}</span>
                          <span className="text-lg font-extrabold leading-none">{selectedElement.symbol}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{selectedElement.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30">
                              Period {selectedElement.period}, Group {selectedElement.group}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                            Relative Atomic Mass: <span className="font-bold">{selectedElement.atomicMass}</span> • Category: <span className="capitalize">{selectedElement.category}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {chemistryTab === 'qualitative_analysis' && (
                <ChemistryReference searchQuery={searchQuery} />
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. BIOLOGY (0610) — FOOD TESTS & MAGNIFICATION                     */}
          {/* =================================================================== */}
          {subject === 'biology' && (
            <div className="space-y-4">
              {biologyTab === 'food_tests' && (
                <BiologyReference searchQuery={searchQuery} />
              )}

              {biologyTab === 'magnification' && (
                <div className="space-y-4">
                  {/* Magnification Formulae Cards */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider px-1">
                      Magnification Formulae
                    </h3>
                    <div className="grid gap-2">
                      {filteredMagnificationFormulae.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {f.title}
                            </div>
                            {f.description && (
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                {f.description}
                              </div>
                            )}
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.06] shrink-0">
                            <MathFormula latex={f.latex} className="text-xs font-bold" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Magnification Calculator */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Interactive Magnification Calculator
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                        I = M × A
                      </span>
                    </div>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-[11px] font-semibold border border-slate-300/40 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setCalcMode('find_m')}
                        className={`py-1 rounded text-center transition-all ${
                          calcMode === 'find_m'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Calculate M
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('find_a')}
                        className={`py-1 rounded text-center transition-all ${
                          calcMode === 'find_a'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Calculate A
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('find_i')}
                        className={`py-1 rounded text-center transition-all ${
                          calcMode === 'find_i'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Calculate I
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {calcMode !== 'find_i' && (
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            Image Size (I) [mm]
                          </label>
                          <input
                            type="number"
                            value={calcImageMm}
                            onChange={(e) => setCalcImageMm(e.target.value)}
                            className="w-full bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            placeholder="e.g. 24"
                          />
                        </div>
                      )}

                      {calcMode !== 'find_a' && (
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            Actual Size (A) [μm]
                          </label>
                          <input
                            type="number"
                            value={calcActualUm}
                            onChange={(e) => setCalcActualUm(e.target.value)}
                            className="w-full bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            placeholder="e.g. 40"
                          />
                        </div>
                      )}

                      {calcMode !== 'find_m' && (
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            Magnification (M)
                          </label>
                          <input
                            type="number"
                            value={calcMag}
                            onChange={(e) => setCalcMag(e.target.value)}
                            className="w-full bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            placeholder="e.g. 600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Output */}
                    {calculatedResult && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                            {calculatedResult.label}
                          </span>
                          <span className="text-sm font-extrabold font-mono text-emerald-800 dark:text-emerald-200">
                            {calculatedResult.value}
                          </span>
                        </div>
                        <div className="text-right">
                          <MathFormula latex={calculatedResult.formula} className="text-xs" />
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 italic">
                      Tip: 1 mm = 1000 μm. Always convert Image Size from mm to μm before dividing by Actual Size in μm.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataBookletDrawer;
