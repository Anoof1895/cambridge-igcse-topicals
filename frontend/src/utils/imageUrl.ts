import { QuestionItem } from '../types';

/**
 * Utility for resolving question and mark scheme image URLs.
 * Reads VITE_R2_BASE_URL from Vite environment variables for Cloudflare R2 / CDN hosting.
 * Falls back to local relative paths (e.g. /output/0580/questions/...) when unset.
 */
export const IMAGE_BASE_URL: string = (
  import.meta.env.VITE_R2_BASE_URL ||
  import.meta.env.VITE_R2_PUBLIC_URL ||
  import.meta.env.VITE_IMAGE_BASE_URL ||
  ''
).replace(/\/+$/, '');

/** Normalizes a dataset image path to a root-relative local URL. */
export function getLocalImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Returns the full image URL.
 * - If path is already an absolute URL (http:// or https://), returns it unchanged.
 * - If VITE_R2_BASE_URL is set, prefixes relative paths (e.g. /output/0625/...) with the R2 CDN domain.
 * - If unset or empty, falls back to local relative paths for offline development.
 */
export function getFullImageUrl(path: string | null | undefined): string {
  const cleanPath = getLocalImageUrl(path);
  if (!cleanPath || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // If VITE_R2_BASE_URL is configured, route image requests through the CDN
  if (IMAGE_BASE_URL) {
    return `${IMAGE_BASE_URL}${cleanPath}`;
  }

  // Fallback to local relative paths for offline development
  return cleanPath;
}

/**
 * Universal image resolver supporting both path strings and Question/QuestionItem objects.
 * Safely extracts question image or mark scheme image paths across all naming conventions:
 * - question_image_url, mark_scheme_image_url
 * - questionImagePath, markSchemeImagePath
 * - question_image, mark_scheme_image
 * - image, image_url, crop_path, ms_image, ms_crop_path
 * - reconstructs from question.id (e.g. /output/0580/questions/0580_s25_qp_22_q04.png)
 */
export function resolveImageUrl(
  pathOrQuestion: string | Partial<QuestionItem> | null | undefined,
  subject?: string,
  isMarkScheme: boolean = false
): string {
  if (!pathOrQuestion) {
    if (import.meta.env.DEV) {
      console.warn('[resolveImageUrl] Failed path: received null or empty input', { pathOrQuestion, subject, isMarkScheme });
    }
    return '';
  }

  let rawPath: string = '';

  // 1. If passed an object (Question / QuestionItem)
  if (typeof pathOrQuestion === 'object') {
    const q = pathOrQuestion;
    const subjCode =
      subject ||
      q.subject ||
      (q.id ? q.id.split('_')[0] : '') ||
      '0580';

    if (isMarkScheme) {
      rawPath =
        q.mark_scheme_image_url ||
        q.markSchemeImagePath ||
        q.mark_scheme_image ||
        q.ms_image ||
        q.ms_image_url ||
        q.ms_crop_path ||
        q.ms_image_path ||
        q.mark_scheme_image_path ||
        '';

      // Reconstruct fallback from ID: 0580_s25_qp_22_q04 -> /output/0580/mark_schemes/0580_s25_ms_22_q04.png
      if (!rawPath && q.id) {
        const msId = q.id.replace('_qp_', '_ms_');
        rawPath = `/output/${subjCode}/mark_schemes/${msId}.png`;
      }
    } else {
      rawPath =
        q.question_image_url ||
        q.questionImagePath ||
        q.question_image ||
        q.image ||
        q.image_url ||
        q.crop_path ||
        q.image_path ||
        '';

      // Reconstruct fallback from ID: 0580_s25_qp_22_q04 -> /output/0580/questions/0580_s25_qp_22_q04.png
      if (!rawPath && q.id) {
        rawPath = `/output/${subjCode}/questions/${q.id}.png`;
      }
    }
  } else if (typeof pathOrQuestion === 'string') {
    rawPath = pathOrQuestion.trim();
  }

  if (!rawPath) {
    if (import.meta.env.DEV) {
      console.warn('[resolveImageUrl] Failed path: could not determine image path', pathOrQuestion);
    }
    return '';
  }

  // Handle absolute remote URLs
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return rawPath;
  }

  return getFullImageUrl(rawPath);
}

/** Convenience helper for question image resolution */
export function resolveQuestionImageUrl(
  questionOrPath: string | Partial<QuestionItem> | null | undefined,
  subject?: string
): string {
  return resolveImageUrl(questionOrPath, subject, false);
}

/** Convenience helper for mark scheme image resolution */
export function resolveMarkSchemeImageUrl(
  questionOrPath: string | Partial<QuestionItem> | null | undefined,
  subject?: string
): string {
  return resolveImageUrl(questionOrPath, subject, true);
}
