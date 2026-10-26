import { jsPDF } from 'jspdf';
import { QuestionItem } from '../types';
import { getFullImageUrl, getLocalImageUrl, resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from './imageUrl';
import { calculateExamDurationMinutes, formatDuration } from './examDuration';
import { getQuestionSubject } from './questionClassification';

export interface PDFExportOptions {
  title: string;
  questions: QuestionItem[];
  includeFormalHeader?: boolean; // true = Official Cambridge Cover Header; false = Compact Worksheet mode
  includeSourceTags?: boolean; // defaults to true
  includeHeaderFooter?: boolean; // true = show title rule & footer; false = pure questions
  onProgress?: (current: number, total: number, statusText: string) => void;
}

export type PdfExportOptions = PDFExportOptions;

export interface RowMetrics {
  y: number;
  isWhite: boolean;
  darkPixelCount: number;
  minX: number;
  maxX: number;
  transitions: number;
  hasMidContent: boolean;
}

export interface ContentStrip {
  y0: number;
  y1: number;
  height: number;
  minX: number;
  maxX: number;
  maxTransitions: number;
  midActiveRows: number;
  isAnswerOrMarkStrip: boolean;
}

export interface WhiteGap {
  y0: number;
  y1: number;
  height: number;
  prevStripIndex: number;
  nextStripIndex: number;
}

export interface CanvasStructure {
  width: number;
  height: number;
  rows: RowMetrics[];
  strips: ContentStrip[];
  gaps: WhiteGap[];
}

interface LoadedQuestionCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  structure: CanvasStructure;
}

/**
 * Step 1 & Step 2: Scans horizontal rows across the question canvas and groups non-white rows
 * (merging tiny internal gaps < 8px) into structural ContentStrips and WhiteGaps.
 */
export function analyzeCanvasStructure(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): CanvasStructure {
  if (width <= 0 || height <= 0) {
    return { width, height, rows: [], strips: [], gaps: [] };
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return { width, height, rows: [], strips: [], gaps: [] };
  }

  const data = imageData.data;
  const xMargin = Math.min(6, Math.floor(width * 0.01));
  const transXStart = Math.floor(width * 0.35);
  const transXEnd = Math.floor(width * 0.90);
  const midXStart = Math.floor(width * 0.35);
  const midXEnd = Math.floor(width * 0.78);

  // Pre-pass: Mask out vertical border lines (columns with >80% dark pixels)
  const colDarkCounts = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = xMargin; x < width - xMargin; x++) {
      const idx = rowOffset + x * 4;
      if (data[idx] < 242 || data[idx + 1] < 242 || data[idx + 2] < 242) {
        colDarkCounts[x]++;
      }
    }
  }

  const borderThreshold = Math.floor(height * 0.8);
  const isMaskedColumn = new Uint8Array(width);
  for (let x = xMargin; x < width - xMargin; x++) {
    if (colDarkCounts[x] > borderThreshold) {
      isMaskedColumn[x] = 1;
    }
  }

  const rows: RowMetrics[] = new Array(height);
  const rowWidth = Math.max(1, width - xMargin * 2);
  const whitespaceThreshold = Math.max(2, Math.floor(0.002 * rowWidth));

  // Step 1: Row Analysis Across the Image using per-row ink-count threshold
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    let darkPixelCount = 0;
    let minX = width;
    let maxX = 0;
    let transitions = 0;
    let prevDark = false;
    let midDarkCount = 0;

    for (let x = xMargin; x < width - xMargin; x++) {
      if (isMaskedColumn[x]) continue;

      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r < 242 || g < 242 || b < 242) {
        darkPixelCount++;
      }

      const isDark = r < 220 || g < 220 || b < 220;
      if (isDark) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (x >= midXStart && x <= midXEnd) {
          midDarkCount++;
        }
      }

      if (x >= transXStart && x <= transXEnd) {
        if (prevDark && !isDark) {
          transitions++;
        }
        prevDark = isDark;
      }
    }

    const isWhite = darkPixelCount <= whitespaceThreshold;

    rows[y] = {
      y,
      isWhite,
      darkPixelCount,
      minX,
      maxX,
      transitions,
      hasMidContent: midDarkCount >= 5,
    };
  }

  // Step 2: Group consecutive non-white rows (merging tiny internal white gaps < 10px) into Content Strips
  const rawRuns: Array<{ y0: number; y1: number }> = [];
  let inRun = false;
  let runStart = 0;

  for (let y = 0; y < height; y++) {
    if (!rows[y].isWhite) {
      if (!inRun) {
        inRun = true;
        runStart = y;
      }
    } else if (inRun) {
      rawRuns.push({ y0: runStart, y1: y });
      inRun = false;
    }
  }
  if (inRun) {
    rawRuns.push({ y0: runStart, y1: height });
  }

  const mergedRuns: Array<{ y0: number; y1: number }> = [];
  for (const run of rawRuns) {
    if (mergedRuns.length === 0) {
      mergedRuns.push({ ...run });
    } else {
      const prev = mergedRuns[mergedRuns.length - 1];
      if (run.y0 - prev.y1 < 10) {
        prev.y1 = run.y1;
      } else {
        mergedRuns.push({ ...run });
      }
    }
  }

  const strips: ContentStrip[] = mergedRuns.map((run) => {
    let minX = width;
    let maxX = 0;
    let maxTransitions = 0;
    let midActiveRows = 0;

    for (let y = run.y0; y < run.y1; y++) {
      const rm = rows[y];
      if (rm.minX < minX) minX = rm.minX;
      if (rm.maxX > maxX) maxX = rm.maxX;
      if (rm.transitions > maxTransitions) maxTransitions = rm.transitions;
      if (rm.hasMidContent) midActiveRows++;
    }

    const stripHeight = run.y1 - run.y0;
    // Dotted answer line: high transition count in [0.35w, 0.90w] where the middle span [0.35w, 0.78w]
    // consists only of thin dots (midActiveRows <= 7), or thin standalone dotted strip
    const isDottedLine =
      (maxTransitions >= 14 && midActiveRows <= 7) ||
      (stripHeight <= 10 && maxTransitions >= 12);
    // Indented answer line (e.g. V = ...... cm^3 [1]), centered caption/formula, or standalone [1] / [Total: X] mark
    const isIndentedLine = minX > width * 0.28;

    const isAnswerOrMarkStrip =
      stripHeight <= 55 && (isDottedLine || isIndentedLine);

    return {
      y0: run.y0,
      y1: run.y1,
      height: stripHeight,
      minX,
      maxX,
      maxTransitions,
      midActiveRows,
      isAnswerOrMarkStrip,
    };
  });

  const gaps: WhiteGap[] = [];
  if (strips.length === 0) {
    gaps.push({ y0: 0, y1: height, height, prevStripIndex: -1, nextStripIndex: 0 });
  } else {
    if (strips[0].y0 > 0) {
      gaps.push({
        y0: 0,
        y1: strips[0].y0,
        height: strips[0].y0,
        prevStripIndex: -1,
        nextStripIndex: 0,
      });
    }
    for (let i = 0; i < strips.length - 1; i++) {
      const y0 = strips[i].y1;
      const y1 = strips[i + 1].y0;
      gaps.push({
        y0,
        y1,
        height: y1 - y0,
        prevStripIndex: i,
        nextStripIndex: i + 1,
      });
    }
    const last = strips[strips.length - 1];
    if (last.y1 < height) {
      gaps.push({
        y0: last.y1,
        y1: height,
        height: height - last.y1,
        prevStripIndex: strips.length - 1,
        nextStripIndex: strips.length,
      });
    }
  }

  return { width, height, rows, strips, gaps };
}

/**
 * Step 3: Strip-aware structural page-break selector.
 * - Rule A: Never cuts in the blank working space above an answer line or before dotted answer lines / [1] marks.
 * - Rule B: Keeps short lead-in text prompts (e.g. "(e) The student lowers... as shown in Fig. 1.3") attached to
 *   their diagram when the diagram splits across a page break.
 * - Rule C: Maximizes page fill by picking the lowest valid gap closest to targetCutY (returning bestGap.y1 - 4).
 */
export function findBestSplitY(
  ctx: CanvasRenderingContext2D,
  width: number,
  currentY: number,
  targetCutY: number,
  cachedStructure?: CanvasStructure
): number {
  const imageHeight = cachedStructure ? cachedStructure.height : ctx.canvas.height;
  if (targetCutY >= imageHeight || width <= 0) return Math.min(targetCutY, imageHeight);

  const structure = cachedStructure ?? analyzeCanvasStructure(ctx, width, imageHeight);
  const { rows, strips, gaps } = structure;
  if (strips.length === 0) return targetCutY;

  const minCutY = currentY + Math.min(200, Math.floor((targetCutY - currentY) * 0.4));

  // Rule A validator: never orphan answer lines, calculation answer boxes, or multi-line prompts before their answer lines
  const passesRuleA = (gap: WhiteGap): boolean => {
    const nextIdx = gap.nextStripIndex;
    if (nextIdx >= strips.length) return true;

    const nextStrip = strips[nextIdx];
    // 1. Reject if the strip immediately below the gap is an answer line or mark strip
    if (nextStrip.isAnswerOrMarkStrip) {
      return false;
    }

    // 2. Look at the 2nd (and 3rd) strip below the gap:
    // If the strip above the gap is an unfinished prompt line (!prevStrip.isAnswerOrMarkStrip)
    // and the 2nd strip below the gap is an answer/mark strip, reject splitting inside the prompt block.
    const prevStrip = gap.prevStripIndex >= 0 ? strips[gap.prevStripIndex] : null;
    const secondStrip = nextIdx + 1 < strips.length ? strips[nextIdx + 1] : null;
    const thirdStrip = nextIdx + 2 < strips.length ? strips[nextIdx + 2] : null;

    if (secondStrip && secondStrip.isAnswerOrMarkStrip && nextStrip.height <= 65) {
      if (prevStrip && !prevStrip.isAnswerOrMarkStrip && prevStrip.height <= 65) {
        return false;
      }
    }

    if (
      thirdStrip &&
      thirdStrip.isAnswerOrMarkStrip &&
      nextStrip.height <= 55 &&
      secondStrip &&
      secondStrip.height <= 55 &&
      prevStrip &&
      !prevStrip.isAnswerOrMarkStrip &&
      prevStrip.height <= 65
    ) {
      return false;
    }

    return true;
  };

  // Candidate white gaps in [minCutY, targetCutY] requiring a contiguous >= 20px pure-white seam
  const candidateGaps = gaps.filter((gap) => {
    if (gap.y1 <= minCutY || gap.y0 > targetCutY - 6) return false;
    const effectiveBottom = Math.min(gap.y1, targetCutY);
    const effectiveHeight = effectiveBottom - gap.y0;
    return gap.height >= 20 && effectiveHeight >= 18;
  });

  let validGaps = candidateGaps.filter(passesRuleA);

  // If no gap in [minCutY, targetCutY] passed Rule A (e.g. targetCutY landed inside a tall graph/diagram),
  // expand the upward search all the way above the graph in [currentY + 12, minCutY]
  if (validGaps.length === 0) {
    const higherGaps = gaps.filter(
      (gap) =>
        gap.y1 > currentY + 12 &&
        gap.y0 <= minCutY &&
        gap.height >= 18 &&
        passesRuleA(gap)
    );
    if (higherGaps.length > 0) {
      validGaps = higherGaps;
    }
  }

  // Rule B: Keep Lead-In Prompt With Split Diagram / Graph
  // If targetCutY falls inside a tall diagram/graph strip (diagramStrip.height > 80), and the strip immediately
  // above diagramStrip is a short lead-in text prompt (prevStrip.height <= 75 && !prevStrip.isAnswerOrMarkStrip),
  // do NOT cut in the small gap between prevStrip and diagramStrip—prefer the valid gap above prevStrip.
  const straddledDiagramIdx = strips.findIndex(
    (s) => s.height > 80 && s.y0 < targetCutY && s.y1 > targetCutY
  );
  if (straddledDiagramIdx > 0) {
    let leadInStartIdx = straddledDiagramIdx;
    const prev1 = strips[straddledDiagramIdx - 1];
    if (prev1.height <= 75 && !prev1.isAnswerOrMarkStrip) {
      leadInStartIdx = straddledDiagramIdx - 1;
      // If the lead-in prompt was 2 lines of text separated by a small line gap (< 24px), include the first line too
      if (straddledDiagramIdx >= 2) {
        const prev2 = strips[straddledDiagramIdx - 2];
        if (
          prev2.height <= 55 &&
          !prev2.isAnswerOrMarkStrip &&
          prev1.y0 - prev2.y1 < 24
        ) {
          leadInStartIdx = straddledDiagramIdx - 2;
        }
      }
    }

    if (leadInStartIdx < straddledDiagramIdx) {
      const leadInTopY = strips[leadInStartIdx].y0;
      const gapsAboveLeadIn = validGaps.filter((g) => g.y1 <= leadInTopY);
      if (gapsAboveLeadIn.length > 0) {
        validGaps = gapsAboveLeadIn;
      } else if (leadInTopY - currentY < 130) {
        // The lead-in prompt (e.g. "1 Fig. 1.1 is a speed-time graph...") sits right at the top of the slice
        // with no valid gap above it. Return leadInTopY so orphan protection pushes the whole question to the next page.
        return Math.max(currentY, leadInTopY);
      }
    }
  }

  // Rule C: Maximize Page Fill — Pick Lowest Valid Gap (largest gap.y1), NOT Widest
  if (validGaps.length > 0) {
    const bestGap = validGaps[validGaps.length - 1];
    const cutY = Math.min(targetCutY, bestGap.y1 - 4);
    return Math.max(currentY + 8, cutY);
  }

  // Fallback: Search all the way up to currentY + 12 for any pure-white gap >= 16px not immediately above a dotted line
  const fallbackGaps = gaps.filter((gap) => {
    if (gap.y1 <= currentY + 12 || gap.y0 > targetCutY - 4 || gap.height < 16) return false;
    const nextStrip = gap.nextStripIndex < strips.length ? strips[gap.nextStripIndex] : null;
    if (nextStrip && nextStrip.maxTransitions >= 14 && nextStrip.midActiveRows <= 7) {
      return false;
    }
    return true;
  });

  if (fallbackGaps.length > 0) {
    const bestFallback = fallbackGaps[fallbackGaps.length - 1];
    const cutY = Math.min(targetCutY, bestFallback.y1 - 4);
    return Math.max(currentY + 8, cutY);
  }

  // If targetCutY straddles a tall graph/diagram strip and no gap >= 16px exists above it,
  // return the top of the straddled strip so we never hard-cut through the middle of the graph.
  if (straddledDiagramIdx !== -1 && strips[straddledDiagramIdx].y0 > currentY) {
    return strips[straddledDiagramIdx].y0;
  }

  // Hard-cut fallback: calculate a 5-row moving sum of ink across [minCutY, targetCutY]
  // and cut at the lowest ink valley instead of blindly cutting at targetCutY.
  if (rows && rows.length > 0) {
    const valleyStart = Math.max(currentY + 12, Math.min(minCutY, targetCutY - 5));
    const valleyEnd = Math.min(imageHeight - 3, targetCutY);
    if (valleyEnd >= valleyStart) {
      let bestValleyY = targetCutY;
      let minValleyInk = Infinity;
      for (let y = valleyStart; y <= valleyEnd; y++) {
        let sum5 = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ry = Math.min(imageHeight - 1, Math.max(0, y + dy));
          sum5 += rows[ry]?.darkPixelCount ?? 0;
        }
        if (sum5 <= minValleyInk) {
          minValleyInk = sum5;
          bestValleyY = y;
        }
      }
      return Math.max(currentY + 8, bestValleyY);
    }
  }

  return targetCutY;
}

/**
 * Checks whether a canvas horizontal strip [startY, startY + sliceH) is entirely blank white.
 */
function isSliceEntirelyWhite(
  ctx: CanvasRenderingContext2D,
  width: number,
  startY: number,
  sliceH: number
): boolean {
  if (sliceH <= 0 || width <= 0) return true;
  try {
    const imgData = ctx.getImageData(0, startY, width, sliceH);
    const data = imgData.data;
    for (let y = 0; y < sliceH; y += 2) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x += 4) {
        const idx = rowOffset + x * 4;
        if (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Slices a rectangular region [startY, startY + sliceH) from a source canvas into a JPEG dataUrl (quality 0.88)
 * and immediately frees the temporary slice canvas memory.
 */
function extractCanvasSliceDataUrl(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  startY: number,
  sliceH: number
): string {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = width;
  sliceCanvas.height = sliceH;
  const sliceCtx = sliceCanvas.getContext('2d');
  if (!sliceCtx) {
    sliceCanvas.width = 0;
    sliceCanvas.height = 0;
    return '';
  }
  sliceCtx.fillStyle = '#FFFFFF';
  sliceCtx.fillRect(0, 0, width, sliceH);
  sliceCtx.drawImage(sourceCanvas, 0, startY, width, sliceH, 0, 0, width, sliceH);
  const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.88);
  sliceCanvas.width = 0;
  sliceCanvas.height = 0;
  return dataUrl;
}

/**
 * Loads an image via browser-cached fetch/blob or Image element onto an offscreen white-backed 2D canvas
 * so pixel-level whitespace seam detection can be performed dynamically per page.
 */
async function loadQuestionCanvas(rawUrl: string): Promise<LoadedQuestionCanvas> {
  const fullUrl = getFullImageUrl(rawUrl);
  const localUrl = getLocalImageUrl(rawUrl);
  if (!fullUrl && !localUrl) {
    throw new Error('Empty image URL');
  }

  let imageSourceUrl = '';
  let objectUrlToRevoke: string | null = null;

  // 1. Primary path: fetch as Blob leveraging browser HTTP cache (no forced no-store cache-busters)
  const candidateUrls = Array.from(new Set([fullUrl, localUrl, rawUrl].filter(Boolean)));
  for (const candidate of candidateUrls) {
    try {
      const res = await fetch(candidate, {
        mode: 'cors',
        credentials: 'omit',
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          objectUrlToRevoke = URL.createObjectURL(blob);
          imageSourceUrl = objectUrlToRevoke;
          break;
        }
      }
    } catch {
      // Try next candidate URL
    }
  }

  // 2. Fallback path: direct URL
  if (!imageSourceUrl) {
    imageSourceUrl = fullUrl || localUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!imageSourceUrl.startsWith('blob:') && !imageSourceUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        reject(new Error('Could not create 2D canvas context'));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);

      const structure = analyzeCanvasStructure(ctx, w, h);

      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({ canvas, ctx, width: w, height: h, structure });
    };
    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      reject(new Error(`Failed to load image from: ${fullUrl}`));
    };
    img.src = imageSourceUrl;
  });
}

/**
 * Bounded concurrency sliding-window prefetch pool (default concurrency: 3).
 * Downloads and prepares up to `concurrency` question crops ahead of the current index
 * while preserving strict page order and bounding active offscreen canvas memory.
 */
function createCanvasPrefetchPool(
  urls: (string | null | undefined)[],
  concurrency: number = 3
): (index: number) => Promise<LoadedQuestionCanvas> {
  const inFlight = new Map<number, Promise<LoadedQuestionCanvas>>();
  let nextToStart = 0;

  const enqueueUpTo = (limitIndex: number) => {
    const targetEnd = Math.min(urls.length, limitIndex);
    while (nextToStart < targetEnd) {
      const idx = nextToStart++;
      const u = urls[idx];
      if (u) {
        const p = loadQuestionCanvas(u);
        // Attach no-op catch so pre-fetched rejections don't trigger unhandledrejection before awaited
        p.catch(() => {});
        inFlight.set(idx, p);
      }
    }
  };

  // Prime initial window of `concurrency` items
  enqueueUpTo(concurrency);

  return (index: number): Promise<LoadedQuestionCanvas> => {
    // Advance sliding window so `concurrency` items stay in flight ahead of `index`
    enqueueUpTo(index + concurrency + 1);
    const existing = inFlight.get(index);
    if (existing) {
      inFlight.delete(index);
      return existing;
    }
    const raw = urls[index];
    if (!raw) {
      return Promise.reject(new Error('Empty image URL'));
    }
    return loadQuestionCanvas(raw);
  };
}

function getSubjectFormalTitle(qSample?: QuestionItem): { code: string; name: string } {
  if (!qSample) return { code: '0580', name: 'MATHEMATICS' };
  const subj = getQuestionSubject(qSample);
  if (subj === 'physics' || qSample.subject === '0625') return { code: '0625', name: 'PHYSICS' };
  if (subj === 'chemistry' || qSample.subject === '0620') return { code: '0620', name: 'CHEMISTRY' };
  if (subj === 'biology' || qSample.subject === '0610') return { code: '0610', name: 'BIOLOGY' };
  return { code: '0580', name: 'MATHEMATICS' };
}

/**
 * Formats an authentic Cambridge IGCSE origin header (e.g. "0625/41/M/J/24 Q3")
 */
function formatOriginCitation(q: QuestionItem): string {
  const { code: subjCode } = getSubjectFormalTitle(q);
  const parts = (q.id || '').split('_');
  const paperVar =
    q.paper && q.variant
      ? `${q.paper}${q.variant}`
      : parts[3] || (q.paper ? `${q.paper}` : '');
  const rawSeries = String(q.series || parts[1]?.[0] || '').toLowerCase();
  const seasonLabel =
    rawSeries === 's'
      ? 'M/J'
      : rawSeries === 'w'
      ? 'O/N'
      : rawSeries === 'm'
      ? 'F/M'
      : rawSeries.toUpperCase();
  const yrShort = q.year
    ? String(q.year).slice(-2)
    : parts[1]?.slice(1, 3) || '';
  const qNum =
    q.question_number ??
    q.questionNumber ??
    (parts[4] ? parts[4].replace(/^q0*/i, '') : '');

  if (paperVar && seasonLabel && yrShort) {
    return `${subjCode}/${paperVar}/${seasonLabel}/${yrShort}${qNum ? ` Q${qNum}` : ''}`;
  }
  const paperCodeDisplay = q.paperCode || q.paper_code || (q.paper ? `${subjCode}/P${q.paper}` : subjCode);
  return `${paperCodeDisplay} • ${seasonLabel || q.series || ''} ${q.year || ''}${qNum ? ` Q${qNum}` : ''}`.trim();
}

/**
 * Generates and downloads an authentic, print-ready Cambridge IGCSE Question Paper PDF.
 * Uses pure white background, crisp 100% black text, and minimalist line borders.
 */
export async function generateQuestionPaperPDF({
  title,
  questions,
  includeFormalHeader = true,
  includeSourceTags = true,
  includeHeaderFooter = true,
  onProgress,
}: PDFExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 15;
  const marginBottom = includeHeaderFooter ? 16 : 15;
  const printableWidth = pageWidth - marginX * 2; // 180mm

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const sampleQ = questions[0];
  const { code: subjectCode, name: subjectName } = getSubjectFormalTitle(sampleQ);
  const isMath = subjectCode === '0580';

  // Check calculator restrictions
  const hasNonCalcQuestions = questions.some((q) => q.calculator_allowed === false);
  const allNonCalc = questions.every((q) => q.calculator_allowed === false);
  const isNonCalculatorExam = isMath && (allNonCalc || hasNonCalcQuestions);

  // Compute duration
  const isMcqOnly = questions.length > 0 && questions.every((q) => q.is_mcq);
  const timeAllowedMins = calculateExamDurationMinutes(totalMarks, subjectCode, {
    isMcqOnly,
    paper: sampleQ?.paper,
  });
  const timeAllowedStr = formatDuration(timeAllowedMins);

  let cursorY = marginTop;

  if (includeFormalHeader) {
    // --- Page 1 Authentic Cambridge IGCSE Examination Header ---
    // 1. Institution Header
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION', marginX, cursorY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Cambridge IGCSE™', marginX + printableWidth - doc.getTextWidth('Cambridge IGCSE™'), cursorY + 3.5);

    cursorY += 7;

    // 2. Subject Title & Code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${subjectName} ${subjectCode}`, marginX, cursorY + 5);

    // 3. Mock Paper Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    doc.text(truncatedTitle, marginX, cursorY + 11);

    // 4. Metadata Bar (Time allowed, Total marks, Date)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(
      `Time allowed: ${timeAllowedStr}   |   Total Marks: ${totalMarks}   |   Date: ${dateStr}`,
      marginX,
      cursorY + 17
    );

    cursorY += 21;

    // 5. Candidate Info Box (Clean 0.3mm minimalist outline)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, cursorY, printableWidth, 14);

    // Candidate Name line
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CANDIDATE NAME:', marginX + 3, cursorY + 5.5);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(marginX + 33, cursorY + 6.5, marginX + 94, cursorY + 6.5);

    // Centre Number boxes
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CENTRE NUMBER:', marginX + 98, cursorY + 5.5);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    let boxX = marginX + 130;
    for (let b = 0; b < 5; b++) {
      doc.rect(boxX + b * 5.5, cursorY + 2, 4.5, 5);
    }

    // Candidate Number boxes
    doc.text('CANDIDATE NUMBER:', marginX + 98, cursorY + 11.5);
    boxX = marginX + 135;
    for (let b = 0; b < 4; b++) {
      doc.rect(boxX + b * 5.5, cursorY + 8, 4.5, 5);
    }

    cursorY += 17;

    // 6. Prominent Calculator Notice Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(isNonCalculatorExam ? 0.45 : 0.25);
    doc.rect(marginX, cursorY, printableWidth, 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    if (isNonCalculatorExam) {
      doc.setTextColor(0, 0, 0);
      doc.text('CALCULATORS: Calculators must NOT be used in this paper.', marginX + 3, cursorY + 4.5);
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text('CALCULATORS: A scientific calculator should be used where appropriate.', marginX + 3, cursorY + 4.5);
    }

    cursorY += 9.5;

    // 7. Instructions Box (Official Cambridge examination rubrics)
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.25);
    doc.rect(marginX, cursorY, printableWidth, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('INSTRUCTIONS', marginX + 3, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('• Answer all questions.', marginX + 3, cursorY + 8);
    doc.text('• Use a black or dark blue pen. You may use an HB pencil for any diagrams or graphs.', marginX + 3, cursorY + 11.5);
    doc.text('• Write your name, centre number and candidate number in the boxes at the top of the page.', marginX + 3, cursorY + 15);
    doc.text('• Write your answer to each question in the space provided. Do not use an erasable pen or correction fluid.', marginX + 3, cursorY + 18.5);
    doc.text('• The number of marks for each question or part question is shown in brackets [ ]. Show all necessary working.', marginX + 3, cursorY + 22);

    cursorY += 27;

    // 8. Solid Black Rule Separator (1.5pt line)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY, marginX + printableWidth, cursorY);

    cursorY += 6;
  } else if (includeHeaderFooter) {
    // --- Compact Worksheet Mode ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    const compactTitle = title.length > 55 ? title.substring(0, 52) + '...' : title;
    doc.text(compactTitle, marginX, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    const metaStr = `Total Marks: ${totalMarks}  |  Time: ${timeAllowedStr}`;
    doc.text(metaStr, marginX + printableWidth - doc.getTextWidth(metaStr), cursorY + 4);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(marginX, cursorY + 6.5, marginX + printableWidth, cursorY + 6.5);

    cursorY += 10;
  }

  // --- Questions Iteration (with bounded concurrency: 3 prefetch pool) ---
  const qpUrls = questions.map((q) => resolveQuestionImageUrl(q));
  const getNextQuestionCanvas = createCanvasPrefetchPool(qpUrls, 3);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumberLabel = `Question ${i + 1}`;
    const qOriginMeta = formatOriginCitation(q);
    const marksLabel = `[${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`;

    if (onProgress) {
      onProgress(i + 1, questions.length, `Formatting Question ${i + 1} of ${questions.length}...`);
    }

    let qCanvasToRelease: HTMLCanvasElement | null = null;

    try {
      const { canvas: qCanvas, ctx: qCtx, width: qW, height: qH, structure: qStructure } = await getNextQuestionCanvas(i);
      qCanvasToRelease = qCanvas;
      const naturalWidthMm = Math.min(180, (qW / 150) * 25.4);
      const pxPerMm = qW / naturalWidthMm;
      const fullImgHeightMm = qH / pxPerMm;
      const headerBlockMm = 8;

      // If on a partially used page and the question doesn't fit:
      // Move to a fresh page if remaining space is < 75mm OR if the whole question fits on a single full page.
      const remainingPageMm = pageHeight - marginBottom - cursorY;
      const fullPageAvailImgMm = pageHeight - marginBottom - marginTop - headerBlockMm - 4;
      if (cursorY > marginTop && headerBlockMm + fullImgHeightMm > remainingPageMm) {
        if (remainingPageMm < 75 || fullImgHeightMm <= fullPageAvailImgMm) {
          doc.addPage();
          cursorY = marginTop;
        }
      }

      let currentY = 0;
      let sIdx = 0;

      while (currentY < qH) {
        const isContinuation = sIdx > 0;
        if (isContinuation) {
          doc.addPage();
          cursorY = marginTop;
        }

        const availImgHeightMm = Math.max(40, pageHeight - marginBottom - cursorY - headerBlockMm - 4);
        const maxSlicePx = Math.floor(availImgHeightMm * pxPerMm);
        const remainingPx = qH - currentY;

        let nextCutY: number;
        if (remainingPx <= maxSlicePx) {
          nextCutY = qH;
        } else {
          const targetCutY = currentY + maxSlicePx;
          const bestCutY = findBestSplitY(qCtx, qW, currentY, targetCutY, qStructure);
          const minOrphanPx = Math.max(120, Math.floor(45 * pxPerMm));

          // Orphan protection: if starting on a partially used page and the only valid seam above a graph/diagram
          // leaves less than minOrphanPx (120px / 35mm–45mm), push the entire question to the start of the next page
          if (sIdx === 0 && cursorY > marginTop && bestCutY - currentY < minOrphanPx) {
            doc.addPage();
            cursorY = marginTop;
            continue;
          }

          nextCutY = bestCutY > currentY + 16 ? bestCutY : targetCutY;
        }

        const sliceHeightPx = nextCutY - currentY;
        if (sliceHeightPx <= 12) break;

        // Avoid emitting a blank trailing continuation page if the remaining strip is pure white
        if (nextCutY === qH && sIdx > 0 && isSliceEntirelyWhite(qCtx, qW, currentY, sliceHeightPx)) {
          break;
        }

        const sliceDataUrl = extractCanvasSliceDataUrl(qCanvas, qW, currentY, sliceHeightPx);
        const imgW = naturalWidthMm;
        const imgH = sliceHeightPx / pxPerMm;
        const currentLabel = isContinuation ? `${qNumberLabel} (continued)` : qNumberLabel;

        // Draw Question Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text(currentLabel, marginX, cursorY + 4);

        if (includeSourceTags && !isContinuation) {
          const numW = doc.getTextWidth(currentLabel);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(90, 90, 90);
          doc.text(qOriginMeta, marginX + numW + 4, cursorY + 4);
        }

        // Marks on right
        if (!isContinuation) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(marksLabel, marginX + printableWidth - doc.getTextWidth(marksLabel), cursorY + 4);
        }

        // Separator rule
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.25);
        doc.line(marginX, cursorY + 6, marginX + printableWidth, cursorY + 6);

        cursorY += 8;

        // Draw Question Image aligned left at natural DPI scale (capped at 1.0x)
        const imgX = marginX;
        doc.addImage(sliceDataUrl, 'JPEG', imgX, cursorY, imgW, imgH, undefined, 'FAST');

        cursorY += imgH + 9;
        currentY = nextCutY;
        sIdx++;
      }
    } catch (err) {
      console.error(`Error embedding question ${q.id}:`, err);
      if (cursorY + 20 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${qNumberLabel} [Image could not be rendered: ${q.id}]`, marginX, cursorY + 4);
      cursorY += 15;
    } finally {
      if (qCanvasToRelease) {
        qCanvasToRelease.width = 0;
        qCanvasToRelease.height = 0;
      }
    }
  }

  // --- Add Page Number Footers ---
  if (includeHeaderFooter) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 11, marginX + printableWidth, pageHeight - 11);
      doc.text('Cambridge Assessment International Education — IGCSE Practice Platform', marginX, pageHeight - 7);
      const pageNumStr = `Page ${p} of ${totalPages}`;
      doc.text(pageNumStr, marginX + printableWidth - doc.getTextWidth(pageNumStr), pageHeight - 7);

      // On final page, print official end mark
      if (p === totalPages) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const endStr = '— END OF QUESTION PAPER —';
        const endW = doc.getTextWidth(endStr);
        const endY = Math.min(cursorY + 10, pageHeight - 14);
        if (endY > cursorY) {
          doc.text(endStr, marginX + (printableWidth - endW) / 2, endY);
        }
      }
    }
  }

  // Download PDF
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qp.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads the companion Cambridge IGCSE Mark Scheme PDF.
 */
export async function generateMarkSchemePDF({
  title,
  questions,
  includeFormalHeader = true,
  includeSourceTags = true,
  includeHeaderFooter = true,
  onProgress,
}: PDFExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 15;
  const marginBottom = includeHeaderFooter ? 16 : 15;
  const printableWidth = pageWidth - marginX * 2;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const sampleQ = questions[0];
  const { code: subjectCode, name: subjectName } = getSubjectFormalTitle(sampleQ);

  let cursorY = marginTop;

  if (includeFormalHeader) {
    // --- Page 1 Formal Exam Mark Scheme Header ---
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION', marginX, cursorY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Cambridge IGCSE™ — MARK SCHEME', marginX + printableWidth - doc.getTextWidth('Cambridge IGCSE™ — MARK SCHEME'), cursorY + 3.5);

    cursorY += 7;

    // Exam Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${subjectName} ${subjectCode}`, marginX, cursorY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const truncatedTitle = title.length > 55 ? title.substring(0, 52) + '...' : title;
    doc.text(`Mark Scheme: ${truncatedTitle}`, marginX, cursorY + 11);

    // Metadata Bar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Questions: ${questions.length}   |   Maximum Mark: ${totalMarks}   |   Published: ${dateStr}`, marginX, cursorY + 17);

    cursorY += 21;

    // Generic Marking Guidance Box
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.25);
    doc.rect(marginX, cursorY, printableWidth, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('GENERIC MARKING PRINCIPLES', marginX + 3, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('• Marks must be awarded in line with the specific content points and marking criteria outlined.', marginX + 3, cursorY + 7.5);
    doc.text('• Method marks (M) are awarded for correct strategy. Accuracy marks (A) require prior method.', marginX + 3, cursorY + 10.5);
    doc.text('• In science papers, allow error carried forward (ECF) where intermediate values are consistently used.', marginX + 3, cursorY + 13.5);

    cursorY += 18;

    // Solid Rule Separator
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY, marginX + printableWidth, cursorY);

    cursorY += 6;
  } else if (includeHeaderFooter) {
    // --- Worksheet Mode Mark Scheme Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    const compactTitle = `${title.length > 50 ? title.substring(0, 47) + '...' : title} — Mark Scheme`;
    doc.text(compactTitle, marginX, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    const metaStr = `Questions: ${questions.length}  |  Total Marks: ${totalMarks}`;
    doc.text(metaStr, marginX + printableWidth - doc.getTextWidth(metaStr), cursorY + 4);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(marginX, cursorY + 6.5, marginX + printableWidth, cursorY + 6.5);

    cursorY += 10;
  }

  // --- Mark Scheme Questions Iteration (with bounded concurrency: 3 prefetch pool) ---
  const msUrls = questions.map((q) => resolveMarkSchemeImageUrl(q));
  const getNextMsCanvas = createCanvasPrefetchPool(msUrls, 3);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumberLabel = `Question ${i + 1} Mark Scheme`;
    const qOriginMeta = formatOriginCitation(q);
    const marksLabel = `[${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`;

    if (onProgress) {
      onProgress(i + 1, questions.length, `Formatting Mark Scheme for Question ${i + 1}...`);
    }

    const rawMarkSchemePath = msUrls[i];

    // If MCQ with answer letter known, render quick answer pill if image is missing
    if (!rawMarkSchemePath) {
      if (cursorY + 20 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const answerNote = q.correct_answer ? `Correct Answer: [ ${q.correct_answer} ]` : '(Mark scheme row not available in source)';
      doc.text(`${qNumberLabel} — ${answerNote}`, marginX, cursorY + 4);
      cursorY += 14;
      continue;
    }

    let msCanvasToRelease: HTMLCanvasElement | null = null;

    try {
      const { canvas: msCanvas, ctx: msCtx, width: msW, height: msH, structure: msStructure } = await getNextMsCanvas(i);
      msCanvasToRelease = msCanvas;
      const naturalWidthMm = Math.min(180, (msW / 150) * 25.4);
      const pxPerMm = msW / naturalWidthMm;
      const fullImgHeightMm = msH / pxPerMm;
      const headerBlockMm = 8;

      const remainingPageMm = pageHeight - marginBottom - cursorY;
      const fullPageAvailImgMm = pageHeight - marginBottom - marginTop - headerBlockMm - 4;
      if (cursorY > marginTop && headerBlockMm + fullImgHeightMm > remainingPageMm) {
        if (remainingPageMm < 65 || fullImgHeightMm <= fullPageAvailImgMm) {
          doc.addPage();
          cursorY = marginTop;
        }
      }

      let currentY = 0;
      let sIdx = 0;

      while (currentY < msH) {
        const isContinuation = sIdx > 0;
        if (isContinuation) {
          doc.addPage();
          cursorY = marginTop;
        }

        const availImgHeightMm = Math.max(40, pageHeight - marginBottom - cursorY - headerBlockMm - 4);
        const maxSlicePx = Math.floor(availImgHeightMm * pxPerMm);
        const remainingPx = msH - currentY;

        let nextCutY: number;
        if (remainingPx <= maxSlicePx) {
          nextCutY = msH;
        } else {
          const targetCutY = currentY + maxSlicePx;
          const bestCutY = findBestSplitY(msCtx, msW, currentY, targetCutY, msStructure);
          const minOrphanPx = Math.max(120, Math.floor(40 * pxPerMm));

          if (sIdx === 0 && cursorY > marginTop && bestCutY - currentY < minOrphanPx) {
            doc.addPage();
            cursorY = marginTop;
            continue;
          }

          nextCutY = bestCutY > currentY + 16 ? bestCutY : targetCutY;
        }

        const sliceHeightPx = nextCutY - currentY;
        if (sliceHeightPx <= 12) break;

        if (nextCutY === msH && sIdx > 0 && isSliceEntirelyWhite(msCtx, msW, currentY, sliceHeightPx)) {
          break;
        }

        const sliceDataUrl = extractCanvasSliceDataUrl(msCanvas, msW, currentY, sliceHeightPx);
        const imgW = naturalWidthMm;
        const imgH = sliceHeightPx / pxPerMm;
        const currentLabel = isContinuation ? `${qNumberLabel} (continued)` : qNumberLabel;

        // Draw MS Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text(currentLabel, marginX, cursorY + 4);

        if (includeSourceTags && !isContinuation) {
          const msNumW = doc.getTextWidth(currentLabel);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(90, 90, 90);
          doc.text(qOriginMeta, marginX + msNumW + 4, cursorY + 4);
        }

        // Marks on right
        if (!isContinuation) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(0, 0, 0);
          doc.text(marksLabel, marginX + printableWidth - doc.getTextWidth(marksLabel), cursorY + 4);
        }

        // Separator rule
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.25);
        doc.line(marginX, cursorY + 6, marginX + printableWidth, cursorY + 6);

        cursorY += 8;

        // Draw MS Image aligned left at natural DPI scale (capped at 1.0x)
        const imgX = marginX;
        doc.addImage(sliceDataUrl, 'JPEG', imgX, cursorY, imgW, imgH, undefined, 'FAST');

        cursorY += imgH + 9;
        currentY = nextCutY;
        sIdx++;
      }
    } catch (err) {
      console.error(`Error embedding MS for ${q.id}:`, err);
      if (cursorY + 18 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${qNumberLabel} [Image could not be rendered: ${q.id}]`, marginX, cursorY + 4);
      cursorY += 14;
    } finally {
      if (msCanvasToRelease) {
        msCanvasToRelease.width = 0;
        msCanvasToRelease.height = 0;
      }
    }
  }

  // --- Add Page Number Footers ---
  if (includeHeaderFooter) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 11, marginX + printableWidth, pageHeight - 11);
      doc.text('Cambridge Assessment International Education — Mark Scheme', marginX, pageHeight - 7);
      const pageNumStr = `Page ${p} of ${totalPages}`;
      doc.text(pageNumStr, marginX + printableWidth - doc.getTextWidth(pageNumStr), pageHeight - 7);

      if (p === totalPages) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const endStr = '— END OF MARK SCHEME —';
        const endW = doc.getTextWidth(endStr);
        const endY = Math.min(cursorY + 10, pageHeight - 14);
        if (endY > cursorY) {
          doc.text(endStr, marginX + (printableWidth - endW) / 2, endY);
        }
      }
    }
  }

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_ms.pdf`;
  doc.save(filename);
}
