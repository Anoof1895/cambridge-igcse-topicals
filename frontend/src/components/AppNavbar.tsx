import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Atom,
  Sigma,
  Dna,
  Home, 
  Compass, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  LogIn,
  LogOut,
  BookOpen,
  Search
} from 'lucide-react';
import { AppView, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';

interface AppNavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  cartCount?: number;
  totalQuestions?: number;
  activeSubject?: Subject;
  mathCount?: number;
  physCount?: number;
  chemCount?: number;
  bioCount?: number;
  onOpenDataBooklet?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  currentView,
  onNavigate,
  cartCount = 0,
  totalQuestions = 0,
  activeSubject = 'mathematics',
  mathCount = 0,
  physCount = 0,
  chemCount = 0,
  bioCount = 0,
  onOpenDataBooklet,
  onOpenCommandPalette,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);

  // Close subject switcher on click outside
  useEffect(() => {
    if (!isSubjectMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node)) {
        setIsSubjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSubjectMenuOpen]);

  const { theme, toggleTheme } = useTheme();
  const { user, openAuthModal, signOut } = useAuth();

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktopMenu = userMenuRef.current?.contains(target);
      const inMobileMenu = mobileUserMenuRef.current?.contains(target);
      if (!inDesktopMenu && !inMobileMenu) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Student';

  const isMath = activeSubject === 'mathematics' || currentView.startsWith('mathematics');
  const isPhysics = activeSubject === 'physics' || currentView.startsWith('physics');
  const isBio = activeSubject === 'biology' || currentView.startsWith('biology');

  const topicalView: AppView = isMath
    ? 'mathematics-topical'
    : isPhysics
    ? 'physics-topical'
    : isBio
    ? 'biology-topical'
    : 'chemistry-topical';

  const testMakerView: AppView = isMath
    ? 'mathematics-test-maker'
    : isPhysics
    ? 'physics-test-maker'
    : isBio
    ? 'biology-test-maker'
    : 'chemistry-test-maker';

  const isTopicalActive = currentView.endsWith('-topical');
  const isTestMakerActive = currentView.endsWith('-test-maker');

  // Reactive brand styling tokens based on active Cambridge subject
  const brandIconGradient = isMath
    ? 'from-amber-500 to-orange-600 shadow-amber-500/20 border-amber-400/30'
    : isPhysics
    ? 'from-indigo-600 to-sky-600 shadow-indigo-500/20 border-indigo-400/30'
    : isBio
    ? 'from-emerald-600 to-teal-600 shadow-emerald-500/20 border-emerald-400/30'
    : 'from-cyan-600 to-blue-600 shadow-cyan-500/20 border-cyan-400/30';

  const activeNavBtnClass = isMath
    ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
    : isPhysics
    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
    : isBio
    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
    : 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30';

  const hubPillClass = isMath
    ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
    : isPhysics
    ? 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
    : isBio
    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    : 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';

  const dataBtnClass = isMath
    ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/25'
    : isPhysics
    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 hover:bg-indigo-100 dark:hover:bg-indigo-500/25'
    : isBio
    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
    : 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40 hover:bg-cyan-100 dark:hover:bg-cyan-500/25';

  const topGlintGradient = isMath
    ? 'from-amber-500/0 via-amber-400/80 to-amber-500/0'
    : isPhysics
    ? 'from-indigo-500/0 via-indigo-400/80 to-indigo-500/0'
    : isBio
    ? 'from-emerald-500/0 via-emerald-400/80 to-emerald-500/0'
    : 'from-cyan-500/0 via-cyan-400/80 to-cyan-500/0';

  const STATIC_SUBJECT_COUNTS: Record<Subject, number> = {
    mathematics: 3936,
    physics: 5577,
    chemistry: 3825,
    biology: 3743,
  };

  const resolvedMathCount = mathCount > 0 ? mathCount : STATIC_SUBJECT_COUNTS.mathematics;
  const resolvedPhysCount = physCount > 0 ? physCount : STATIC_SUBJECT_COUNTS.physics;
  const resolvedChemCount = chemCount > 0 ? chemCount : STATIC_SUBJECT_COUNTS.chemistry;
  const resolvedBioCount = bioCount > 0 ? bioCount : STATIC_SUBJECT_COUNTS.biology;

  const subjectList = [
    {
      code: '0580',
      subject: 'mathematics' as Subject,
      label: 'Maths 0580',
      fullLabel: 'Mathematics (0580)',
      count: resolvedMathCount,
      view: (isTestMakerActive ? 'mathematics-test-maker' : 'mathematics-topical') as AppView,
      Icon: Sigma,
      dot: 'bg-amber-500 text-amber-400',
      activeCls: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.5)] border border-amber-500/30',
      mobileActive: 'bg-amber-600 text-white',
    },
    {
      code: '0625',
      subject: 'physics' as Subject,
      label: 'Physics 0625',
      fullLabel: 'Physics (0625)',
      count: resolvedPhysCount,
      view: (isTestMakerActive ? 'physics-test-maker' : 'physics-topical') as AppView,
      Icon: Atom,
      dot: 'bg-indigo-500 text-indigo-400',
      activeCls: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.5)] border border-indigo-500/30',
      mobileActive: 'bg-indigo-600 text-white',
    },
    {
      code: '0620',
      subject: 'chemistry' as Subject,
      label: 'Chemistry 0620',
      fullLabel: 'Chemistry (0620)',
      count: resolvedChemCount,
      view: (isTestMakerActive ? 'chemistry-test-maker' : 'chemistry-topical') as AppView,
      Icon: FlaskConical,
      dot: 'bg-cyan-500 text-cyan-400',
      activeCls: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.5)] border border-cyan-500/30',
      mobileActive: 'bg-cyan-600 text-white',
    },
    {
      code: '0610',
      subject: 'biology' as Subject,
      label: 'Biology 0610',
      fullLabel: 'Biology (0610)',
      count: resolvedBioCount,
      view: (isTestMakerActive ? 'biology-test-maker' : 'biology-topical') as AppView,
      Icon: Dna,
      dot: 'bg-emerald-500 text-emerald-400',
      activeCls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.5)] border border-emerald-500/30',
      mobileActive: 'bg-emerald-600 text-white',
    },
  ];

  const currentSubjectInfo = subjectList.find((s) => s.subject === activeSubject) || subjectList[0];
  const resolvedTotalQuestions = totalQuestions > 0 ? totalQuestions : currentSubjectInfo.count;
  const grandTotalQuestions = resolvedMathCount + resolvedPhysCount + resolvedChemCount + resolvedBioCount;

  return (
    <>
      <header className="surface-glass w-full max-w-full h-14 border-b border-slate-200 dark:border-white/[0.07] px-2.5 sm:px-4 lg:px-6 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 select-none shrink-0 relative z-50 transition-colors">
        {/* Subtle subject-colored top-edge gradient glint */}
        <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${topGlintGradient} pointer-events-none opacity-80`} />

        {/* Brand Logo & Name */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group transition-all min-w-0 shrink-0 active:scale-[0.99]"
          title="Go to Cambridge IGCSE Portal"
        >
          <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-gradient-to-tr ${brandIconGradient} flex items-center justify-center shadow-md border group-hover:scale-105 transition-transform`}>
            {isMath ? (
              <Sigma className="w-4 h-4 text-white" />
            ) : isPhysics ? (
              <Atom className="w-4 h-4 text-white" />
            ) : isBio ? (
              <Dna className="w-4 h-4 text-white" />
            ) : (
              <FlaskConical className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-[13px] sm:text-sm lg:text-base font-bold tracking-tight truncate whitespace-nowrap text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                Cambridge IGCSE
              </span>
              <span className={`hidden sm:inline-flex shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${hubPillClass}`}>
                {currentSubjectInfo.code}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:inline truncate">
              {currentView === 'home'
                ? 'Maths 0580, Physics 0625, Chemistry 0620 & Biology 0610'
                : `${currentSubjectInfo.fullLabel} Topicals & Mock Builder`}
            </span>
          </div>
        </div>

        {/* Center: Desktop & Tablet Navigation, Tools & User Profile (>= 640px) */}
        <div className="hidden sm:flex flex-nowrap items-center gap-1.5 lg:gap-2 mx-auto">
          <nav
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle(activeSubject, 220)}
            className="spotlight-surface flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 dark:bg-[#07090D] dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:text-slate-300 p-1 rounded-xl"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className={`spotlight-surface relative z-10 flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
                currentView === 'home'
                  ? 'bg-amber-600 text-white shadow-[0_2px_10px_rgba(245,158,11,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.06]'
              }`}
            >
              <Home className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">Portal</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(topicalView)}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className={`spotlight-surface relative z-10 flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
                isTopicalActive
                  ? `${activeNavBtnClass} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.06]'
              }`}
            >
              <Compass className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">Topicals</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(testMakerView)}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className={`spotlight-surface relative z-10 flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
                isTestMakerActive
                  ? `${activeNavBtnClass} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.06]'
              }`}
            >
              <FileText className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">Test Maker</span>
              {cartCount > 0 && (
                <span className="relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-bold bg-amber-400 text-dark-950 animate-pulse-subtle">
                  {cartCount}
                </span>
              )}
            </button>
          </nav>

          {/* Global Command Palette Trigger (Ctrl+K / Cmd+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={getSubjectSpotlightStyle(activeSubject, 180)}
              title="Open Command Palette (Ctrl+K / Cmd+K)"
              className="spotlight-surface flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#07090D] dark:hover:bg-[#0C0F17] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-xs font-medium transition-all duration-150 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              <Search className="relative z-10 w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              <span className="relative z-10 hidden lg:inline text-slate-500 dark:text-slate-400">Jump...</span>
              <kbd className="relative z-10 hidden lg:inline-block kbd-keycap">Ctrl K</kbd>
            </button>
          )}

          {/* Official Cambridge Formula Sheet & Drawer Trigger */}
          {onOpenDataBooklet && (
            <button
              type="button"
              onClick={onOpenDataBooklet}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={getSubjectSpotlightStyle(activeSubject, 180)}
              title="Official Cambridge Formulae & Tables (Press 'D')"
              className={`spotlight-surface flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ${dataBtnClass}`}
            >
              <BookOpen className={`relative z-10 w-3.5 h-3.5 ${isMath ? 'text-amber-600 dark:text-amber-400' : isPhysics ? 'text-indigo-600 dark:text-indigo-400' : isBio ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`} />
              <span className="relative z-10 hidden lg:inline">Formulae</span>
              <span className="relative z-10 hidden lg:inline-block kbd-keycap">D</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 transition-all duration-150 active:scale-95 shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Authentication Button / User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs transition-all active:scale-95 shadow-sm"
                  title={`Logged in as ${user.email}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {userInitial}
                  </div>
                  <span className="max-w-[120px] truncate font-medium text-slate-800 dark:text-slate-200 hidden md:inline">
                    {userDisplayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          {userInitial}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Cloud Sync Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-sm shadow-amber-600/25 active:scale-95 whitespace-nowrap"
                title="Sign in to sync your bookmarks and progress across devices"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Subject Switcher (>= 640px) */}
        <div className="hidden sm:flex items-center relative shrink-0" ref={subjectMenuRef}>
          <button
            type="button"
            onClick={() => setIsSubjectMenuOpen((o) => !o)}
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle(activeSubject, 200)}
            className="spotlight-surface flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#07090D] dark:hover:bg-[#0C0F17] border border-slate-200 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] text-xs font-medium transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
            title="Switch subject"
            aria-haspopup="menu"
            aria-expanded={isSubjectMenuOpen}
          >
            <span className={`relative z-10 w-2 h-2 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_currentColor] ${
              currentView === 'home'
                ? 'text-amber-400 bg-amber-500'
                : isMath
                ? 'text-amber-400 bg-amber-500'
                : isPhysics
                ? 'text-indigo-400 bg-indigo-500'
                : isBio
                ? 'text-emerald-400 bg-emerald-500'
                : 'text-cyan-400 bg-cyan-500'
            }`}></span>
            <span className="relative z-10 text-slate-800 dark:text-slate-200 font-semibold">
              {currentView === 'home' ? 'All Subjects' : currentSubjectInfo.label}
            </span>
            <span className="relative z-10 font-mono tabular-nums text-slate-500 hidden lg:inline">
              ({(currentView === 'home' ? grandTotalQuestions : resolvedTotalQuestions).toLocaleString()} Qs)
            </span>
            <ChevronDown className={`relative z-10 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isSubjectMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSubjectMenuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl surface-glass shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.08)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {subjectList.map(({ code, subject, fullLabel, count, view, Icon, dot, activeCls }) => {
                const isActive = currentView !== 'home' && activeSubject === subject;
                return (
                  <button
                    key={code}
                    type="button"
                    role="menuitem"
                    onPointerMove={handleSpotlightMove}
                    onPointerLeave={handleSpotlightLeave}
                    style={getSubjectSpotlightStyle(subject, 220)}
                    onClick={() => {
                      setIsSubjectMenuOpen(false);
                      onNavigate(view);
                    }}
                    className={`spotlight-surface w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                      isActive
                        ? activeCls
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dot} shadow-[0_0_6px_currentColor]`}></span>
                      <Icon className="w-3.5 h-3.5" />
                      {fullLabel}
                    </span>
                    <span className="relative z-10 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                      {count.toLocaleString()} Qs
                    </span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-slate-100 dark:border-white/[0.07]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsSubjectMenuOpen(false);
                  onNavigate('home');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-150 active:scale-[0.98]"
              >
                <Home className="w-3.5 h-3.5" />
                Cambridge Portal Overview
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Action Controls (< 640px) - Strictly single-row compact h-9 w-9 buttons */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {/* Mobile Auth Button & Bounded Dropdown */}
          {user ? (
            <div className="relative" ref={mobileUserMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="w-9 h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xs shadow-sm active:scale-95"
                title={`Logged in as ${user.email}`}
              >
                {userInitial}
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {userInitial}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Cloud Sync Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              aria-label="Sign In"
              title="Sign In"
              className="w-9 h-9 p-0 shrink-0 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 text-white active:scale-95 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Mobile Command Palette Search Button */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open Command Palette"
              title="Open Command Palette (Ctrl+K)"
              className="w-9 h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-sm"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="w-9 h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Sheet (< 640px) - Anchored cleanly below single-row h-14 header */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-x-0 top-14 bottom-0 z-50 bg-black/75 dark:bg-black/80 backdrop-blur-md sm:hidden flex flex-col justify-start overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/10 p-4 space-y-2.5 shadow-2xl animate-in slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Account Card in Mobile Drawer */}
            {user ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-dark-750 bg-slate-50 dark:bg-dark-850 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {userInitial}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Cloud Sync Active
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="p-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all shadow-md shadow-amber-600/30"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}

            {/* Subject Switcher Row for Mobile (4 Cambridge Subjects) */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-750 bg-slate-50 dark:bg-dark-850">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                Select Cambridge Subject
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {subjectList.map(({ code, subject, label, count, view, Icon, mobileActive }) => {
                  const isActive = currentView !== 'home' && activeSubject === subject;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate(view);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all border ${
                        isActive
                          ? `${mobileActive} border-transparent shadow-sm`
                          : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{label}</span>
                      <span className="text-[9px] font-mono opacity-75">{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Portal Dashboard</span>
                <span className="text-[11px] opacity-75 font-normal">Syllabus overview & multi-subject navigation</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick(topicalView)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                isTopicalActive
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
              }`}
            >
              <Compass className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Topical Explorer</span>
                <span className="text-[11px] opacity-75 font-normal">
                  {currentSubjectInfo.fullLabel} past paper questions & mark schemes
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick(testMakerView)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                isTestMakerActive
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-5 h-5" />
                <div className="flex flex-col">
                  <span>Mock Exam Builder</span>
                  <span className="text-[11px] opacity-75 font-normal">Custom mock exams & worksheet builder</span>
                </div>
              </div>
              {cartCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400 text-dark-950">
                  {cartCount} added
                </span>
              )}
            </button>

            {/* Official Formula Sheet in Mobile Drawer */}
            {onOpenDataBooklet && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenDataBooklet();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 text-sm font-semibold transition-all"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex flex-col text-left">
                    <span>Formulae &amp; Tables</span>
                    <span className="text-[11px] opacity-75 font-normal">Official Cambridge formula sheet</span>
                  </div>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 font-bold border border-amber-500/30">
                  D
                </span>
              </button>
            )}

            {/* Theme Toggle in Mobile Drawer */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-dark-750 bg-slate-50 dark:bg-dark-850 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 text-sm font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700" />
                )}
                <div className="flex flex-col text-left">
                  <span>Day / Night Theme</span>
                  <span className="text-[11px] opacity-75 font-normal">Switch to {theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 dark:bg-dark-750 text-slate-800 dark:text-slate-200">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>

            {/* Subject Footer Details */}
            <div className="pt-3 mt-1 border-t border-slate-200 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  isMath ? 'bg-amber-500 dark:bg-amber-400' :
                  isPhysics ? 'bg-indigo-500 dark:bg-indigo-400' :
                  isBio ? 'bg-emerald-500 dark:bg-emerald-400' :
                  'bg-cyan-500 dark:bg-cyan-400'
                }`}></span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentSubjectInfo.fullLabel}
                </span>
              </div>
              <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                {resolvedTotalQuestions.toLocaleString()} Questions
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppNavbar;
