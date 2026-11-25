import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Subject, SubjectCode, subjectSlugToCode } from '../types';

export type Theme = 'dark' | 'light';

export interface SubjectThemeToken {
  code: SubjectCode;
  name: string;
  accent: string;
  accentRgb: string;
  darkAccent: string;
  darkAccentRgb: string;
  bg: string;
  border: string;
  darkBg: string;
  darkBorder: string;
}

export const SUBJECT_THEME_TOKENS: Record<SubjectCode, SubjectThemeToken> = {
  '0580': {
    code: '0580',
    name: 'Mathematics',
    accent: '#7E22CE',
    accentRgb: '126, 34, 206',
    darkAccent: '#C084FC',
    darkAccentRgb: '192, 132, 252',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    darkBg: 'rgba(168, 85, 247, 0.16)',
    darkBorder: 'rgba(192, 132, 252, 0.35)',
  },
  '0625': {
    code: '0625',
    name: 'Physics',
    accent: '#1D4ED8',
    accentRgb: '29, 78, 216',
    darkAccent: '#60A5FA',
    darkAccentRgb: '96, 165, 250',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    darkBg: 'rgba(59, 130, 246, 0.16)',
    darkBorder: 'rgba(96, 165, 250, 0.35)',
  },
  '0620': {
    code: '0620',
    name: 'Chemistry',
    accent: '#C2410C',
    accentRgb: '194, 65, 12',
    darkAccent: '#FB923C',
    darkAccentRgb: '251, 146, 60',
    bg: '#FFF7ED',
    border: '#FED7AA',
    darkBg: 'rgba(249, 115, 22, 0.16)',
    darkBorder: 'rgba(251, 146, 60, 0.35)',
  },
  '0610': {
    code: '0610',
    name: 'Biology',
    accent: '#15803D',
    accentRgb: '21, 128, 61',
    darkAccent: '#4ADE80',
    darkAccentRgb: '74, 222, 128',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    darkBg: 'rgba(34, 197, 94, 0.16)',
    darkBorder: 'rgba(74, 222, 128, 0.35)',
  },
};

export function applySubjectThemeVariables(
  subject: SubjectCode | Subject,
  themeMode: Theme = 'light'
): SubjectThemeToken {
  const code = subjectSlugToCode(subject);
  const token = SUBJECT_THEME_TOKENS[code] || SUBJECT_THEME_TOKENS['0620'];
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const isDark = themeMode === 'dark' || root.classList.contains('dark');
    root.style.setProperty('--subject-accent', isDark ? token.darkAccent : token.accent);
    root.style.setProperty('--subject-accent-rgb', isDark ? token.darkAccentRgb : token.accentRgb);
    root.style.setProperty('--subject-glow-rgb', isDark ? token.darkAccentRgb : token.accentRgb);
    root.style.setProperty('--subject-bg', isDark ? token.darkBg : token.bg);
    root.style.setProperty('--subject-border', isDark ? token.darkBorder : token.border);
    root.setAttribute('data-subject', token.code);
  }
  return token;
}

const DARK_PAPER_STORAGE_KEY = 'igcse_dark_paper';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  darkPaper: boolean;
  setDarkPaper: (enabled: boolean) => void;
  toggleDarkPaper: () => void;
  isDarkPaperActive: boolean;
  subjectCode: SubjectCode;
  subjectTheme: SubjectThemeToken;
  setSubjectTheme: (subject: SubjectCode | Subject) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const [darkPaper, setDarkPaperState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DARK_PAPER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [subjectCode, setSubjectCodeState] = useState<SubjectCode>(() => {
    try {
      const saved = localStorage.getItem('active_subject_code');
      if (saved === '0580' || saved === '0625' || saved === '0620' || saved === '0610') {
        return saved;
      }
    } catch {
      // ignore
    }
    return '0620';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    }
    applySubjectThemeVariables(subjectCode, theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme, subjectCode]);

  useEffect(() => {
    try {
      localStorage.setItem(DARK_PAPER_STORAGE_KEY, darkPaper ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [darkPaper]);

  useEffect(() => {
    applySubjectThemeVariables(subjectCode, theme);
    try {
      localStorage.setItem('active_subject_code', subjectCode);
    } catch {
      // ignore
    }
  }, [subjectCode, theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setDarkPaper = useCallback((enabled: boolean) => {
    setDarkPaperState(enabled);
  }, []);

  const toggleDarkPaper = useCallback(() => {
    setDarkPaperState((prev) => !prev);
  }, []);

  const setSubjectTheme = useCallback(
    (subject: SubjectCode | Subject) => {
      const nextCode = subjectSlugToCode(subject);
      setSubjectCodeState(nextCode);
      applySubjectThemeVariables(nextCode, theme);
    },
    [theme]
  );

  const subjectTheme = SUBJECT_THEME_TOKENS[subjectCode] || SUBJECT_THEME_TOKENS['0620'];
  const isDarkPaperActive = theme === 'dark' && darkPaper;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        darkPaper,
        setDarkPaper,
        toggleDarkPaper,
        isDarkPaperActive,
        subjectCode,
        subjectTheme,
        setSubjectTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
