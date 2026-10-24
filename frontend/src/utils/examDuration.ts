import { PaperComponent, Subject, SubjectCode } from '../types';

export interface ExamDurationOptions {
  isMcqOnly?: boolean;
  paper?: number;
  paperComponent?: PaperComponent;
  mcqMarks?: number;
  theoryMarks?: number;
  atpMarks?: number;
  syllabusEra?: string;
}

/**
 * Formats a duration in minutes into a clean human-readable string (e.g. "1h 15m", "45m", "2h").
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}

/**
 * Calculates official Cambridge IGCSE examination duration in minutes.
 *
 * Exact Cambridge Pacing Models:
 * - Sciences P1/P2 MCQ: 45 minutes for 40 marks (1.125 min/mark)
 * - Sciences P3/P4 Theory: 75 minutes (1h 15m) for 80 marks (~0.94 min/mark)
 * - Sciences P6 ATP: 60 minutes for 40 marks (1.5 min/mark)
 * - 0580 Maths 2025+ P2/P4: 90m–120m for 75–100 marks (~1.2 min/mark)
 * - 0580 Maths Old P2: 90m (70 marks); Old P4: 150m (130 marks)
 * - Custom tests: dynamically composed from MCQ vs Theory marks.
 */
export function calculateExamDurationMinutes(
  totalMarks: number,
  subjectOrIsMath?: Subject | SubjectCode | string | boolean,
  optionsOrUnits?: ExamDurationOptions | string[]
): number {
  if (totalMarks <= 0) return 0;

  // Normalize subject
  const isMath =
    typeof subjectOrIsMath === 'boolean'
      ? subjectOrIsMath
      : subjectOrIsMath === '0580' ||
        (typeof subjectOrIsMath === 'string' &&
          (subjectOrIsMath.toLowerCase().startsWith('math') || subjectOrIsMath === '0580'));

  const options: ExamDurationOptions = Array.isArray(optionsOrUnits)
    ? {}
    : optionsOrUnits || {};

  // 1. Mathematics (0580)
  if (isMath) {
    // Official benchmark paper durations
    if (totalMarks === 100) return 120; // 2 hours
    if (totalMarks === 70) return 90;   // 1h 30m (Old P2)
    if (totalMarks === 130) return 150; // 2h 30m (Old P4)
    if (totalMarks === 75) return 90;   // 1h 30m (2025+ min Paper 2)
    if (totalMarks === 80) return 90;   // 1h 30m (2025+ Core Paper 1 / Paper 3)
    if (totalMarks === 56) return 60;   // 1h (Old Core P1)
    if (totalMarks === 104) return 120; // 2h (Old Core P3)

    // General Cambridge Maths rate: 1.2 minutes per mark
    return Math.max(15, Math.round(totalMarks * 1.2));
  }

  // 2. Cambridge Sciences (0625 Physics, 0620 Chemistry, 0610 Biology)
  const isMcqOnly =
    options.isMcqOnly ||
    options.paper === 1 ||
    options.paper === 2 ||
    options.paperComponent === 'paper1' ||
    options.paperComponent === 'paper2';

  const isATPOnly =
    options.paper === 6 ||
    options.paperComponent === 'paper6';

  // Benchmark authentic paper presets
  if (isMcqOnly && totalMarks === 40) return 45; // 45 minutes for 40 MCQs
  if (isATPOnly && totalMarks === 40) return 60; // 1 hour for Paper 6
  if (!isMcqOnly && !isATPOnly && totalMarks === 80) return 75; // 1h 15m for Paper 3/4 Theory

  // Dynamic composition if mcqMarks / theoryMarks / atpMarks provided
  if (options.mcqMarks !== undefined || options.theoryMarks !== undefined || options.atpMarks !== undefined) {
    const mcqM = options.mcqMarks || 0;
    const atpM = options.atpMarks || 0;
    const theoryM = options.theoryMarks !== undefined ? options.theoryMarks : Math.max(0, totalMarks - mcqM - atpM);

    const time = mcqM * 1.125 + theoryM * 0.9375 + atpM * 1.5;
    return Math.max(15, Math.round(time / 5) * 5); // rounded to nearest 5 mins
  }

  // Pure MCQ custom paper
  if (isMcqOnly) {
    return Math.max(15, Math.round(totalMarks * 1.125));
  }

  // Pure ATP custom paper
  if (isATPOnly) {
    return Math.max(15, Math.round(totalMarks * 1.5));
  }

  // General Theory custom paper
  return Math.max(15, Math.round(totalMarks * 0.9375));
}
