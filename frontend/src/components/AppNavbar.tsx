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
  Search,
  ArrowLeft,
} from 'lucide-react';
import { AppView, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  CANONICAL_SUBJECT_THEMES,
  getCanonicalSubjectTheme,
  getStudyHubUrl,
} from '../utils/subjectTheme';

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

  const resolvedSubject: Subject = isMath
    ? 'mathematics'
    : isPhysics
    ? 'physics'
    : isBio
    ? 'biology'
    : 'chemistry';

  const activeSubjectTheme = getCanonicalSubjectTheme(resolvedSubject);
  const studyHubUrl = getStudyHubUrl(currentView, resolvedSubject);
  const studyHubLabel =
    currentView === 'home'
      ? 'O-Level Hub'
      : `${activeSubjectTheme.name} (${activeSubjectTheme.code})`;

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
      code: '0580' as const,
      subject: 'mathematics' as Subject,
      label: 'Maths 0580',
      fullLabel: 'Mathematics (0580)',
      count: resolvedMathCount,
      view: (isTestMakerActive ? 'mathematics-test-maker' : 'mathematics-topical') as AppView,
      Icon: Sigma,
      theme: CANONICAL_SUBJECT_THEMES.mathematics,
    },
    {
      code: '0625' as const,
      subject: 'physics' as Subject,
      label: 'Physics 0625',
      fullLabel: 'Physics (0625)',
      count: resolvedPhysCount,
      view: (isTestMakerActive ? 'physics-test-maker' : 'physics-topical') as AppView,
      Icon: Atom,
      theme: CANONICAL_SUBJECT_THEMES.physics,
    },
    {
      code: '0620' as const,
      subject: 'chemistry' as Subject,
      label: 'Chemistry 0620',
      fullLabel: 'Chemistry (0620)',
      count: resolvedChemCount,
      view: (isTestMakerActive ? 'chemistry-test-maker' : 'chemistry-topical') as AppView,
      Icon: FlaskConical,
      theme: CANONICAL_SUBJECT_THEMES.chemistry,
    },
    {
      code: '0610' as const,
      subject: 'biology' as Subject,
      label: 'Biology 0610',
      fullLabel: 'Biology (0610)',
      count: resolvedBioCount,
      view: (isTestMakerActive ? 'biology-test-maker' : 'biology-topical') as AppView,
      Icon: Dna,
      theme: CANONICAL_SUBJECT_THEMES.biology,
    },
  ];

  const currentSubjectInfo = subjectList.find((s) => s.subject === activeSubject) || subjectList[0];
  const resolvedTotalQuestions = totalQuestions > 0 ? totalQuestions : currentSubjectInfo.count;
  const grandTotalQuestions = resolvedMathCount + resolvedPhysCount + resolvedChemCount + resolvedBioCount;

  const activeRuleColor = currentView === 'home' ? 'var(--ink-primary)' : 'var(--subject-accent)';

  return (
    <>
      <header className="w-full max-w-full h-14 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-2.5 sm:px-4 lg:px-4 xl:px-5 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2.5 select-none shrink-0 relative z-50 transition-colors">
        {/* Crisp 2px solid top accent rule inside a subject view */}
        {currentView !== 'home' && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{ backgroundColor: 'var(--subject-accent)' }}
          />
        )}

        {/* Left Wing: <- Study Hub Bridge + Divider + Wordmark */}
        <div className="flex items-center justify-start min-w-0 lg:shrink-0 gap-1.5 sm:gap-2.5">
          <a
            href={studyHubUrl}
            title={`Return to Study Hub (${studyHubLabel})`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Study Hub</span>
          </a>

          <span
            aria-hidden="true"
            className="h-4 w-px bg-[var(--border-hairline)] shrink-0"
          />

          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group min-w-0 shrink-0 text-left focus-visible:outline-none"
            title="Go to Cambridge IGCSE Portal"
          >
            <span className="font-editorial text-[14px] sm:text-[17px] lg:text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink-primary)] shrink-0 whitespace-nowrap">
              Cambridge IGCSE
            </span>
            {currentView !== 'home' && (
              <span
                className={`hidden min-[460px]:inline-flex shrink-0 text-[10px] font-mono tabular-nums font-semibold tracking-wider px-1.5 py-0.5 rounded border ${activeSubjectTheme.badgeClass}`}
              >
                {currentSubjectInfo.code}
              </span>
            )}
          </button>
        </div>

        {/* Center Group: Desktop Navigation Tabs + Compact Utility Actions (>= 1024px) */}
        <div className="hidden lg:flex h-full shrink-0 flex-nowrap items-center justify-center gap-1.5 xl:gap-2.5">
          <nav
            aria-label="Primary Workspace Navigation"
            className="flex items-center h-full gap-0.5 xl:gap-1.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-current={currentView === 'home' ? 'page' : undefined}
              className={`relative h-full inline-flex items-center gap-1.5 px-2 xl:px-2.5 text-[13px] transition-colors whitespace-nowrap ${
                currentView === 'home'
                  ? 'font-semibold text-[var(--ink-primary)]'
                  : 'font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Portal</span>
              {currentView === 'home' && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 bottom-0 h-[2.5px]"
                  style={{ backgroundColor: activeRuleColor }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate(topicalView)}
              aria-current={isTopicalActive ? 'page' : undefined}
              className={`relative h-full inline-flex items-center gap-1.5 px-2 xl:px-2.5 text-[13px] transition-colors whitespace-nowrap ${
                isTopicalActive
                  ? 'font-semibold text-[var(--ink-primary)]'
                  : 'font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Topicals</span>
              {isTopicalActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 bottom-0 h-[2.5px]"
                  style={{ backgroundColor: activeRuleColor }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate(testMakerView)}
              aria-current={isTestMakerActive ? 'page' : undefined}
              className={`relative h-full inline-flex items-center gap-1.5 px-2 xl:px-2.5 text-[13px] transition-colors whitespace-nowrap ${
                isTestMakerActive
                  ? 'font-semibold text-[var(--ink-primary)]'
                  : 'font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Test Maker</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]">
                  {cartCount}
                </span>
              )}
              {isTestMakerActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 bottom-0 h-[2.5px]"
                  style={{ backgroundColor: activeRuleColor }}
                />
              )}
            </button>
          </nav>

          <span aria-hidden="true" className="h-4 w-px bg-[var(--border-hairline)] shrink-0" />

          {/* Global Command Palette Trigger (Ctrl+K / Cmd+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Open Command Palette (Ctrl+K / Cmd+K)"
              className="shrink-0 whitespace-nowrap flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] text-xs font-medium transition-colors"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
              <span className="hidden xl:inline text-[var(--ink-muted)] whitespace-nowrap">Jump</span>
              <kbd className="kbd-keycap">Ctrl K</kbd>
            </button>
          )}

          {/* Official Cambridge Formula Sheet & Drawer Trigger */}
          {onOpenDataBooklet && (
            <button
              type="button"
              onClick={onOpenDataBooklet}
              title="Official Cambridge Formulae & Tables (D, or Shift+D on MCQs)"
              className="shrink-0 whitespace-nowrap flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-primary)] text-xs font-medium transition-colors"
            >
              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${activeSubjectTheme.textClass}`} />
              <span className="hidden xl:inline whitespace-nowrap">Formulae</span>
              <kbd className="kbd-keycap">D</kbd>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Editorial Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--ink-secondary)]" />
            )}
          </button>

          {/* Authentication Button / User Profile Dropdown */}
          <div className="relative shrink-0" ref={userMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 h-8 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-xs transition-colors shrink-0 whitespace-nowrap"
                  title={`Logged in as ${user.email}`}
                >
                  <div className="w-5 h-5 shrink-0 rounded bg-[var(--action-primary-bg)] flex items-center justify-center text-[var(--action-primary-fg)] font-semibold text-[11px]">
                    {userInitial}
                  </div>
                  <span className="max-w-[120px] truncate font-medium text-[var(--ink-primary)] hidden 2xl:inline">
                    {userDisplayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-2 z-50"
                    style={{ boxShadow: 'var(--shadow-popover)' }}
                  >
                    <div className="p-2.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)] mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-[var(--action-primary-bg)] flex items-center justify-center text-[var(--action-primary-fg)] font-semibold text-sm shrink-0">
                          {userInitial}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
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
                      className="w-full flex items-center gap-2 p-2 rounded-md text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] font-semibold text-xs transition-colors whitespace-nowrap"
                title="Sign in to sync your bookmarks and progress across devices"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Wing: Subject Switcher (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-end shrink-0">
          <div className="relative shrink-0" ref={subjectMenuRef}>
            <button
              type="button"
              onClick={() => setIsSubjectMenuOpen((o) => !o)}
              className="shrink-0 whitespace-nowrap flex items-center gap-2 h-8 px-2.5 lg:px-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-xs font-medium transition-colors"
              title="Switch subject"
              aria-haspopup="menu"
              aria-expanded={isSubjectMenuOpen}
            >
              <span
                className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${
                  currentView === 'home' ? 'bg-[var(--ink-primary)]' : activeSubjectTheme.swatchClass
                }`}
              />
              <span className="text-[var(--ink-primary)] font-semibold whitespace-nowrap">
                {currentView === 'home' ? 'All Subjects' : currentSubjectInfo.label}
              </span>
              <span className="font-mono tabular-nums text-[var(--ink-muted)] hidden 2xl:inline whitespace-nowrap">
                ({(currentView === 'home' ? grandTotalQuestions : resolvedTotalQuestions).toLocaleString()} Qs)
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)] transition-transform ${
                  isSubjectMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSubjectMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-1.5 z-50"
                style={{ boxShadow: 'var(--shadow-popover)' }}
              >
                {subjectList.map(({ code, subject, fullLabel, count, view, Icon, theme: sTheme }) => {
                  const isActive = currentView !== 'home' && activeSubject === subject;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsSubjectMenuOpen(false);
                        onNavigate(view);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                        isActive
                          ? `${sTheme.badgeClass} border`
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${sTheme.swatchClass}`} />
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{fullLabel}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-[var(--ink-muted)]">
                        {count.toLocaleString()} Qs
                      </span>
                    </button>
                  );
                })}
                <div className="my-1 border-t border-[var(--border-hairline)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsSubjectMenuOpen(false);
                    onNavigate('home');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Cambridge Portal Overview</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile & Tablet Action Controls (< 1024px) */}
        <div className="flex lg:hidden items-center gap-1 sm:gap-1.5 shrink-0">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open Command Palette"
              title="Open Command Palette (Ctrl+K)"
              className="w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--ink-secondary)]" />
            )}
          </button>

          {user ? (
            <div className="relative" ref={mobileUserMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold text-xs"
                title={`Logged in as ${user.email}`}
              >
                {userInitial}
              </button>
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-2 z-50"
                  style={{ boxShadow: 'var(--shadow-popover)' }}
                >
                  <div className="p-2.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)] mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[var(--action-primary-bg)] flex items-center justify-center text-[var(--action-primary-fg)] font-semibold text-sm shrink-0">
                        {userInitial}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
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
                    className="w-full flex items-center gap-2 p-2 rounded-md text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
              className="w-8 h-8 sm:w-9 sm:h-9 p-0 shrink-0 flex items-center justify-center rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center rounded-lg shrink-0 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-[var(--ink-primary)]" />
            ) : (
              <Menu className="w-4 h-4 text-[var(--ink-secondary)]" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Slide-down Navigation Sheet (< 1024px) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-50 bg-slate-950/50 lg:hidden flex flex-col justify-start overflow-y-auto"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] p-4 space-y-2.5"
            style={{ boxShadow: 'var(--shadow-popover)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Study Hub Bridge link */}
            <a
              href={studyHubUrl}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 text-[var(--ink-muted)]" />
                <span>Back to Study Hub</span>
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">{studyHubLabel}</span>
            </a>

            {/* User Account Card */}
            {user ? (
              <div className="p-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-md bg-[var(--action-primary-bg)] flex items-center justify-center text-[var(--action-primary-fg)] font-semibold text-sm shrink-0">
                    {userInitial}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
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
                  className="p-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}

            {/* Subject Switcher Row for Mobile (4 Cambridge Subjects) */}
            <div className="p-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2 px-1">
                Select Cambridge Subject
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {subjectList.map(({ code, subject, label, count, view, Icon, theme: sTheme }) => {
                  const isActive = currentView !== 'home' && activeSubject === subject;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate(view);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md text-xs font-semibold transition-colors border ${
                        isActive
                          ? `${sTheme.badgeClass}`
                          : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? '' : sTheme.textClass}`} />
                      <span className="text-[11px]">{label}</span>
                      <span className="text-[9px] font-mono tabular-nums opacity-75">{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-semibold transition-colors ${
                currentView === 'home'
                  ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent'
                  : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Home className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Portal Dashboard</span>
                <span className="text-[11px] opacity-75 font-normal">Syllabus overview &amp; multi-subject navigation</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick(topicalView)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-semibold transition-colors ${
                isTopicalActive
                  ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent'
                  : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Compass className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Topical Explorer</span>
                <span className="text-[11px] opacity-75 font-normal">
                  {currentSubjectInfo.fullLabel} past paper questions &amp; mark schemes
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick(testMakerView)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm font-semibold transition-colors ${
                isTestMakerActive
                  ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent'
                  : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-5 h-5" />
                <div className="flex flex-col">
                  <span>Mock Exam Builder</span>
                  <span className="text-[11px] opacity-75 font-normal">Custom mock exams &amp; worksheet builder</span>
                </div>
              </div>
              {cartCount > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-mono tabular-nums font-bold bg-[var(--bg-surface)] text-[var(--ink-primary)] border border-[var(--border-hairline)]">
                  {cartCount} added
                </span>
              )}
            </button>

            {onOpenDataBooklet && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenDataBooklet();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-sm font-semibold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`w-5 h-5 ${activeSubjectTheme.textClass}`} />
                  <div className="flex flex-col text-left">
                    <span>Formulae &amp; Tables</span>
                    <span className="text-[11px] text-[var(--ink-muted)] font-normal">Official Cambridge formula sheet</span>
                  </div>
                </div>
                <kbd className="kbd-keycap">D</kbd>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-[#FBBF24]" />
                ) : (
                  <Moon className="w-5 h-5 text-[var(--ink-secondary)]" />
                )}
                <div className="flex flex-col text-left">
                  <span>Theme Mode</span>
                  <span className="text-[11px] text-[var(--ink-muted)] font-normal">
                    Switch to {theme === 'dark' ? 'Light Editorial mode' : 'Dark mode'}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--ink-secondary)]">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>

            <div className="pt-3 mt-1 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--ink-muted)] px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-[2px] ${activeSubjectTheme.swatchClass}`} />
                <span className="font-semibold text-[var(--ink-primary)]">
                  {currentSubjectInfo.fullLabel}
                </span>
              </div>
              <span className={`font-mono tabular-nums text-[11px] font-semibold ${activeSubjectTheme.textClass}`}>
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
