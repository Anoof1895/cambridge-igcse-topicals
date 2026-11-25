import { AppView, Subject, SubjectCode, subjectSlugToCode } from '../types';

export interface CanonicalSubjectTheme {
  code: SubjectCode;
  slug: Subject;
  name: string;
  label: string;
  accentLight: string;
  accentLightRgb: string;
  accentDark: string;
  accentDarkRgb: string;
  badgeClass: string;
  textClass: string;
  bgSolidClass: string;
  borderTopClass: string;
  borderLeftClass: string;
  selectedCardClass: string;
  swatchClass: string;
  studyHubPath: string;
  badgeColor: 'purple' | 'blue' | 'orange' | 'emerald';
}

export const CANONICAL_SUBJECT_THEMES: Record<Subject, CanonicalSubjectTheme> = {
  mathematics: {
    code: '0580',
    slug: 'mathematics',
    name: 'Mathematics',
    label: 'Maths 0580',
    accentLight: '#7E22CE',
    accentLightRgb: '126, 34, 206',
    accentDark: '#C084FC',
    accentDarkRgb: '192, 132, 252',
    badgeClass:
      'text-[#7E22CE] dark:text-[#C084FC] bg-[#FAF5FF] dark:bg-[rgba(168,85,247,0.16)] border-[#E9D5FF] dark:border-[rgba(192,132,252,0.35)]',
    textClass: 'text-[#7E22CE] dark:text-[#C084FC]',
    bgSolidClass: 'bg-[#7E22CE] dark:bg-[#9333EA]',
    borderTopClass: 'border-t-[#7E22CE] dark:border-t-[#C084FC]',
    borderLeftClass: 'border-l-[#7E22CE] dark:border-l-[#C084FC]',
    selectedCardClass:
      'bg-[#FAF5FF] dark:bg-[rgba(168,85,247,0.14)] border-y-[#E9D5FF] dark:border-y-[#243146] border-r-[#E9D5FF] dark:border-r-[#243146] border-l-[#7E22CE] dark:border-l-[#C084FC]',
    swatchClass: 'bg-[#7E22CE] dark:bg-[#C084FC]',
    studyHubPath: '/0580',
    badgeColor: 'purple',
  },
  physics: {
    code: '0625',
    slug: 'physics',
    name: 'Physics',
    label: 'Physics 0625',
    accentLight: '#1D4ED8',
    accentLightRgb: '29, 78, 216',
    accentDark: '#60A5FA',
    accentDarkRgb: '96, 165, 250',
    badgeClass:
      'text-[#1D4ED8] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[rgba(59,130,246,0.16)] border-[#BFDBFE] dark:border-[rgba(96,165,250,0.35)]',
    textClass: 'text-[#1D4ED8] dark:text-[#60A5FA]',
    bgSolidClass: 'bg-[#1D4ED8] dark:bg-[#2563EB]',
    borderTopClass: 'border-t-[#1D4ED8] dark:border-t-[#60A5FA]',
    borderLeftClass: 'border-l-[#1D4ED8] dark:border-l-[#60A5FA]',
    selectedCardClass:
      'bg-[#EFF6FF] dark:bg-[rgba(59,130,246,0.14)] border-y-[#BFDBFE] dark:border-y-[#243146] border-r-[#BFDBFE] dark:border-r-[#243146] border-l-[#1D4ED8] dark:border-l-[#60A5FA]',
    swatchClass: 'bg-[#1D4ED8] dark:bg-[#60A5FA]',
    studyHubPath: '/0625',
    badgeColor: 'blue',
  },
  chemistry: {
    code: '0620',
    slug: 'chemistry',
    name: 'Chemistry',
    label: 'Chemistry 0620',
    accentLight: '#C2410C',
    accentLightRgb: '194, 65, 12',
    accentDark: '#FB923C',
    accentDarkRgb: '251, 146, 60',
    badgeClass:
      'text-[#C2410C] dark:text-[#FB923C] bg-[#FFF7ED] dark:bg-[rgba(249,115,22,0.16)] border-[#FED7AA] dark:border-[rgba(251,146,60,0.35)]',
    textClass: 'text-[#C2410C] dark:text-[#FB923C]',
    bgSolidClass: 'bg-[#C2410C] dark:bg-[#EA580C]',
    borderTopClass: 'border-t-[#C2410C] dark:border-t-[#FB923C]',
    borderLeftClass: 'border-l-[#C2410C] dark:border-l-[#FB923C]',
    selectedCardClass:
      'bg-[#FFF7ED] dark:bg-[rgba(249,115,22,0.14)] border-y-[#FED7AA] dark:border-y-[#243146] border-r-[#FED7AA] dark:border-r-[#243146] border-l-[#C2410C] dark:border-l-[#FB923C]',
    swatchClass: 'bg-[#C2410C] dark:bg-[#FB923C]',
    studyHubPath: '/0620',
    badgeColor: 'orange',
  },
  biology: {
    code: '0610',
    slug: 'biology',
    name: 'Biology',
    label: 'Biology 0610',
    accentLight: '#15803D',
    accentLightRgb: '21, 128, 61',
    accentDark: '#4ADE80',
    accentDarkRgb: '74, 222, 128',
    badgeClass:
      'text-[#15803D] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[rgba(34,197,94,0.16)] border-[#BBF7D0] dark:border-[rgba(74,222,128,0.35)]',
    textClass: 'text-[#15803D] dark:text-[#4ADE80]',
    bgSolidClass: 'bg-[#15803D] dark:bg-[#16A34A]',
    borderTopClass: 'border-t-[#15803D] dark:border-t-[#4ADE80]',
    borderLeftClass: 'border-l-[#15803D] dark:border-l-[#4ADE80]',
    selectedCardClass:
      'bg-[#F0FDF4] dark:bg-[rgba(34,197,94,0.14)] border-y-[#BBF7D0] dark:border-y-[#243146] border-r-[#BBF7D0] dark:border-r-[#243146] border-l-[#15803D] dark:border-l-[#4ADE80]',
    swatchClass: 'bg-[#15803D] dark:bg-[#4ADE80]',
    studyHubPath: '/0610',
    badgeColor: 'emerald',
  },
};

export function getCanonicalSubjectTheme(subject?: Subject | SubjectCode | string): CanonicalSubjectTheme {
  const code = subjectSlugToCode(subject || 'chemistry');
  if (code === '0580') return CANONICAL_SUBJECT_THEMES.mathematics;
  if (code === '0625') return CANONICAL_SUBJECT_THEMES.physics;
  if (code === '0610') return CANONICAL_SUBJECT_THEMES.biology;
  return CANONICAL_SUBJECT_THEMES.chemistry;
}

export function getStudyHubBaseUrl(): string {
  const raw = import.meta.env.VITE_STUDY_HUB_URL?.trim();
  const fallback = import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'https://igcse-interactive-labs.vercel.app';
  const base = raw && raw.length > 0 ? raw : fallback;
  return base.replace(/\/+$/, '');
}

export function getStudyHubUrl(currentView: AppView, activeSubject: Subject): string {
  const base = getStudyHubBaseUrl();
  if (currentView === 'home') {
    return `${base}/o-level`;
  }
  const theme = getCanonicalSubjectTheme(activeSubject);
  return `${base}${theme.studyHubPath}`;
}
