import { QuestionItem, Subject, SubjectCode, Tier, PaperComponent, SyllabusEra } from '../types';
import { getQuestionType } from './questionClassification';

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

/**
 * Fast bounded backtracking search to find an exact subset of questions summing to target marks.
 * Prioritizes topic diversity and prunes branches aggressively.
 */
export function findExactSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>,
  maxTimeMs: number = 35
): QuestionItem[] | null {
  if (target === 0) return [];
  if (!candidates || candidates.length === 0 || target < 0) return null;

  // Filter out candidates with marks <= 0 or marks > target
  const viable = candidates.filter((q) => (q.marks || 0) > 0 && (q.marks || 0) <= target);
  if (viable.length === 0) return null;

  // Sort viable: prefer lower paper usage first, then descending marks for rapid pruning
  viable.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId || a.id) || 0;
    const bUse = paperUsage.get(b.paperId || b.id) || 0;
    if (aUse !== bUse) return aUse - bUse;
    return (b.marks || 0) - (a.marks || 0);
  });

  const startTime = performance.now();
  let result: QuestionItem[] | null = null;

  function dfs(index: number, rem: number, path: QuestionItem[]): boolean {
    if (rem === 0) {
      result = [...path];
      return true;
    }
    if (rem < 0 || index >= viable.length) return false;
    if (performance.now() - startTime > maxTimeMs) return false;

    // Option 1: Pick viable[index]
    const item = viable[index];
    const m = item.marks || 0;
    if (m <= rem) {
      path.push(item);
      if (dfs(index + 1, rem - m, path)) return true;
      path.pop();
    }

    // Option 2: Skip viable[index]
    if (dfs(index + 1, rem, path)) return true;

    return false;
  }

  dfs(0, target, []);
  return result;
}

/**
 * Finds the closest subset to target marks, prioritizing an exact match when available.
 */
export function findClosestSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>
): { subset: QuestionItem[]; marks: number } {
  const exact = findExactSubset(candidates, target, paperUsage, 30);
  if (exact) {
    const marks = exact.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { subset: exact, marks };
  }

  const viable = candidates
    .filter((q) => (q.marks || 0) > 0)
    .sort((a, b) => {
      const aUse = paperUsage.get(a.paperId || a.id) || 0;
      const bUse = paperUsage.get(b.paperId || b.id) || 0;
      if (aUse !== bUse) return aUse - bUse;
      return (b.marks || 0) - (a.marks || 0);
    });

  const subset: QuestionItem[] = [];
  let cur = 0;
  for (const q of viable) {
    const m = q.marks || 0;
    if (cur + m <= target + 2) {
      subset.push(q);
      cur += m;
      if (Math.abs(cur - target) <= 1) break;
    }
  }
  return { subset, marks: cur };
}

/**
 * Sorts selected questions in authentic Cambridge IGCSE examination order:
 * - Mathematics: Ascending by marks (1-3m warm-up -> 4-6m mid-paper -> 7-10m major structured questions)
 * - Sciences:
 *   - Section A: Multiple Choice questions (is_mcq === true)
 *   - Section B: Core / Extended Theory questions grouped by topic or parent question
 *   - Section C: Alternative to Practical (Paper 6) questions
 */
export function sortExamQuestionsAuthentic(questions: QuestionItem[], isMath: boolean): QuestionItem[] {
  if (isMath) {
    return [...questions].sort((a, b) => {
      const aMarks = a.marks || 0;
      const bMarks = b.marks || 0;
      if (aMarks !== bMarks) {
        return aMarks - bMarks;
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
    const aTopic = a.topic || '';
    const bTopic = b.topic || '';
    if (aTopic !== bTopic) return aTopic.localeCompare(bTopic);
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  theory.sort((a, b) => {
    const aTopic = a.topic || '';
    const bTopic = b.topic || '';
    if (aTopic !== bTopic) return aTopic.localeCompare(bTopic);
    const aMarks = a.marks || 0;
    const bMarks = b.marks || 0;
    if (aMarks !== bMarks) return aMarks - bMarks;
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  practical.sort((a, b) => {
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  return [...mcqs, ...theory, ...practical];
}

/**
 * Intelligent Sampling & Generation Engine for Cambridge IGCSE Mock Exams.
 * Supports:
 * - Deterministic / balanced topic sampling with round-robin distribution
 * - Accurate mark totals (within ±2 marks, exact match prioritized)
 * - Strict MCQ-only filtering for Paper 1 / Paper 2 mocks
 * - Strict non-calculator filtering for 0580 Paper 1 & 2 (2025+)
 * - Automatic obsolete question filtering for sciences
 * - Deduplication of question IDs
 */
export function autoGenerateExam(
  pool: QuestionItem[],
  targetMarksOrOptions: number | ExamGeneratorOptions,
  modeArg?: SmartGenerateMode,
  structureOrStatuses?: ExamStructure | Record<string, string>,
  statusesOrBookmarks?: Record<string, string> | Set<string> | string[],
  bookmarksList?: Set<string> | string[]
): { selected: QuestionItem[]; actualMarks: number } {
  if (!pool || pool.length === 0) {
    return { selected: [], actualMarks: 0 };
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
    selectedComponents,
    tier,
    calculatorAllowed,
    isMcqOnly,
    selectedTopics,
    selectedSubtopics,
    hideObsolete = true,
    questionStatuses = {},
  } = options;

  if (targetMarks <= 0 && (!questionCount || questionCount <= 0)) {
    return { selected: [], actualMarks: 0 };
  }

  const bookmarksSet: Set<string> =
    options.bookmarks instanceof Set
      ? options.bookmarks
      : new Set(options.bookmarks || []);

  // Filter pool to valid candidates matching Cambridge criteria
  let candidates = pool.filter((q) => {
    // 1. Must have marks > 0
    if ((q.marks || 0) <= 0) return false;

    // 2. Obsolete filter (Sciences 2020-2022 removed content)
    if (hideObsolete && q.obsolete) return false;

    // 3. Calculator allowed filter
    if (calculatorAllowed !== undefined && calculatorAllowed !== null) {
      if (q.calculator_allowed !== undefined && q.calculator_allowed !== calculatorAllowed) {
        return false;
      }
    }

    // 4. MCQ / Theory filter
    const isQuestionMcq = q.is_mcq || getQuestionType(q) === 'mcq';
    if (isMcqOnly || structure === 'mcq_sprint') {
      if (!isQuestionMcq) return false;
    } else if (structure === 'theory_only') {
      if (isQuestionMcq) return false;
    }

    // 5. Component / Paper filter
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

    // 6. Tier filter
    if (tier && tier !== 'all' && (tier as string) !== 'both') {
      if (tier === 'extended') {
        const matchesExtended =
          q.tier === 'extended' ||
          q.paper === 2 ||
          q.paper === 4 ||
          (q.paper === 6 && q.subject !== '0580');
        if (!matchesExtended) return false;
      } else if (tier === 'core') {
        const matchesCore = q.tier === 'core' || q.paper === 1 || q.paper === 3;
        if (!matchesCore) return false;
      } else if (tier === 'practical') {
        if (q.tier !== 'practical' && q.paper !== 6) return false;
      }
    }

    // 7. Topic & Subtopic filter
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

  if (candidates.length === 0) {
    // If over-filtered, fall back to valid pool without strict topic constraints
    candidates = pool.filter((q) => (q.marks || 0) > 0 && (!hideObsolete || !q.obsolete));
  }
  if (candidates.length === 0) {
    return { selected: [], actualMarks: 0 };
  }

  // Filter by Selection Mode (Unattempted)
  if (mode === 'unattempted_only') {
    const unattempted = candidates.filter((q) => {
      const st = questionStatuses[q.id];
      return !st || st === 'unattempted';
    });
    if (unattempted.length > 0) {
      candidates = unattempted;
    }
  }

  // Question prioritization heuristic
  const getQuestionPriority = (q: QuestionItem): number => {
    let score = 50;
    if (mode === 'review_first') {
      const isBookmarked = bookmarksSet.has(q.id);
      const st = questionStatuses[q.id];
      if (isBookmarked || st === 'review' || st === 'incorrect') {
        score = 300;
      } else if (!st || st === 'unattempted') {
        score = 100;
      } else {
        score = 20;
      }
    }
    return score + Math.random() * 40;
  };

  const isMath = candidates.some((q) => q.subject === '0580' || (q.unitCode && q.unitCode.startsWith('0580')));

  // Special optimized path for pure MCQ papers (e.g. 40 MCQs = 40 marks)
  const isTargetingMcqs = isMcqOnly || structure === 'mcq_sprint' || candidates.every((q) => q.is_mcq || getQuestionType(q) === 'mcq');
  const targetCountOrMarks = questionCount || targetMarks;

  if (isTargetingMcqs && targetCountOrMarks > 0) {
    // Group MCQs by topic for balanced sampling
    const topicBuckets = new Map<string, QuestionItem[]>();
    candidates.forEach((q) => {
      const key = q.topic || 'General';
      if (!topicBuckets.has(key)) topicBuckets.set(key, []);
      topicBuckets.get(key)!.push(q);
    });

    for (const bucket of topicBuckets.values()) {
      bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
    }

    const bucketKeys = Array.from(topicBuckets.keys()).sort(() => Math.random() - 0.5);
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
    const sorted = sortExamQuestionsAuthentic(selectedMcqs, isMath);
    return { selected: sorted, actualMarks: totalMarks };
  }

  // General Multi-Topic Balanced Sampling with Subset Solver
  const runTrial = (): { selected: QuestionItem[]; currentMarks: number } => {
    const selected: QuestionItem[] = [];
    const usedIds = new Set<string>();
    const paperUsage = new Map<string, number>();

    // Step 1: Bucket candidates by topic
    const topicBuckets = new Map<string, QuestionItem[]>();
    candidates.forEach((q) => {
      const key = q.topic || 'General';
      if (!topicBuckets.has(key)) topicBuckets.set(key, []);
      topicBuckets.get(key)!.push(q);
    });

    for (const bucket of topicBuckets.values()) {
      bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
    }

    const bucketKeys = Array.from(topicBuckets.keys()).sort(() => Math.random() - 0.5);
    let currentMarks = 0;
    const stage1Target = Math.max(0, targetMarks - 12); // leave buffer for exact solver
    let bucketIdx = 0;
    let consecutiveSkips = 0;

    while (currentMarks < stage1Target && bucketKeys.length > 0) {
      const key = bucketKeys[bucketIdx % bucketKeys.length];
      const bucket = topicBuckets.get(key)!;
      const available = bucket.filter((q) => !usedIds.has(q.id));

      if (available.length > 0) {
        const viable = available.filter((q) => currentMarks + (q.marks || 0) <= targetMarks - 2);
        if (viable.length > 0) {
          viable.sort((a, b) => {
            const aUse = paperUsage.get(a.paperId || a.id) || 0;
            const bUse = paperUsage.get(b.paperId || b.id) || 0;
            if (aUse !== bUse) return aUse - bUse;
            return getQuestionPriority(b) - getQuestionPriority(a);
          });
          const pick = viable[0];
          selected.push(pick);
          usedIds.add(pick.id);
          paperUsage.set(pick.paperId || pick.id, (paperUsage.get(pick.paperId || pick.id) || 0) + 1);
          currentMarks += (pick.marks || 0);
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

    // Step 2: Exact Mark Sum Solver for the deficit
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

    const marksTotal = selected.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { selected, currentMarks: marksTotal };
  };

  let bestSelected: QuestionItem[] = [];
  let bestDiff = Infinity;
  let bestMarks = 0;

  for (let trial = 0; trial < 25; trial++) {
    const { selected, currentMarks } = runTrial();
    const diff = Math.abs(currentMarks - targetMarks);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSelected = selected;
      bestMarks = currentMarks;
    }
    if (diff === 0) break;
  }

  const sorted = sortExamQuestionsAuthentic(bestSelected, isMath);
  return { selected: sorted, actualMarks: bestMarks };
}
