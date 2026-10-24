import { QuestionItem, Subject, SubjectCode, subjectCodeToSlug } from '../types';

/**
 * Single source of truth for detecting a question's subject:
 * 'mathematics' (0580) | 'physics' (0625) | 'chemistry' (0620) | 'biology' (0610)
 */
export function getQuestionSubject(q?: QuestionItem | null): Subject {
  if (!q) return 'mathematics';

  // 1. Check explicit subject field if present
  if (q.subject) {
    return subjectCodeToSlug(q.subject);
  }

  // 2. Check id prefix (e.g. 0580_s25_qp_22_q01)
  const id = (q.id || '').toLowerCase();
  if (id.startsWith('0580')) return 'mathematics';
  if (id.startsWith('0625')) return 'physics';
  if (id.startsWith('0620')) return 'chemistry';
  if (id.startsWith('0610')) return 'biology';

  // 3. Fallback checks for legacy or unit codes
  const unitCode = (q.unitCode || '').toUpperCase();
  const paperId = (q.paperId || q.paper_id || '').toLowerCase();
  const imgPath = (q.questionImagePath || q.question_image_url || '').toLowerCase();

  if (unitCode.includes('0580') || paperId.includes('0580') || imgPath.includes('0580') || imgPath.includes('math')) {
    return 'mathematics';
  }
  if (unitCode.includes('0625') || paperId.includes('0625') || imgPath.includes('0625') || imgPath.includes('physics')) {
    return 'physics';
  }
  if (unitCode.includes('0610') || paperId.includes('0610') || imgPath.includes('0610') || imgPath.includes('bio')) {
    return 'biology';
  }

  return 'chemistry';
}

/**
 * Returns the SubjectCode ('0580' | '0625' | '0620' | '0610') for a question.
 */
export function getQuestionSubjectCode(q?: QuestionItem | null): SubjectCode {
  const subject = getQuestionSubject(q);
  switch (subject) {
    case 'mathematics': return '0580';
    case 'physics': return '0625';
    case 'biology': return '0610';
    case 'chemistry':
    default: return '0620';
  }
}

/**
 * Determines whether a question is strictly a Multiple Choice Question (MCQ)
 * or a Theory / Structured question in Cambridge IGCSE.
 *
 * Rules:
 * 1. Mathematics 0580 has NO MCQ papers (Papers 1, 2, 3, 4 are all structured/short-response).
 * 2. Sciences (0625 Physics, 0620 Chemistry, 0610 Biology):
 *    - Paper 1 (Core MCQ) & Paper 2 (Extended MCQ) are 100% Multiple Choice (40 questions, 1 mark each).
 *    - Paper 3 (Core Theory), Paper 4 (Extended Theory), Paper 5 & 6 (Practicals) are structured Theory questions.
 * 3. Fallback to explicit `is_mcq` or `question_type === 'mcq'` if present on item.
 */
export function isMCQ(q: QuestionItem): boolean {
  if (q.is_mcq !== undefined) {
    return Boolean(q.is_mcq);
  }

  if (q.question_type === 'mcq' || q.questionType === 'mcq') {
    return true;
  }
  if (q.question_type === 'theory' || q.questionType === 'theory') {
    return false;
  }

  const subject = getQuestionSubject(q);
  if (subject === 'mathematics') {
    return false;
  }

  // Check paper number: Paper 1 & 2 are MCQ in Cambridge Sciences
  const paperNum = q.paper ?? (q.id ? parseInt(q.id.split('_')[3]?.[0] || '0', 10) : 0);
  if (paperNum === 1 || paperNum === 2) {
    return true;
  }

  return false;
}

export function getQuestionType(q: QuestionItem): 'mcq' | 'theory' {
  return isMCQ(q) ? 'mcq' : 'theory';
}

/**
 * Determines if calculator is allowed for a Cambridge IGCSE question.
 * Mathematics (0580):
 * - 2025+: Paper 1 & Paper 2 are Non-Calculator (false). Paper 3 & Paper 4 are Calculator (true).
 * - 2020-2024: All papers permitted calculators (true).
 * Sciences (0625, 0620, 0610):
 * - Calculator is always allowed.
 */
export function isCalculatorAllowed(q: QuestionItem): boolean {
  if (q.calculator_allowed !== undefined) {
    return Boolean(q.calculator_allowed);
  }

  const subject = getQuestionSubject(q);
  if (subject !== 'mathematics') {
    return true;
  }

  const year = q.year ?? 2025;
  const paperNum = q.paper ?? (q.id ? parseInt(q.id.split('_')[3]?.[0] || '2', 10) : 2);

  if (year >= 2025 && (paperNum === 1 || paperNum === 2)) {
    return false;
  }
  return true;
}
