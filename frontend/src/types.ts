export type SubjectCode = '0580' | '0625' | '0620' | '0610';

export type Subject = 'mathematics' | 'physics' | 'chemistry' | 'biology';

export type Tier = 'core' | 'extended' | 'practical';

export type PaperComponent = 'paper1' | 'paper2' | 'paper3' | 'paper4' | 'paper5' | 'paper6';

export type ExamSeries = 'm' | 's' | 'w'; // m = Feb/March India, s = May/June, w = Oct/Nov

export type SyllabusEra = '2025-2027' | '2025-2028' | '2019-2024' | '2020-2024' | 'all';

export interface SubjectConfig {
  code: SubjectCode;
  slug: Subject;
  label: string;
  shortName: string;
  displayName: string;
  accentColor: string;
  accentRgb: string;
  availableComponents: PaperComponent[];
  componentLabels: Partial<Record<PaperComponent, string>>;
}

export const SUBJECT_CONFIGS: Record<SubjectCode, SubjectConfig> = {
  '0580': {
    code: '0580',
    slug: 'mathematics',
    label: 'Maths 0580',
    shortName: 'Mathematics',
    displayName: 'Cambridge IGCSE Mathematics (0580)',
    accentColor: '#F59E0B',
    accentRgb: '245, 158, 11',
    availableComponents: ['paper1', 'paper2', 'paper3', 'paper4'],
    componentLabels: {
      paper1: 'Paper 1 (Core Non-Calc)',
      paper2: 'Paper 2 (Extended Non-Calc / Short)',
      paper3: 'Paper 3 (Core Calc)',
      paper4: 'Paper 4 (Extended Calc)',
    },
  },
  '0625': {
    code: '0625',
    slug: 'physics',
    label: 'Physics 0625',
    shortName: 'Physics',
    displayName: 'Cambridge IGCSE Physics (0625)',
    accentColor: '#6366F1',
    accentRgb: '99, 102, 241',
    availableComponents: ['paper1', 'paper2', 'paper3', 'paper4', 'paper6'],
    componentLabels: {
      paper1: 'Paper 1 (Core MCQ)',
      paper2: 'Paper 2 (Extended MCQ)',
      paper3: 'Paper 3 (Core Theory)',
      paper4: 'Paper 4 (Extended Theory)',
      paper6: 'Paper 6 (Alternative to Practical)',
    },
  },
  '0620': {
    code: '0620',
    slug: 'chemistry',
    label: 'Chemistry 0620',
    shortName: 'Chemistry',
    displayName: 'Cambridge IGCSE Chemistry (0620)',
    accentColor: '#06B6D4',
    accentRgb: '6, 182, 212',
    availableComponents: ['paper1', 'paper2', 'paper3', 'paper4', 'paper6'],
    componentLabels: {
      paper1: 'Paper 1 (Core MCQ)',
      paper2: 'Paper 2 (Extended MCQ)',
      paper3: 'Paper 3 (Core Theory)',
      paper4: 'Paper 4 (Extended Theory)',
      paper6: 'Paper 6 (Alternative to Practical)',
    },
  },
  '0610': {
    code: '0610',
    slug: 'biology',
    label: 'Biology 0610',
    shortName: 'Biology',
    displayName: 'Cambridge IGCSE Biology (0610)',
    accentColor: '#10B981',
    accentRgb: '16, 185, 129',
    availableComponents: ['paper1', 'paper2', 'paper3', 'paper4', 'paper6'],
    componentLabels: {
      paper1: 'Paper 1 (Core MCQ)',
      paper2: 'Paper 2 (Extended MCQ)',
      paper3: 'Paper 3 (Core Theory)',
      paper4: 'Paper 4 (Extended Theory)',
      paper6: 'Paper 6 (Alternative to Practical)',
    },
  },
};

export const EXAM_SERIES_LABELS: Record<ExamSeries, string> = {
  m: 'Feb/March (m)',
  s: 'May/June (s)',
  w: 'Oct/Nov (w)',
};

export function subjectSlugToCode(subject: Subject | SubjectCode | string): SubjectCode {
  const normalized = (subject || '').toLowerCase().trim();
  if (normalized === '0580' || normalized.startsWith('math')) return '0580';
  if (normalized === '0625' || normalized.startsWith('phys')) return '0625';
  if (normalized === '0610' || normalized.startsWith('bio')) return '0610';
  return '0620';
}

export function subjectCodeToSlug(code: SubjectCode | Subject | string): Subject {
  const normalized = (code || '').toLowerCase().trim();
  if (normalized === '0580' || normalized.startsWith('math')) return 'mathematics';
  if (normalized === '0625' || normalized.startsWith('phys')) return 'physics';
  if (normalized === '0610' || normalized.startsWith('bio')) return 'biology';
  return 'chemistry';
}

export interface Question {
  id: string; // e.g. 0580_s25_qp_22_q04, 0625_w24_qp_41_q02
  subject: SubjectCode;
  year: number;
  series: ExamSeries;
  paper: number; // 1 to 6
  variant: number; // 1 to 3
  tier: Tier;
  syllabus_era: '2025-2028' | '2020-2024';
  calculator_allowed: boolean; // false for 0580 P1 & P2 in 2025+; true for P3 & P4
  question_number: number;
  subpart?: string;
  parent_question?: string;
  total_marks: number;
  topic: string;
  subtopic: string;
  subtopics?: string[]; // Array of 1 to 3 applicable syllabus subtopics
  question_image_url: string;
  mark_scheme_image_url: string;
  is_mcq: boolean;
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  obsolete?: boolean; // For pre-2023 deprecated science topics / pre-2020 math
  obsolete_reason?: string | null; // Reason why question is obsolete under Cambridge syllabus revisions
}

/**
 * Unified QuestionItem supporting both the canonical Cambridge IGCSE `Question` schema
 * and UI/workspace properties used by the viewer, list, and PDF exporter.
 */
export interface QuestionItem extends Partial<Omit<Question, 'series' | 'correct_answer' | 'obsolete_reason'>> {
  id: string;
  paperId: string;
  paper_id?: string;
  unit: string;
  unitCode: string;
  paperCode?: string;
  paper_code?: string;
  year: number;
  session?: string;
  series: ExamSeries | string;
  questionNumber: string;
  number?: string | number;
  q_num?: string | number;
  parentQuestion: string;
  subPart: string;
  marks: number;
  calculator?: boolean;
  topic: string;
  subtopic: string;
  subtopics?: string[];
  section?: string;
  question_type?: 'mcq' | 'theory';
  questionType?: 'mcq' | 'theory';
  hasStem: boolean;
  stemSummary: string | null;
  parent_question_id?: string;
  all_subparts?: string[];
  questionImagePath: string;
  markSchemeImagePath: string | null;
  question_image?: string;
  image?: string;
  image_url?: string;
  crop_path?: string;
  image_path?: string;
  mark_scheme_image?: string;
  ms_image?: string;
  ms_image_url?: string;
  ms_crop_path?: string;
  ms_image_path?: string;
  mark_scheme_image_path?: string;
  answer?: string;
  key?: string;
  correctAnswer?: string;
  correct_answer?: 'A' | 'B' | 'C' | 'D' | string;
  obsolete?: boolean;
  obsolete_reason?: string | null;
}

export type ViewMode = 'split' | 'question-only' | 'ms-only';

export type MasteryStatus = 'unattempted' | 'review' | 'mastered' | 'correct' | 'incorrect';

export interface UserProgressRecord {
  user_id: string;
  question_id: string;
  status: string;
  is_bookmarked: boolean;
  user_answer: string | null;
  updated_at: string;
}

export type StatusFilter = 'all' | 'review' | 'unattempted' | 'mastered';

export type QuestionTypeFilter = 'all' | 'mcq' | 'theory';

export interface FilterState {
  // Canonical Cambridge IGCSE filter state
  subject?: SubjectCode;
  syllabusEra?: SyllabusEra; // for 0580 toggle ('2025-2028' | '2020-2024' | 'all')
  tier?: Tier | 'all';
  selectedTier?: Tier | 'all';
  variant?: 'all' | 1 | 2 | 3;
  components?: PaperComponent[]; // Paper 1-6
  selectedComponents?: number[]; // [1, 2, 3, 4, 5, 6]
  topics?: string[];
  subtopics?: string[];
  years?: number[];
  series?: ExamSeries[] | string;
  minMarks?: number | null;
  maxMarks?: number | null;
  searchQuery: string;
  hideObsolete?: boolean; // For science pre-2023 questions

  // Interactive workspace filter controls
  selectedUnits: string[];     // Checked paper components / units; empty means all
  selectedSubtopics: string[]; // Checked subtopics; empty means all
  selectedYears: string[];     // Checked years; empty means all
  selectedSeries: string[];    // Checked series; empty means all
  statusFilter: StatusFilter;
  questionType: QuestionTypeFilter;
  bookmarkedOnly: boolean;
  unit?: string;
  year?: string;
}

export interface MockExamPreset {
  id: string;
  subject: SubjectCode | 'sciences';
  syllabusEra?: SyllabusEra;
  component: PaperComponent;
  tier: Tier;
  label: string;
  shortLabel: string;
  description: string;
  durationMinutes: number;
  durationLabel: string;
  targetMarks: number;
  minMarks?: number;
  maxMarks?: number;
  questionCount?: number;
  isMcqOnly: boolean;
  calculatorAllowed: boolean;
}

export const MOCK_EXAM_PRESETS: MockExamPreset[] = [
  // 0580 Maths (2025-2028)
  {
    id: '0580_2025_p1_non_calc',
    subject: '0580',
    syllabusEra: '2025-2028',
    component: 'paper1',
    tier: 'core',
    label: 'Paper 1 Non-Calculator (Core)',
    shortLabel: 'Paper 1 Non-Calc',
    description: '2025–2028 Syllabus • Core Non-Calculator structured paper (1h 30m, 80 marks)',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    minMarks: 80,
    maxMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: false,
  },
  {
    id: '0580_2025_p2_non_calc',
    subject: '0580',
    syllabusEra: '2025-2028',
    component: 'paper2',
    tier: 'extended',
    label: 'Paper 2 Non-Calculator (Extended)',
    shortLabel: 'Paper 2 Non-Calc',
    description: '2025–2028 Syllabus • Extended Non-Calculator structured paper (2h, 100 marks)',
    durationMinutes: 120,
    durationLabel: '2h',
    targetMarks: 100,
    minMarks: 100,
    maxMarks: 100,
    isMcqOnly: false,
    calculatorAllowed: false,
  },
  {
    id: '0580_2025_p3_calc',
    subject: '0580',
    syllabusEra: '2025-2028',
    component: 'paper3',
    tier: 'core',
    label: 'Paper 3 Calculator (Core)',
    shortLabel: 'Paper 3 Calc',
    description: '2025–2028 Syllabus • Core Calculator structured paper (1h 30m, 80 marks)',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    minMarks: 80,
    maxMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: '0580_2025_p4_calc',
    subject: '0580',
    syllabusEra: '2025-2028',
    component: 'paper4',
    tier: 'extended',
    label: 'Paper 4 Calculator (Extended)',
    shortLabel: 'Paper 4 Calc',
    description: '2025–2028 Syllabus • Extended Calculator structured paper (2h, 100 marks)',
    durationMinutes: 120,
    durationLabel: '2h',
    targetMarks: 100,
    minMarks: 100,
    maxMarks: 100,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  // 0580 Maths Old Syllabus (2019-2024)
  {
    id: '0580_2019_p1_core',
    subject: '0580',
    syllabusEra: '2019-2024',
    component: 'paper1',
    tier: 'core',
    label: 'Paper 1 Core (2019–2024)',
    shortLabel: 'Paper 1 Core (56m)',
    description: '2019–2024 Syllabus • Core Calculator short-answer paper (1h, 56 marks)',
    durationMinutes: 60,
    durationLabel: '1h',
    targetMarks: 56,
    minMarks: 56,
    maxMarks: 56,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: '0580_2019_p2_extended',
    subject: '0580',
    syllabusEra: '2019-2024',
    component: 'paper2',
    tier: 'extended',
    label: 'Paper 2 Extended (2019–2024)',
    shortLabel: 'Paper 2 Ext (70m)',
    description: '2019–2024 Syllabus • Extended Calculator short-answer paper (1h 30m, 70 marks)',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 70,
    minMarks: 70,
    maxMarks: 70,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: '0580_2019_p3_core',
    subject: '0580',
    syllabusEra: '2019-2024',
    component: 'paper3',
    tier: 'core',
    label: 'Paper 3 Core (2019–2024)',
    shortLabel: 'Paper 3 Core (104m)',
    description: '2019–2024 Syllabus • Core structured Calculator paper (2h, 104 marks)',
    durationMinutes: 120,
    durationLabel: '2h',
    targetMarks: 104,
    minMarks: 104,
    maxMarks: 104,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: '0580_2019_p4_extended',
    subject: '0580',
    syllabusEra: '2019-2024',
    component: 'paper4',
    tier: 'extended',
    label: 'Paper 4 Extended (2019–2024)',
    shortLabel: 'Paper 4 Ext (130m)',
    description: '2019–2024 Syllabus • Extended structured Calculator paper (2h 30m, 130 marks)',
    durationMinutes: 150,
    durationLabel: '2h 30m',
    targetMarks: 130,
    minMarks: 130,
    maxMarks: 130,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  // 0625 / 0620 / 0610 Sciences — Paper 1/2 Multiple Choice
  {
    id: 'science_p1_mcq_core',
    subject: 'sciences',
    syllabusEra: 'all',
    component: 'paper1',
    tier: 'core',
    label: 'Paper 1: Multiple Choice (Core)',
    shortLabel: 'Paper 1 MCQ',
    description: 'Core Multiple Choice paper • 40 four-option MCQs (45m, 40 marks)',
    durationMinutes: 45,
    durationLabel: '45m',
    targetMarks: 40,
    questionCount: 40,
    isMcqOnly: true,
    calculatorAllowed: true,
  },
  {
    id: 'science_p2_mcq_extended',
    subject: 'sciences',
    syllabusEra: 'all',
    component: 'paper2',
    tier: 'extended',
    label: 'Paper 2: Multiple Choice (Extended)',
    shortLabel: 'Paper 2 MCQ',
    description: 'Extended Multiple Choice paper • 40 four-option MCQs (45m, 40 marks)',
    durationMinutes: 45,
    durationLabel: '45m',
    targetMarks: 40,
    questionCount: 40,
    isMcqOnly: true,
    calculatorAllowed: true,
  },
  // 0625 / 0620 / 0610 Sciences — Paper 3/4 Theory
  {
    id: 'science_p3_theory_core',
    subject: 'sciences',
    syllabusEra: 'all',
    component: 'paper3',
    tier: 'core',
    label: 'Paper 3: Theory (Core)',
    shortLabel: 'Paper 3 Theory',
    description: 'Core Theory structured paper (1h 15m, 80 marks)',
    durationMinutes: 75,
    durationLabel: '1h 15m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'science_p4_theory_extended',
    subject: 'sciences',
    syllabusEra: 'all',
    component: 'paper4',
    tier: 'extended',
    label: 'Paper 4: Theory (Extended)',
    shortLabel: 'Paper 4 Theory',
    description: 'Extended Theory structured paper (1h 15m, 80 marks)',
    durationMinutes: 75,
    durationLabel: '1h 15m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  // 0625 / 0620 / 0610 Sciences — Paper 6 Alternative to Practical
  {
    id: 'science_p6_atp',
    subject: 'sciences',
    syllabusEra: 'all',
    component: 'paper6',
    tier: 'practical',
    label: 'Paper 6: Alternative to Practical',
    shortLabel: 'Paper 6 ATP',
    description: 'Written practical & experimental skills paper (1h, 40 marks)',
    durationMinutes: 60,
    durationLabel: '1h',
    targetMarks: 40,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
];

export function getPresetsForSubject(
  subject: SubjectCode,
  syllabusEra: SyllabusEra = 'all'
): MockExamPreset[] {
  if (subject === '0580') {
    return MOCK_EXAM_PRESETS.filter((p) => {
      if (p.subject !== '0580') return false;
      if (syllabusEra === 'all' || p.syllabusEra === 'all') return true;
      if ((syllabusEra === '2025-2027' || syllabusEra === '2025-2028') && (p.syllabusEra === '2025-2027' || p.syllabusEra === '2025-2028')) return true;
      if ((syllabusEra === '2019-2024' || syllabusEra === '2020-2024') && (p.syllabusEra === '2019-2024' || p.syllabusEra === '2020-2024')) return true;
      return p.syllabusEra === syllabusEra;
    });
  }
  return MOCK_EXAM_PRESETS.filter((p) => p.subject === 'sciences' || p.subject === subject);
}

export type AppView =
  | 'home'
  | 'chemistry-topical'
  | 'chemistry-test-maker'
  | 'physics-topical'
  | 'physics-test-maker'
  | 'mathematics-topical'
  | 'mathematics-test-maker'
  | 'biology-topical'
  | 'biology-test-maker';

export interface TestPaperConfig {
  title: string;
  questionIds: string[];
}
