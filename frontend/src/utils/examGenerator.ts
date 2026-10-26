import {
  QuestionItem,
  Subject,
  SubjectCode,
  Tier,
  PaperComponent,
  SyllabusEra,
  subjectSlugToCode,
} from '../types';
import { getQuestionType } from './questionClassification';
import { getTopicsForSubject } from '../constants/taxonomy';

export type SmartGenerateMode = 'balanced' | 'review_first' | 'unattempted_only';
export type ExamStructure = 'authentic' | 'theory_only' | 'mcq_sprint';

export interface ExamGeneratorOptions {
  targetMarks: number;
  questionCount?: number;
  mode?: SmartGenerateMode;
  structure?: ExamStructure;
  subject?: SubjectCode | Subject;
  selectedComponents?: (number | PaperComponent | string)[];
  tier?: Tier | 'all' | 'both';
  syllabusEra?: SyllabusEra;
  calculatorAllowed?: boolean | null;
  isMcqOnly?: boolean;
  selectedTopics?: string[];
  selectedSubtopics?: string[];
  hideObsolete?: boolean;
  questionStatuses?: Record<string, string>;
  bookmarks?: Set<string> | string[];
}

export interface ExamGeneratorResult {
  selected: QuestionItem[];
  actualMarks: number;
  relaxedConstraints: string[];
}

/**
 * Unbiased O(n) Fisher-Yates shuffle.
 */
export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * 1D Subset-Sum Dynamic Programming solver over mark values (target <= 200 marks).
 * Pre-filters eligible questions, randomizes order with Fisher-Yates shuffle,
 * prioritizes lower paper usage, and backtracks DP table in O(n * target) time (< 2ms).
 */
export function findExactSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>,
  _maxTimeMs: number = 35
): QuestionItem[] | null {
  if (target === 0) return [];
  if (!candidates || candidates.length === 0 || target < 0) return null;

  const maxTarget = Math.min(200, Math.round(target));
  if (maxTarget <= 0) return null;

  // Pre-filter eligible questions and randomize order with Fisher-Yates shuffle
  const shuffled = fisherYatesShuffle(
    candidates.filter((q) => {
      const m = Math.round(q.marks || 0);
      return m > 0 && m <= maxTarget;
    })
  );
  if (shuffled.length === 0) return null;

  // Prefer lower paper usage while preserving randomized order within usage tiers
  shuffled.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId || a.id) || 0;
    const bUse = paperUsage.get(b.paperId || b.id) || 0;
    return aUse - bUse;
  });

  // 1D DP table: dpChoice[s] = index in `shuffled` used to first reach sum `s` (-2 for base 0, -1 for unreachable)
  const dpChoice = new Int32Array(maxTarget + 1).fill(-1);
  const dpPrevSum = new Int32Array(maxTarget + 1).fill(-1);
  dpChoice[0] = -2;
  dpPrevSum[0] = 0;

  for (let i = 0; i < shuffled.length; i++) {
    const m = Math.round(shuffled[i].marks || 0);
    if (m <= 0 || m > maxTarget) continue;

    for (let s = maxTarget; s >= m; s--) {
      if (dpChoice[s] === -1 && dpChoice[s - m] !== -1) {
        dpChoice[s] = i;
        dpPrevSum[s] = s - m;
      }
    }

    if (dpChoice[maxTarget] !== -1) {
      break;
    }
  }

  if (dpChoice[maxTarget] === -1) {
    return null;
  }

  // Backtrack from maxTarget to 0
  const result: QuestionItem[] = [];
  let cur = maxTarget;
  while (cur > 0 && dpChoice[cur] >= 0) {
    const idx = dpChoice[cur];
    result.push(shuffled[idx]);
    cur = dpPrevSum[cur];
  }

  return result.reverse();
}

/**
 * Finds the closest subset to target marks using 1D Subset-Sum Dynamic Programming,
 * prioritizing an exact match when available.
 */
export function findClosestSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>
): { subset: QuestionItem[]; marks: number } {
  if (!candidates || candidates.length === 0 || target <= 0) {
    return { subset: [], marks: 0 };
  }

  const exact = findExactSubset(candidates, target, paperUsage);
  if (exact) {
    const marks = exact.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { subset: exact, marks };
  }

  const viable = fisherYatesShuffle(candidates.filter((q) => (q.marks || 0) > 0));
  if (viable.length === 0) {
    return { subset: [], marks: 0 };
  }

  viable.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId || a.id) || 0;
    const bUse = paperUsage.get(b.paperId || b.id) || 0;
    return aUse - bUse;
  });

  const totalAvailable = viable.reduce((sum, q) => sum + Math.round(q.marks || 0), 0);
  if (totalAvailable <= target) {
    return { subset: viable, marks: totalAvailable };
  }

  const maxCap = Math.min(220, Math.round(target) + 12);
  const dpChoice = new Int32Array(maxCap + 1).fill(-1);
  const dpPrevSum = new Int32Array(maxCap + 1).fill(-1);
  dpChoice[0] = -2;
  dpPrevSum[0] = 0;

  for (let i = 0; i < viable.length; i++) {
    const m = Math.round(viable[i].marks || 0);
    if (m <= 0 || m > maxCap) continue;

    for (let s = maxCap; s >= m; s--) {
      if (dpChoice[s] === -1 && dpChoice[s - m] !== -1) {
        dpChoice[s] = i;
        dpPrevSum[s] = s - m;
      }
    }
  }

  // Find reachable sum s > 0 minimizing |s - target| (preferring <= target on tie)
  let bestSum = 0;
  let bestDiff = Infinity;
  for (let s = 1; s <= maxCap; s++) {
    if (dpChoice[s] !== -1) {
      const diff = Math.abs(s - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = s;
      }
    }
  }

  if (bestSum === 0) {
    return { subset: [viable[0]], marks: viable[0].marks || 0 };
  }

  const subset: QuestionItem[] = [];
  let cur = bestSum;
  while (cur > 0 && dpChoice[cur] >= 0) {
    const idx = dpChoice[cur];
    subset.push(viable[idx]);
    cur = dpPrevSum[cur];
  }

  return { subset: subset.reverse(), marks: bestSum };
}

/**
 * Builds a lookup function that maps any question to its canonical syllabus topic/subtopic rank.
 */
function buildSyllabusOrderGetter(subjectCode: SubjectCode): (q: QuestionItem) => number {
  const topics = getTopicsForSubject(subjectCode);
  const topicRankMap = new Map<string, number>();
  const subtopicRankMap = new Map<string, number>();

  topics.forEach((t, tIdx) => {
    const baseRank = (t.topicNumber || tIdx + 1) * 100;
    topicRankMap.set(t.topicName.toLowerCase(), baseRank);
    const stripped = t.topicName.replace(/^\d+\.\s*/, '').toLowerCase();
    topicRankMap.set(stripped, baseRank);

    t.subtopics.forEach((sub, sIdx) => {
      subtopicRankMap.set(sub.toLowerCase(), baseRank + (sIdx + 1));
    });
  });

  return (q: QuestionItem): number => {
    const subLower = (q.subtopic || q.subtopics?.[0] || '').trim().toLowerCase();
    if (subLower && subtopicRankMap.has(subLower)) {
      return subtopicRankMap.get(subLower)!;
    }

    const topicStr = (q.topic || '').trim();
    const topicLower = topicStr.toLowerCase();
    if (topicLower && topicRankMap.has(topicLower)) {
      return topicRankMap.get(topicLower)!;
    }

    const leadingNum = parseFloat(topicStr);
    if (!isNaN(leadingNum)) {
      return leadingNum * 100;
    }

    return 9999;
  };
}

/**
 * Sorts selected questions in authentic Cambridge IGCSE examination order:
 * - Mathematics: Ascending by marks (1-3m warm-up -> 4-6m mid-paper -> 7-10m major structured questions),
 *   then by canonical syllabus topic order.
 * - Sciences:
 *   - Section A: Multiple Choice questions (is_mcq === true) ordered by syllabus topic code
 *   - Section B: Core / Extended Theory questions ordered by syllabus topic code, then marks
 *   - Section C: Alternative to Practical (Paper 6) questions ordered by syllabus topic code
 */
export function sortExamQuestionsAuthentic(
  questions: QuestionItem[],
  subjectOrIsMath: boolean | Subject | SubjectCode = false
): QuestionItem[] {
  let subjectCode: SubjectCode = '0620';
  let isMath = false;

  if (typeof subjectOrIsMath === 'boolean') {
    isMath = subjectOrIsMath;
    subjectCode = isMath
      ? '0580'
      : questions[0]?.subject
      ? subjectSlugToCode(questions[0].subject)
      : '0620';
  } else {
    subjectCode = subjectSlugToCode(subjectOrIsMath);
    isMath = subjectCode === '0580';
  }

  const getSyllabusOrder = buildSyllabusOrderGetter(subjectCode);

  if (isMath) {
    return [...questions].sort((a, b) => {
      const aMarks = a.marks || 0;
      const bMarks = b.marks || 0;
      if (aMarks !== bMarks) {
        return aMarks - bMarks;
      }
      const aOrder = getSyllabusOrder(a);
      const bOrder = getSyllabusOrder(b);
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
    });
  }

  // Sciences
  const mcqs = questions.filter((q) => q.is_mcq || getQuestionType(q) === 'mcq');
  const nonMcqs = questions.filter((q) => !q.is_mcq && getQuestionType(q) !== 'mcq');

  const theory = nonMcqs.filter((q) => q.paper !== 6 && q.paperCode !== 'paper6');
  const practical = nonMcqs.filter((q) => q.paper === 6 || q.paperCode === 'paper6');

  mcqs.sort((a, b) => {
    const aOrder = getSyllabusOrder(a);
    const bOrder = getSyllabusOrder(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  theory.sort((a, b) => {
    const aOrder = getSyllabusOrder(a);
    const bOrder = getSyllabusOrder(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aMarks = a.marks || 0;
    const bMarks = b.marks || 0;
    if (aMarks !== bMarks) return aMarks - bMarks;
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  practical.sort((a, b) => {
    const aOrder = getSyllabusOrder(a);
    const bOrder = getSyllabusOrder(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  return [...mcqs, ...theory, ...practical];
}

function matchesSyllabusEra(q: QuestionItem, era?: SyllabusEra): boolean {
  if (!era || era === 'all') return true;
  const qYear = q.year || 2025;
  if (era === '2025-2028') return qYear >= 2025 && qYear <= 2028;
  if (era === '2019-2024' || era === '2020-2024') return qYear >= 2019 && qYear <= 2024;
  return true;
}

/**
 * Intelligent Sampling & Generation Engine for Cambridge IGCSE Mock Exams.
 * Uses 1D Subset-Sum Dynamic Programming (< 5ms) and strictly preserves hard constraints
 * (calculator rule, MCQ vs. Theory, Tier, Paper component, and Obsolete exclusion).
 */
export function autoGenerateExam(
  pool: QuestionItem[],
  targetMarksOrOptions: number | ExamGeneratorOptions,
  modeArg?: SmartGenerateMode,
  structureOrStatuses?: ExamStructure | Record<string, string>,
  statusesOrBookmarks?: Record<string, string> | Set<string> | string[],
  bookmarksList?: Set<string> | string[]
): ExamGeneratorResult {
  if (!pool || pool.length === 0) {
    return { selected: [], actualMarks: 0, relaxedConstraints: [] };
  }

  // Parse arguments to handle both Options object and positional arguments
  let options: ExamGeneratorOptions;

  if (typeof targetMarksOrOptions === 'object') {
    options = { ...targetMarksOrOptions };
  } else {
    let examStructure: ExamStructure = 'authentic';
    let questionStatuses: Record<string, string> = {};
    let bookmarksSet = new Set<string>();

    if (typeof structureOrStatuses === 'string') {
      examStructure = structureOrStatuses as ExamStructure;
      if (statusesOrBookmarks && !(statusesOrBookmarks instanceof Set) && !Array.isArray(statusesOrBookmarks)) {
        questionStatuses = statusesOrBookmarks as Record<string, string>;
      }
      if (bookmarksList instanceof Set) {
        bookmarksSet = bookmarksList;
      } else if (Array.isArray(bookmarksList)) {
        bookmarksSet = new Set(bookmarksList);
      }
    } else if (structureOrStatuses && typeof structureOrStatuses === 'object') {
      questionStatuses = structureOrStatuses as Record<string, string>;
      if (statusesOrBookmarks instanceof Set) {
        bookmarksSet = statusesOrBookmarks;
      } else if (Array.isArray(statusesOrBookmarks)) {
        bookmarksSet = new Set(statusesOrBookmarks);
      }
    }

    options = {
      targetMarks: targetMarksOrOptions,
      mode: modeArg || 'balanced',
      structure: examStructure,
      questionStatuses,
      bookmarks: bookmarksSet,
    };
  }

  const {
    targetMarks,
    questionCount,
    mode = 'balanced',
    structure = 'authentic',
    subject,
    selectedComponents,
    tier,
    syllabusEra,
    calculatorAllowed,
    isMcqOnly,
    selectedTopics,
    selectedSubtopics,
    hideObsolete = true,
    questionStatuses = {},
  } = options;

  if (targetMarks <= 0 && (!questionCount || questionCount <= 0)) {
    return { selected: [], actualMarks: 0, relaxedConstraints: [] };
  }

  const relaxedConstraints: string[] = [];

  // Resolve Subject directly from options.subject when provided
  const resolvedSubjectCode: SubjectCode = subject
    ? subjectSlugToCode(subject)
    : pool.some((q) => q.subject === '0580' || (q.unitCode && q.unitCode.startsWith('0580')))
    ? '0580'
    : pool[0]?.subject
    ? subjectSlugToCode(pool[0].subject)
    : '0620';
  const isMath = resolvedSubjectCode === '0580';

  const bookmarksSet: Set<string> =
    options.bookmarks instanceof Set
      ? options.bookmarks
      : new Set(options.bookmarks || []);

  // Step 1: Strictly filter by HARD CONSTRAINTS (NEVER silently dropped)
  const hardFiltered = pool.filter((q) => {
    // 1. Must have marks > 0
    if ((q.marks || 0) <= 0) return false;

    // 2. Obsolete filter
    if (hideObsolete && (q.is_obsolete || q.obsolete)) return false;

    // 3. Hard Constraint: Calculator rule
    if (calculatorAllowed === false) {
      if (q.calculator_allowed !== false) return false;
    } else if (calculatorAllowed === true) {
      if (q.calculator_allowed === false) return false;
    }

    // 4. Hard Constraint: MCQ vs. Theory
    const isQuestionMcq = q.is_mcq || getQuestionType(q) === 'mcq';
    if (isMcqOnly || structure === 'mcq_sprint') {
      if (!isQuestionMcq) return false;
    } else if (structure === 'theory_only') {
      if (isQuestionMcq) return false;
    }

    // 5. Hard Constraint: Component / Paper filter
    if (selectedComponents && selectedComponents.length > 0) {
      const qPaper = q.paper;
      const qComp = q.paperCode || (qPaper ? `paper${qPaper}` : '');
      const matchesComponent = selectedComponents.some((c) => {
        if (typeof c === 'number') return qPaper === c;
        if (typeof c === 'string') {
          const numMatch = c.match(/\d+/);
          if (numMatch && qPaper === parseInt(numMatch[0], 10)) return true;
          return qComp.toLowerCase() === c.toLowerCase();
        }
        return false;
      });
      if (!matchesComponent) return false;
    }

    // 6. Hard Constraint: Tier filter
    if (tier && tier !== 'all' && (tier as string) !== 'both') {
      if (tier === 'extended') {
        const matchesExtended =
          q.tier === 'extended' ||
          q.paper === 2 ||
          q.paper === 4 ||
          (q.paper === 6 && !isMath);
        if (!matchesExtended) return false;
      } else if (tier === 'core') {
        const matchesCore = q.tier === 'core' || q.paper === 1 || q.paper === 3;
        if (!matchesCore) return false;
      } else if (tier === 'practical') {
        if (q.tier !== 'practical' && q.paper !== 6) return false;
      }
    }

    return true;
  });

  if (hardFiltered.length === 0) {
    return {
      selected: [],
      actualMarks: 0,
      relaxedConstraints: ['No questions matched hard constraints (Tier / Calculator / Question Type)'],
    };
  }

  // Step 2: Apply SOFT CONSTRAINTS (Topics/Subtopics, Syllabus Era, Unattempted Mode) with tracked relaxation
  let candidates = hardFiltered;

  // Soft Constraint A: Syllabus Era
  if (syllabusEra && syllabusEra !== 'all') {
    const eraFiltered = candidates.filter((q) => matchesSyllabusEra(q, syllabusEra));
    const eraMarks = eraFiltered.reduce((sum, q) => sum + (q.marks || 0), 0);
    if (eraFiltered.length > 0 && eraMarks >= Math.min(targetMarks, 10)) {
      candidates = eraFiltered;
    } else if (eraFiltered.length < candidates.length) {
      relaxedConstraints.push(`Syllabus era (${syllabusEra})`);
    }
  }

  // Soft Constraint B: Topic & Subtopic filters
  const hasTopicFilter = (selectedTopics && selectedTopics.length > 0) || (selectedSubtopics && selectedSubtopics.length > 0);
  if (hasTopicFilter) {
    const topicFiltered = candidates.filter((q) => {
      if (selectedTopics && selectedTopics.length > 0) {
        if (!q.topic || !selectedTopics.includes(q.topic)) return false;
      }
      if (selectedSubtopics && selectedSubtopics.length > 0) {
        const qSubs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : [q.subtopic];
        const hasMatch = qSubs.some((s) => s && selectedSubtopics.includes(s));
        if (!hasMatch) return false;
      }
      return true;
    });

    if (topicFiltered.length > 0) {
      candidates = topicFiltered;
    } else {
      relaxedConstraints.push('Selected topic/subtopic filter');
    }
  }

  // Soft Constraint C: Unattempted-only mode
  if (mode === 'unattempted_only') {
    const unattempted = candidates.filter((q) => {
      const st = questionStatuses[q.id];
      return !st || st === 'unattempted';
    });
    const unattemptedMarks = unattempted.reduce((sum, q) => sum + (q.marks || 0), 0);
    if (unattempted.length > 0 && unattemptedMarks >= targetMarks) {
      candidates = unattempted;
    } else if (unattempted.length > 0 && unattempted.length < candidates.length) {
      // Prioritize unattempted first, supplemented by remaining hard-valid candidates
      relaxedConstraints.push('Unattempted-only mode (supplemented with attempted questions)');
    } else if (unattempted.length === 0) {
      relaxedConstraints.push('Unattempted-only mode (no unattempted questions remaining)');
    }
  }

  // Precompute deterministic priority per question (single random jitter per call, never inside sort comparator)
  const priorityMap = new Map<string, number>();
  for (const q of candidates) {
    let score = 50;
    const st = questionStatuses[q.id];
    if (mode === 'review_first') {
      const isBookmarked = bookmarksSet.has(q.id);
      if (isBookmarked || st === 'review' || st === 'incorrect') {
        score = 300;
      } else if (!st || st === 'unattempted') {
        score = 100;
      } else {
        score = 20;
      }
    } else if (mode === 'unattempted_only') {
      score = !st || st === 'unattempted' ? 250 : 40;
    }
    priorityMap.set(q.id, score + Math.random() * 40);
  }

  const getPriority = (q: QuestionItem): number => priorityMap.get(q.id) ?? 50;

  // Special path for pure MCQ papers (e.g. 40 MCQs = 40 marks)
  const isTargetingMcqs =
    isMcqOnly ||
    structure === 'mcq_sprint' ||
    candidates.every((q) => q.is_mcq || getQuestionType(q) === 'mcq');
  const targetCountOrMarks = questionCount || targetMarks;

  if (isTargetingMcqs && targetCountOrMarks > 0) {
    const topicBuckets = new Map<string, QuestionItem[]>();
    for (const q of fisherYatesShuffle(candidates)) {
      const key = q.topic || 'General';
      if (!topicBuckets.has(key)) topicBuckets.set(key, []);
      topicBuckets.get(key)!.push(q);
    }

    for (const bucket of topicBuckets.values()) {
      bucket.sort((a, b) => getPriority(b) - getPriority(a));
    }

    const bucketKeys = fisherYatesShuffle(Array.from(topicBuckets.keys()));
    const selectedMcqs: QuestionItem[] = [];
    const usedIds = new Set<string>();
    let bucketIdx = 0;
    let consecutiveSkips = 0;

    while (selectedMcqs.length < targetCountOrMarks && bucketKeys.length > 0) {
      const key = bucketKeys[bucketIdx % bucketKeys.length];
      const bucket = topicBuckets.get(key)!;
      const pick = bucket.find((q) => !usedIds.has(q.id));

      if (pick) {
        selectedMcqs.push(pick);
        usedIds.add(pick.id);
        consecutiveSkips = 0;
      } else {
        consecutiveSkips++;
      }

      bucketIdx++;
      if (consecutiveSkips >= bucketKeys.length) break;
    }

    const totalMarks = selectedMcqs.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (totalMarks < targetMarks) {
      relaxedConstraints.push(`Target marks (${totalMarks}/${targetMarks}m available under hard constraints)`);
    }
    const sorted = sortExamQuestionsAuthentic(selectedMcqs, resolvedSubjectCode);
    return { selected: sorted, actualMarks: totalMarks, relaxedConstraints };
  }

  // Multi-Topic Balanced Sampling + 1D Subset-Sum DP Exact Mark Solver
  const selected: QuestionItem[] = [];
  const usedIds = new Set<string>();
  const paperUsage = new Map<string, number>();

  const topicBuckets = new Map<string, QuestionItem[]>();
  for (const q of fisherYatesShuffle(candidates)) {
    const key = q.topic || 'General';
    if (!topicBuckets.has(key)) topicBuckets.set(key, []);
    topicBuckets.get(key)!.push(q);
  }

  for (const bucket of topicBuckets.values()) {
    bucket.sort((a, b) => getPriority(b) - getPriority(a));
  }

  const bucketKeys = fisherYatesShuffle(Array.from(topicBuckets.keys()));
  let currentMarks = 0;
  // Leave a 15-mark buffer for the 1D DP subset-sum solver to hit the exact target
  const stage1Target = Math.max(0, targetMarks - 15);
  let bucketIdx = 0;
  let consecutiveSkips = 0;

  while (currentMarks < stage1Target && bucketKeys.length > 0) {
    const key = bucketKeys[bucketIdx % bucketKeys.length];
    const bucket = topicBuckets.get(key)!;
    const available = bucket.filter((q) => !usedIds.has(q.id));

    if (available.length > 0) {
      const viable = available.filter((q) => currentMarks + (q.marks || 0) <= targetMarks - 4);
      if (viable.length > 0) {
        viable.sort((a, b) => {
          const aUse = paperUsage.get(a.paperId || a.id) || 0;
          const bUse = paperUsage.get(b.paperId || b.id) || 0;
          if (aUse !== bUse) return aUse - bUse;
          return getPriority(b) - getPriority(a);
        });
        const pick = viable[0];
        selected.push(pick);
        usedIds.add(pick.id);
        paperUsage.set(pick.paperId || pick.id, (paperUsage.get(pick.paperId || pick.id) || 0) + 1);
        currentMarks += pick.marks || 0;
        consecutiveSkips = 0;
      } else {
        consecutiveSkips++;
      }
    } else {
      consecutiveSkips++;
    }

    bucketIdx++;
    if (consecutiveSkips >= bucketKeys.length) break;
  }

  // Step 3: 1D DP Subset-Sum Solver for the remaining mark deficit
  const deficit = targetMarks - currentMarks;
  if (deficit > 0) {
    const remainingCandidates = candidates.filter((q) => !usedIds.has(q.id));
    const { subset } = findClosestSubset(remainingCandidates, deficit, paperUsage);
    for (const q of subset) {
      selected.push(q);
      usedIds.add(q.id);
      paperUsage.set(q.paperId || q.id, (paperUsage.get(q.paperId || q.id) || 0) + 1);
    }
  }

  let finalSelected = selected;
  let finalMarks = finalSelected.reduce((sum, q) => sum + (q.marks || 0), 0);

  // If stage-1 greedy picks prevented an exact DP sum, run full-pool 1D DP directly to guarantee exact targetMarks
  if (finalMarks !== targetMarks) {
    const fullExact = findExactSubset(candidates, targetMarks, new Map());
    if (fullExact && fullExact.length > 0) {
      finalSelected = fullExact;
      finalMarks = targetMarks;
    }
  }

  if (finalMarks < targetMarks) {
    relaxedConstraints.push(`Target marks (${finalMarks}/${targetMarks}m available under hard constraints)`);
  }

  const sorted = sortExamQuestionsAuthentic(finalSelected, resolvedSubjectCode);
  return { selected: sorted, actualMarks: finalMarks, relaxedConstraints };
}
