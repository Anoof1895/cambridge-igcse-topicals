import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Subject, SubjectCode, subjectSlugToCode } from '../types';

export type Theme = 'dark' | 'light';

export interface SubjectThemeToken {
  code: SubjectCode;
  name: string;
  accent: string;
  accentRgb: string;
}

export const SUBJECT_THEME_TOKENS: Record<SubjectCode, SubjectThemeToken> = {
  '0580': {
    code: '0580',
    name: 'Mathematics',
    accent: '#F59E0B',
    accentRgb: '245, 158, 11',
  },
  '0625': {
    code: '0625',
    name: 'Physics',
    accent: '#6366F1',
    accentRgb: '99, 102, 241',
  },
  '0620': {
    code: '0620',
    name: 'Chemistry',
    accent: '#06B6D4',
    accentRgb: '6, 182, 212',
  },
  '0610': {
    code: '0610',
    name: 'Biology',
    accent: '#10B981',
    accentRgb: '16, 185, 129',
  },
};

export function applySubjectThemeVariables(subject: SubjectCode | Subject): SubjectThemeToken {
  const code = subjectSlugToCode(subject);
  const token = SUBJECT_THEME_TOKENS[code] || SUBJECT_THEME_TOKENS['0620'];
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--subject-accent', token.accent);
    root.style.setProperty('--subject-accent-rgb', token.accentRgb);
    root.style.setProperty('--subject-glow-rgb', token.accentRgb);
    root.setAttribute('data-subject', token.code);
  }
  return token;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  subjectCode: SubjectCode;
  subjectTheme: SubjectThemeToken;
  setSubjectTheme: (subject: SubjectCode | Subject) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light') {
        return 'light';
      }
    } catch {
      // ignore
    }
    return 'dark';
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
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    applySubjectThemeVariables(subjectCode);
    try {
      localStorage.setItem('active_subject_code', subjectCode);
    } catch {
      // ignore
    }
  }, [subjectCode]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setSubjectTheme = useCallback((subject: SubjectCode | Subject) => {
    const nextCode = subjectSlugToCode(subject);
    setSubjectCodeState(nextCode);
    applySubjectThemeVariables(nextCode);
  }, []);

  const subjectTheme = SUBJECT_THEME_TOKENS[subjectCode] || SUBJECT_THEME_TOKENS['0620'];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
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
