import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileQuestion,
  Maximize2,
  X,
  Pencil,
  PenLine,
  Highlighter,
  Eraser,
  Trash2,
  Type,
  Undo2,
  Contrast
} from 'lucide-react';
import { Subject } from '../types';
import { getFullImageUrl, getLocalImageUrl } from '../utils/imageUrl';
import { useTheme } from '../context/ThemeContext';
import { getCanonicalSubjectTheme } from '../utils/subjectTheme';

// Module-scoped in-memory LRU cache for annotations across question navigation & view mode toggles
// Kept purely in RAM (max 8 questions per session); zero localStorage, sessionStorage, or backend persistence
const MAX_CACHE_ENTRIES = 8;
const MAX_UNDO_SNAPSHOTS = 3;
const inMemoryDrawingCache = new Map<string, HTMLCanvasElement>();

function touchAndEnforceLRU<K, V>(map: Map<K, V>, key: K, value: V, limit: number = MAX_CACHE_ENTRIES) {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
  while (map.size > limit) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    } else {
      break;
    }
  }
}

export interface TextAnnotation {
  id: string;
  text: string;
  xPercent: number; // 0 to 100 (% of image width)
  yPercent: number; // 0 to 100 (% of image height)
  fontSize: number; // base font size in px
}

const inMemoryTextCache = new Map<string, TextAnnotation[]>();

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text';
type BrushSizeTier = 'fine' | 'medium' | 'bold';

const SIZE_CONFIG: Record<BrushSizeTier, {
  label: string;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  fontSize: number;
  dotClass: string;
}> = {
  fine: {
    label: 'Fine',
    penWidth: 2,
    highlighterWidth: 12,
    eraserWidth: 14,
    fontSize: 13,
    dotClass: 'w-1.5 h-1.5',
  },
  medium: {
    label: 'Medium',
    penWidth: 4,
    highlighterWidth: 20,
    eraserWidth: 22,
    fontSize: 16,
    dotClass: 'w-2.5 h-2.5',
  },
  bold: {
    label: 'Bold',
    penWidth: 7,
    highlighterWidth: 30,
    eraserWidth: 32,
    fontSize: 20,
    dotClass: 'w-3.5 h-3.5',
  },
};

const HIGHLIGHTER_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><polygon points='4,2 14,2 10,18 0,18' fill='rgba(255,235,59,0.3)' stroke='%23facc15' stroke-width='1.5' stroke-dasharray='2,2'/></svg>") 2 2, default`;

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='%23f43f5e' stroke-width='2' stroke-dasharray='3 2'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E") 12 12, crosshair`;

function getSubjectPenColor(
  activeSubject?: Subject,
  badgeColor?: string,
  isDarkPaperActive: boolean = false
): string {
  if (isDarkPaperActive) {
    if (activeSubject === 'mathematics' || badgeColor === 'purple' || badgeColor === 'amber') return '#C084FC';
    if (activeSubject === 'physics' || badgeColor === 'blue' || badgeColor === 'indigo') return '#60A5FA';
    if (activeSubject === 'biology' || badgeColor === 'emerald') return '#4ADE80';
    if (activeSubject === 'chemistry' || badgeColor === 'orange' || badgeColor === 'cyan') return '#FB923C';
    return '#38BDF8';
  }
  if (activeSubject === 'mathematics' || badgeColor === 'purple' || badgeColor === 'amber') return '#7E22CE';
  if (activeSubject === 'physics' || badgeColor === 'blue' || badgeColor === 'indigo') return '#1D4ED8';
  if (activeSubject === 'biology' || badgeColor === 'emerald') return '#15803D';
  if (activeSubject === 'chemistry' || badgeColor === 'orange' || badgeColor === 'cyan') return '#C2410C';
  return '#0F172A';
}

function formatCitationFromId(questionId?: string, explicitCitation?: string): string | null {
  if (explicitCitation && explicitCitation.trim()) return explicitCitation.trim();
  if (!questionId) return null;
  const cleanId = questionId.replace(/-ms$/i, '');
  // e.g. 0625_s24_qp_41_q03 -> 0625/41/M/J/24 Q3
  const parts = cleanId.split('_');
  if (parts.length >= 4) {
    const subj = parts[0];
    const seriesYr = parts[1]; // e.g. s24, w23, m25
    const paperVar = parts[3]; // e.g. 41, 22
    const qRaw = parts[4] ? parts[4].replace(/^q0*/i, '') : '';
    const seasonCode = seriesYr?.[0]?.toLowerCase();
    const yr = seriesYr?.slice(1) || '';
    const seasonStr =
      seasonCode === 's'
        ? 'M/J'
        : seasonCode === 'w'
        ? 'O/N'
        : seasonCode === 'm'
        ? 'F/M'
        : (seasonCode || '').toUpperCase();
    return `${subj}/${paperVar}/${seasonStr}/${yr}${qRaw ? ` Q${qRaw}` : ''}`;
  }
  return cleanId;
}

interface ImageCanvasProps {
  src: string | null;
  title: string;
  badgeText?: string;
  badgeColor?: 'cyan' | 'emerald' | 'indigo' | 'amber' | 'purple' | 'blue' | 'orange';
  extraBadge?: React.ReactNode;
  placeholderTitle?: string;
  placeholderMessage?: string;
  children?: React.ReactNode;
  enableAnnotation?: boolean;
  questionId?: string;
  paperCitation?: string;
  activeSubject?: Subject;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  src,
  title,
  badgeText,
  badgeColor = 'cyan',
  extraBadge,
  placeholderTitle = 'No image available',
  placeholderMessage = 'Mark scheme for this question is not available in the sample paper.',
  children,
  enableAnnotation = false,
  questionId,
  paperCitation,
  activeSubject,
}) => {
  const { theme, darkPaper, toggleDarkPaper, isDarkPaperActive } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const cdnSrc = getFullImageUrl(src);
  const localSrc = getLocalImageUrl(src);
  const baseResolvedSrc = useLocalFallback ? localSrc : cdnSrc;
  const resolvedSrc = useMemo(() => {
    if (!baseResolvedSrc) return '';
    if (retryCount === 0) return baseResolvedSrc;
    const sep = baseResolvedSrc.includes('?') ? '&' : '?';
    return `${baseResolvedSrc}${sep}retry=${retryCount}`;
  }, [baseResolvedSrc, retryCount]);

  const citationDisplay = useMemo(
    () => formatCitationFromId(questionId, paperCitation),
    [questionId, paperCitation]
  );

  const handleRetryImage = useCallback(() => {
    setHasError(false);
    setUseLocalFallback(false);
    setIsImageLoading(true);
    setRetryCount((prev) => prev + 1);
  }, []);

  // Annotation Tooling State
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [brushSize, setBrushSize] = useState<BrushSizeTier>('fine');
  const brushSizeRef = useRef<BrushSizeTier>(brushSize);
  brushSizeRef.current = brushSize;

  const defaultSubjectColor = useMemo(
    () => getSubjectPenColor(activeSubject, badgeColor, isDarkPaperActive),
    [activeSubject, badgeColor, isDarkPaperActive]
  );
  const penPaletteSwatches = useMemo(
    () =>
      isDarkPaperActive
        ? [defaultSubjectColor, '#F8FAFC', '#FACC15', '#38BDF8']
        : [defaultSubjectColor, '#0F172A', '#DC2626', '#1D4ED8'],
    [defaultSubjectColor, isDarkPaperActive]
  );
  const [penColor, setPenColor] = useState<string>(defaultSubjectColor);
  const penColorRef = useRef<string>(penColor);
  penColorRef.current = penColor;

  useEffect(() => {
    setPenColor(defaultSubjectColor);
  }, [defaultSubjectColor]);

  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>(() => {
    const cacheKey = questionId || src;
    return cacheKey && inMemoryTextCache.has(cacheKey) ? inMemoryTextCache.get(cacheKey)! : [];
  });
  const [editingItem, setEditingItem] = useState<TextAnnotation | null>(null);
  const editingItemRef = useRef<TextAnnotation | null>(null);
  editingItemRef.current = editingItem;
  const [editingInLightbox, setEditingInLightbox] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightboxImgRef = useRef<HTMLImageElement>(null);
  const lightboxCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const prevQuestionIdRef = useRef<string | undefined>(questionId);
  const strokeHistoryRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);

  const handleImageError = () => {
    setIsImageLoading(false);
    if (import.meta.env.DEV && !useLocalFallback && localSrc && localSrc !== cdnSrc) {
      setUseLocalFallback(true);
      setIsImageLoading(true);
    } else {
      setHasError(true);
    }
  };

  // Restore drawing from in-memory LRU cache (or clear canvas if unannotated)
  const restoreFromCache = useCallback((targetCanvas: HTMLCanvasElement | null) => {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const cacheKey = questionId || src;
    const offscreen = cacheKey ? inMemoryDrawingCache.get(cacheKey) : undefined;
    if (!offscreen || offscreen.width === 0 || offscreen.height === 0) {
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      return;
    }

    if (cacheKey) {
      touchAndEnforceLRU(inMemoryDrawingCache, cacheKey, offscreen);
    }

    if (targetCanvas.width !== offscreen.width || targetCanvas.height !== offscreen.height) {
      targetCanvas.width = offscreen.width;
      targetCanvas.height = offscreen.height;
    }
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, [questionId, src]);

  // Synchronize drawn bitmap to in-memory offscreen LRU cache and other canvas (main or lightbox)
  const syncDrawingCanvases = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const cacheKey = questionId || src;
    if (!cacheKey || sourceCanvas.width === 0 || sourceCanvas.height === 0) return;

    let offscreen = inMemoryDrawingCache.get(cacheKey);
    if (!offscreen) {
      offscreen = document.createElement('canvas');
    }
    if (offscreen.width !== sourceCanvas.width || offscreen.height !== sourceCanvas.height) {
      offscreen.width = sourceCanvas.width;
      offscreen.height = sourceCanvas.height;
    }
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(sourceCanvas, 0, 0);
    }
    touchAndEnforceLRU(inMemoryDrawingCache, cacheKey, offscreen);

    const otherCanvas = sourceCanvas === canvasRef.current ? lightboxCanvasRef.current : canvasRef.current;
    if (otherCanvas) {
      if (otherCanvas.width !== sourceCanvas.width || otherCanvas.height !== sourceCanvas.height) {
        otherCanvas.width = sourceCanvas.width;
        otherCanvas.height = sourceCanvas.height;
      }
      const otherCtx = otherCanvas.getContext('2d');
      if (otherCtx) {
        otherCtx.clearRect(0, 0, otherCanvas.width, otherCanvas.height);
        otherCtx.drawImage(sourceCanvas, 0, 0);
      }
    }
  }, [questionId, src]);

  // Undo last drawn stroke
  const handleUndo = useCallback(() => {
    if (strokeHistoryRef.current.length === 0) return;
    const previousSnapshot = strokeHistoryRef.current.pop();
    if (!previousSnapshot) return;

    setCanUndo(strokeHistoryRef.current.length > 0);

    const activeCanvas = isLightboxOpen ? lightboxCanvasRef.current : canvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(previousSnapshot, 0, 0);
        syncDrawingCanvases(activeCanvas);
      }
    }
  }, [isLightboxOpen, syncDrawingCanvases]);

  // Commit and save text annotation
  const commitEditingText = useCallback(() => {
    const current = editingItemRef.current;
    if (!current) return;

    const trimmed = current.text.trim();
    const cacheKey = questionId || src;

    if (trimmed.length === 0) {
      setTextAnnotations((prev) => {
        const next = prev.filter((item) => item.id !== current.id);
        if (cacheKey) {
          touchAndEnforceLRU(inMemoryTextCache, cacheKey, next);
        }
        return next;
      });
    } else {
      setTextAnnotations((prev) => {
        const idx = prev.findIndex((item) => item.id === current.id);
        let next: TextAnnotation[];
        if (idx >= 0) {
          next = prev.map((item) => (item.id === current.id ? { ...current, text: current.text } : item));
        } else {
          next = [...prev, { ...current, text: current.text }];
        }
        if (cacheKey) {
          touchAndEnforceLRU(inMemoryTextCache, cacheKey, next);
        }
        return next;
      });
    }

    setEditingItem(null);
    editingItemRef.current = null;
  }, [questionId, src]);

  const deleteAnnotation = useCallback((id: string) => {
    if (editingItemRef.current?.id === id) {
      setEditingItem(null);
      editingItemRef.current = null;
    }
    setTextAnnotations((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const cacheKey = questionId || src;
      if (cacheKey) {
        touchAndEnforceLRU(inMemoryTextCache, cacheKey, next);
      }
      return next;
    });
  }, [questionId, src]);

  const startEditing = useCallback((item: TextAnnotation, isLightbox: boolean) => {
    if (editingItemRef.current && editingItemRef.current.id !== item.id) {
      commitEditingText();
    }
    const copy = { ...item };
    editingItemRef.current = copy;
    setEditingInLightbox(isLightbox);
    setEditingItem(copy);
  }, [commitEditingText]);

  const handleCanvasClickForText = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    isLightbox: boolean
  ) => {
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    if (editingItemRef.current) {
      commitEditingText();
    }

    // Relative percentage coordinates within the canvas/image bounds
    const xPercent = Math.max(0, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    const config = SIZE_CONFIG[brushSizeRef.current];

    const newItem: TextAnnotation = {
      id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: '',
      xPercent,
      yPercent,
      fontSize: config.fontSize,
    };
    editingItemRef.current = newItem;
    setEditingInLightbox(isLightbox);
    setEditingItem(newItem);
  }, [commitEditingText]);

  const switchTool = (tool: ToolType) => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setCurrentTool(tool);
  };

  const toggleAnnotating = () => {
    if (isAnnotating && editingItemRef.current) {
      commitEditingText();
    }
    setIsAnnotating((prev) => !prev);
  };

  const handleBrushSizeChange = (tier: BrushSizeTier) => {
    setBrushSize(tier);
    if (editingItemRef.current) {
      const updated = {
        ...editingItemRef.current,
        fontSize: SIZE_CONFIG[tier].fontSize,
      };
      editingItemRef.current = updated;
      setEditingItem(updated);
    }
  };

  const MAX_CANVAS_PIXELS = 5_000_000;

  // Sync main canvas buffer width & height to natural image dimensions (capped at 5 MP to prevent memory spikes)
  const syncCanvasDimensions = useCallback(() => {
    if (isDrawingRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const w = img.naturalWidth || img.clientWidth;
    const h = img.naturalHeight || img.clientHeight;
    if (w > 0 && h > 0) {
      let targetW = w;
      let targetH = h;
      const totalPixels = w * h;
      if (totalPixels > MAX_CANVAS_PIXELS) {
        const scale = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
        targetW = Math.round(w * scale);
        targetH = Math.round(h * scale);
      }
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      restoreFromCache(canvas);
    }
  }, [restoreFromCache]);

  const syncCanvasDimensionsRef = useRef(syncCanvasDimensions);
  syncCanvasDimensionsRef.current = syncCanvasDimensions;

  const handleClearCanvas = () => {
    setEditingItem(null);
    editingItemRef.current = null;
    setTextAnnotations([]);
    strokeHistoryRef.current = [];
    setCanUndo(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    if (lightboxCanvasRef.current) {
      const ctx = lightboxCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, lightboxCanvasRef.current.width, lightboxCanvasRef.current.height);
      }
    }
    const cacheKey = questionId || src;
    if (cacheKey) {
      inMemoryDrawingCache.delete(cacheKey);
      inMemoryTextCache.delete(cacheKey);
    }
  };

  // Preserve annotations in the 25-question LRU cache across Prev/Next question navigation;
  // only reset the live canvas view and restore any cached annotations for the incoming question.
  useEffect(() => {
    if (prevQuestionIdRef.current && prevQuestionIdRef.current !== questionId) {
      strokeHistoryRef.current = [];
      setCanUndo(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      if (lightboxCanvasRef.current) {
        const ctx = lightboxCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, lightboxCanvasRef.current.width, lightboxCanvasRef.current.height);
        }
      }
      setEditingItem(null);
      editingItemRef.current = null;
    }
    prevQuestionIdRef.current = questionId;
    syncCanvasDimensionsRef.current();

    const cacheKey = questionId || src;
    if (cacheKey && inMemoryTextCache.has(cacheKey)) {
      const savedNotes = inMemoryTextCache.get(cacheKey) || [];
      touchAndEnforceLRU(inMemoryTextCache, cacheKey, savedNotes);
      setTextAnnotations(savedNotes);
    } else {
      setTextAnnotations([]);
    }
  }, [questionId, src]);

  // Auto-focus active text annotation input
  useEffect(() => {
    if (editingItem && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editingItem]);

  // Reset per-image view state immediately whenever the active question or src changes
  useEffect(() => {
    setHasError(false);
    setUseLocalFallback(false);
    setRetryCount(0);
    setZoom(1);
    setIsImageLoading(Boolean(src));
    strokeHistoryRef.current = [];
    setCanUndo(false);
  }, [src, questionId]);

  // Dedicated image loading effect: depends strictly on resolvedSrc (never on zoom or resize callbacks)
  useEffect(() => {
    if (!resolvedSrc) {
      setIsImageLoading(false);
      return;
    }

    let cancelled = false;
    setHasError(false);

    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      if (cancelled) return;
      setHasError(false);
      setIsImageLoading(false);
      requestAnimationFrame(() => {
        if (!cancelled) {
          syncCanvasDimensionsRef.current();
        }
      });
    };
    probe.onerror = () => {
      if (cancelled) return;
      setIsImageLoading(false);
      if (import.meta.env.DEV && !useLocalFallback && localSrc && localSrc !== cdnSrc) {
        setUseLocalFallback(true);
        setIsImageLoading(true);
      } else {
        setHasError(true);
      }
    };
    probe.src = resolvedSrc;

    // Synchronously handle already-cached / preloaded images on initial mount
    const domImg = imgRef.current;
    if (
      (probe.complete && probe.naturalWidth > 0) ||
      (domImg && domImg.complete && domImg.naturalWidth > 0 && domImg.getAttribute('src') === resolvedSrc)
    ) {
      setHasError(false);
      setIsImageLoading(false);
      syncCanvasDimensionsRef.current();
    } else {
      setIsImageLoading(true);
    }

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [resolvedSrc]);

  // ResizeObserver strictly redraws/syncs canvas dimensions without ever resetting isImageLoading
  useEffect(() => {
    const imgEl = imgRef.current;
    if (!imgEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      syncCanvasDimensionsRef.current();
    });
    observer.observe(imgEl);
    return () => observer.disconnect();
  }, [resolvedSrc]);

  const handleImageLoad = () => {
    setHasError(false);
    setIsImageLoading(false);
    syncCanvasDimensionsRef.current();
  };

  const handleLightboxImageLoad = () => {
    const img = lightboxImgRef.current;
    const canvas = lightboxCanvasRef.current;
    if (!img || !canvas) return;

    const w = img.naturalWidth || img.clientWidth;
    const h = img.naturalHeight || img.clientHeight;
    if (w > 0 && h > 0) {
      let targetW = w;
      let targetH = h;
      const totalPixels = w * h;
      if (totalPixels > MAX_CANVAS_PIXELS) {
        const scale = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
        targetW = Math.round(w * scale);
        targetH = Math.round(h * scale);
      }
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      restoreFromCache(canvas);
    }
  };

  const openLightbox = () => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setLightboxZoom(1.2);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setIsLightboxOpen(false);
  };

  useEffect(() => {
    if (isLightboxOpen) {
      const timer = setTimeout(() => {
        handleLightboxImageLoad();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLightboxOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen && !editingItemRef.current) {
        closeLightbox();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (!editingItemRef.current && isAnnotating && strokeHistoryRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, isAnnotating, handleUndo]);

  // Map mouse or touch coordinate to high-res canvas coordinate
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return null;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scale: scaleX,
    };
  };

  const startDrawing = (coords: { x: number; y: number; scale: number }, canvas: HTMLCanvasElement) => {
    if (currentTool === 'text') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Snapshot current canvas state before stroke begins for Undo
    try {
      if (canvas.width > 0 && canvas.height > 0) {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistoryRef.current.push(snapshot);
        if (strokeHistoryRef.current.length > MAX_UNDO_SNAPSHOTS) {
          strokeHistoryRef.current.shift();
        }
        setCanUndo(true);
      }
    } catch {
      // Ignore potential security/taint issues with external images
    }

    isDrawingRef.current = true;
    lastPosRef.current = { x: coords.x, y: coords.y };

    const config = SIZE_CONFIG[brushSizeRef.current];

    ctx.save();
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = config.eraserWidth * coords.scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.highlighterWidth * coords.scale;
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
    } else {
      // Pen: Subject-reactive ink
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.penWidth * coords.scale;
      ctx.strokeStyle = penColorRef.current;
      ctx.fillStyle = penColorRef.current;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Immediate point stamp
    ctx.beginPath();
    const radius = Math.max(1, ctx.lineWidth / 2);
    ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawMove = (coords: { x: number; y: number; scale: number }, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current || !lastPosRef.current || currentTool === 'text') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = SIZE_CONFIG[brushSizeRef.current];

    ctx.save();
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = config.eraserWidth * coords.scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.highlighterWidth * coords.scale;
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.penWidth * coords.scale;
      ctx.strokeStyle = penColorRef.current;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    lastPosRef.current = { x: coords.x, y: coords.y };
  };

  const stopDrawing = (canvas: HTMLCanvasElement | null) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      if (canvas) {
        syncDrawingCanvases(canvas);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating) return;
    if (currentTool === 'text') {
      e.preventDefault();
      handleCanvasClickForText(e, isLightbox);
      return;
    }
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const coords = getCanvasCoords(e, canvas);
    if (coords) startDrawing(coords, canvas);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating || !isDrawingRef.current || currentTool === 'text') return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const coords = getCanvasCoords(e, canvas);
    if (coords) drawMove(coords, canvas);
  };

  const handleMouseUp = (isLightbox: boolean) => {
    if (!isAnnotating) return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    stopDrawing(canvas);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating) return;
    if (currentTool === 'text') {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleCanvasClickForText(e, isLightbox);
      }
      return;
    }
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas);
      if (coords) startDrawing(coords, canvas);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating || !isDrawingRef.current || currentTool === 'text') return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas);
      if (coords) drawMove(coords, canvas);
    }
  };

  const handleTouchEnd = (isLightbox: boolean) => {
    if (!isAnnotating) return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    stopDrawing(canvas);
  };

  const getCanvasCursor = () => {
    if (!isAnnotating) return 'default';
    if (currentTool === 'pen') return 'default';
    if (currentTool === 'text') return 'text';
    if (currentTool === 'highlighter') return HIGHLIGHTER_CURSOR;
    if (currentTool === 'eraser') return ERASER_CURSOR;
    return 'default';
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'emerald':
        return getCanonicalSubjectTheme('biology').badgeClass;
      case 'blue':
      case 'indigo':
        return getCanonicalSubjectTheme('physics').badgeClass;
      case 'purple':
      case 'amber':
        return getCanonicalSubjectTheme('mathematics').badgeClass;
      case 'orange':
      case 'cyan':
      default:
        return getCanonicalSubjectTheme('chemistry').badgeClass;
    }
  };

  // Shared Floating Annotation Toolbar Renderer
  const renderAnnotationToolbar = () => (
    <div
      className="flex items-center gap-1 sm:gap-1.5 bg-[var(--bg-surface)] px-2.5 sm:px-3 py-1.5 rounded-full border border-[var(--border-hairline)] select-none transition-colors flex-wrap justify-center sm:flex-nowrap"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      {/* Toggle Annotate: On/Off */}
      <button
        type="button"
        onClick={toggleAnnotating}
        title={isAnnotating ? 'Turn off annotation' : 'Turn on annotation overlay'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          isAnnotating
            ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
            : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] border border-[var(--border-hairline)]'
        }`}
      >
        <PenLine className="w-3.5 h-3.5" />
        <span>{isAnnotating ? 'Annotating' : 'Annotate'}</span>
      </button>

      {isAnnotating && (
        <>
          <div className="w-px h-4 bg-[var(--border-hairline)] mx-0.5" />

          {/* Pen */}
          <button
            type="button"
            onClick={() => switchTool('pen')}
            title={`Pen (${SIZE_CONFIG[brushSize].penWidth}px)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'pen'
                ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)] font-semibold'
                : 'text-[var(--ink-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full border border-black/15 dark:border-white/20 inline-block" style={{ backgroundColor: penColor }} />
            <span>Pen</span>
          </button>

          {/* Ink Palette Swatches */}
          {currentTool === 'pen' && (
            <div className="flex items-center gap-1 bg-[var(--bg-inset)] p-0.5 px-1.5 rounded-full border border-[var(--border-hairline)]">
              {penPaletteSwatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 transition-transform ${
                    penColor === c ? 'scale-125 ring-2 ring-[var(--ink-primary)]' : 'opacity-75 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Select ink color: ${c}`}
                />
              ))}
            </div>
          )}

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => switchTool('highlighter')}
            title={`Highlighter (${SIZE_CONFIG[brushSize].highlighterWidth}px Yellow)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'highlighter'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold'
                : 'text-[var(--ink-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Highlight</span>
          </button>

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => switchTool('text')}
            title={`Text (${SIZE_CONFIG[brushSize].fontSize}px Font)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'text'
                ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)] font-semibold'
                : 'text-[var(--ink-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Type className="w-3.5 h-3.5" style={{ color: 'var(--subject-accent)' }} />
            <span>Text</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => switchTool('eraser')}
            title={`Eraser (${SIZE_CONFIG[brushSize].eraserWidth}px)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'eraser'
                ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 font-semibold'
                : 'text-[var(--ink-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Eraser</span>
          </button>

          <div className="w-px h-4 bg-[var(--border-hairline)] mx-0.5" />

          {/* 3-Tier Size Picker */}
          <div className="flex items-center gap-1 bg-[var(--bg-inset)] p-0.5 rounded-full border border-[var(--border-hairline)]">
            {(['fine', 'medium', 'bold'] as const).map((tier) => {
              const isSelected = brushSize === tier;
              const config = SIZE_CONFIG[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleBrushSizeChange(tier)}
                  title={`${config.label} (${config.penWidth}px Pen / ${config.fontSize}px Font)`}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[var(--bg-surface)] border border-[var(--border-strong)] scale-105'
                      : 'hover:bg-[var(--bg-subtle)] opacity-65 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`rounded-full transition-colors ${
                      isSelected
                        ? currentTool === 'eraser'
                          ? 'bg-rose-500'
                          : currentTool === 'highlighter'
                          ? 'bg-amber-500'
                          : 'bg-[var(--ink-primary)]'
                        : 'bg-[var(--ink-caption)]'
                    } ${config.dotClass}`}
                  />
                </button>
              );
            })}
          </div>

          <div className="w-px h-4 bg-[var(--border-hairline)] mx-0.5" />

          {/* Undo Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo drawing stroke (Ctrl+Z)"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              canUndo
                ? 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)]'
                : 'text-[var(--ink-caption)] opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearCanvas}
            title="Clear all annotations on this question"
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-[var(--ink-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </>
      )}
    </div>
  );

  // Shared Text Annotations & Auto-Expanding Inline Input Renderer
  const renderTextAnnotations = (isLightbox: boolean) => {
    if (!enableAnnotation) return null;

    const activeImg = isLightbox ? lightboxImgRef.current : imgRef.current;
    const currentWidth = activeImg?.clientWidth || (isLightbox ? 900 : 700);
    const scaleFactor = Math.max(0.6, Math.min(2.0, currentWidth / 700));

    return (
      <>
        {textAnnotations.map((item) => {
          if (editingItem?.id === item.id) return null;
          const displayFontSize = Math.round(item.fontSize * scaleFactor);
          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (isAnnotating) {
                  if (currentTool === 'eraser') {
                    deleteAnnotation(item.id);
                  } else {
                    startEditing(item, isLightbox);
                  }
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isAnnotating) {
                  startEditing(item, isLightbox);
                }
              }}
              className={`absolute z-20 font-sans select-none whitespace-pre leading-tight transition-all ${
                isAnnotating
                  ? currentTool === 'eraser'
                    ? 'cursor-pointer hover:line-through hover:opacity-60'
                    : 'cursor-pointer hover:border-b hover:border-current'
                  : 'pointer-events-none'
              }`}
              style={{
                left: `${item.xPercent}%`,
                top: `${item.yPercent}%`,
                fontSize: `${displayFontSize}px`,
                color: penColor,
              }}
              title={
                isAnnotating
                  ? currentTool === 'eraser'
                    ? 'Click to delete note'
                    : 'Click or double-click to edit note'
                  : undefined
              }
            >
              {item.text}
            </div>
          );
        })}

        {/* Dynamic Auto-Expanding Inline Input while Typing */}
        {isAnnotating && editingItem && editingInLightbox === isLightbox && (
          <input
            ref={inputRef}
            type="text"
            value={editingItem.text}
            onChange={(e) => {
              const newText = e.target.value;
              setEditingItem((prev) => (prev ? { ...prev, text: newText } : null));
              if (editingItemRef.current) {
                editingItemRef.current.text = newText;
              }
            }}
            onBlur={commitEditingText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                e.preventDefault();
                commitEditingText();
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                e.preventDefault();
                commitEditingText();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Type note..."
            autoFocus
            className="absolute z-30 bg-transparent border-b outline-none p-0 m-0 font-sans shadow-none whitespace-pre text-base"
            style={{
              left: `${editingItem.xPercent}%`,
              top: `${editingItem.yPercent}%`,
              fontSize: `${Math.round(editingItem.fontSize * scaleFactor)}px`,
              width: `${Math.max(8, editingItem.text.length + 1)}ch`,
              maxWidth: '90%',
              color: penColor,
              borderColor: penColor,
            }}
          />
        )}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-[300px] bg-[var(--bg-inset)] overflow-hidden transition-colors">
      {/* Canvas Header */}
      <div className="h-10 px-3 sm:px-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
          <span className="text-xs font-semibold text-[var(--ink-primary)] truncate">{title}</span>
          {badgeText && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 font-mono tabular-nums ${getBadgeClass()}`}>
              {badgeText}
            </span>
          )}
          {extraBadge}
        </div>

        {/* Annotate, Dark Paper (Dark Mode only), Zoom & Lightbox Controls */}
        {src && !hasError && (
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[var(--bg-inset)] rounded-lg p-0.5 border border-[var(--border-hairline)] shrink-0">
            {enableAnnotation && (
              <>
                <button
                  type="button"
                  onClick={toggleAnnotating}
                  title={isAnnotating ? 'Turn off annotation overlay' : 'Draw / annotate on question'}
                  className={`p-1 sm:p-1.5 rounded transition-colors ${
                    isAnnotating
                      ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]'
                      : 'hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-[var(--border-hairline)] mx-0.5" />
              </>
            )}

            {theme === 'dark' && (
              <>
                <button
                  type="button"
                  onClick={toggleDarkPaper}
                  aria-pressed={darkPaper}
                  title={darkPaper ? 'Dark Paper ON (click for white exam sheet)' : 'Dark Paper OFF (click to invert exam scan for dark reading)'}
                  className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    darkPaper
                      ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold'
                      : 'hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Contrast className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Dark Paper</span>
                </button>
                <div className="w-px h-3.5 bg-[var(--border-hairline)] mx-0.5" />
              </>
            )}

            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1 sm:p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono tabular-nums text-[var(--ink-secondary)] px-1 select-none min-w-[2.5rem] sm:min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1 sm:p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[var(--border-hairline)] mx-0.5" />
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 sm:p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[var(--border-hairline)] mx-0.5" />
            <button
              type="button"
              onClick={openLightbox}
              title="Full-screen Lightbox (inspect intricate mechanisms & graphs)"
              className="p-1 sm:p-1.5 rounded hover:bg-[var(--bg-subtle)] transition-colors"
              style={{ color: 'var(--subject-accent)' }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full max-w-full min-h-0 overflow-y-auto overflow-x-auto px-2 sm:px-4 py-3 flex items-start justify-center bg-[var(--bg-inset)] relative"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        {!src || hasError ? (
          <div className="relative z-10 m-auto flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-md rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--ink-muted)] mb-3">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--ink-primary)] mb-1">{placeholderTitle}</h4>
            {citationDisplay && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] mb-2">
                Citation: {citationDisplay}
              </span>
            )}
            <p className="text-xs text-[var(--ink-muted)] mb-4 leading-relaxed">{placeholderMessage}</p>
            {src && (
              <button
                type="button"
                onClick={handleRetryImage}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Loading Asset</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex flex-col justify-start items-center pt-1 pb-12 w-full max-w-full">
            {/* Minimal Floating Annotation Controls */}
            {enableAnnotation && (
              <div className="sticky top-2 z-10 mb-3 flex items-center justify-center pointer-events-auto">
                {renderAnnotationToolbar()}
              </div>
            )}

            <div
              className="flex justify-center w-full max-w-full"
              style={zoom > 1 ? { minWidth: `${Math.round(zoom * 100)}%` } : undefined}
            >
              <div
                className={`relative w-full max-w-full transition-transform duration-100 ease-out origin-top rounded-lg overflow-hidden border border-[var(--border-hairline)] ${
                  isDarkPaperActive ? 'bg-[var(--bg-surface)]' : 'bg-white'
                } ${isImageLoading ? 'min-h-[280px]' : ''} ${!isAnnotating ? 'cursor-pointer' : ''}`}
                style={{ transform: `scale(${zoom})`, width: '100%' }}
                onClick={() => {
                  if (!isAnnotating && zoom === 1) {
                    openLightbox();
                  }
                }}
                title={!isAnnotating ? 'Click or tap to inspect in full-screen lightbox' : undefined}
              >
                {isImageLoading && (
                  <div className="absolute inset-0 z-10 bg-[var(--bg-inset)] animate-pulse flex items-center justify-center min-h-[280px] pointer-events-none">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-[var(--border-hairline)] animate-spin"
                      style={{ borderTopColor: 'var(--subject-accent)' }}
                    />
                  </div>
                )}
                {/* Strictly isolate Dark Paper CSS filter to the <img> element only */}
                <div className={`exam-paper-surface w-full ${isDarkPaperActive ? 'bg-[var(--bg-surface)]' : 'bg-white'}`}>
                  <img
                    ref={imgRef}
                    src={resolvedSrc}
                    alt={title}
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className={`w-full max-w-full h-auto object-contain block select-none pointer-events-none ${
                      isDarkPaperActive ? 'exam-paper-dark-invert' : 'bg-white'
                    } ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                  />
                </div>
                {enableAnnotation && (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={(e) => handleMouseDown(e, false)}
                    onMouseMove={(e) => handleMouseMove(e, false)}
                    onMouseUp={() => handleMouseUp(false)}
                    onMouseLeave={() => handleMouseUp(false)}
                    onTouchStart={(e) => handleTouchStart(e, false)}
                    onTouchMove={(e) => handleTouchMove(e, false)}
                    onTouchEnd={() => handleTouchEnd(false)}
                    onTouchCancel={() => handleTouchEnd(false)}
                    className={`absolute inset-0 w-full h-full ${
                      isAnnotating ? 'pointer-events-auto touch-none' : 'pointer-events-none'
                    }`}
                    style={{
                      cursor: getCanvasCursor(),
                    }}
                  />
                )}

                {/* Re-Editable Text Annotations Overlay (never inverted) */}
                {renderTextAnnotations(false)}
              </div>
            </div>
            {children}
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isLightboxOpen && src && !hasError && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/80 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Lightbox Header */}
          <div
            className="h-14 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
              <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">{title}</span>
              {badgeText && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${getBadgeClass()}`}>
                  {badgeText}
                </span>
              )}
              <span className="text-xs text-[var(--ink-muted)] hidden sm:inline">High-Resolution View</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {theme === 'dark' && (
                <button
                  type="button"
                  onClick={toggleDarkPaper}
                  aria-pressed={darkPaper}
                  title={darkPaper ? 'Dark Paper ON' : 'Dark Paper OFF'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    darkPaper
                      ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-transparent font-semibold'
                      : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-[var(--border-hairline)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Contrast className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dark Paper</span>
                </button>
              )}

              {/* Lightbox Zoom Controls */}
              <div className="flex items-center gap-1 bg-[var(--bg-inset)] rounded-lg p-1 border border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  title="Zoom Out"
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums text-[var(--ink-primary)] px-1.5 min-w-[3rem] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(prev + 0.25, 3.5))}
                  title="Zoom In"
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  title="Reset 100%"
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={closeLightbox}
                className="w-9 h-9 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
                title="Close lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Body / Viewport */}
          <div
            className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center justify-start cursor-zoom-out bg-[var(--bg-paper)]"
            onClick={closeLightbox}
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          >
            {enableAnnotation && (
              <div
                className="sticky top-2 z-30 mb-3 flex items-center justify-center pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {renderAnnotationToolbar()}
              </div>
            )}

            <div
              className={`rounded-lg border border-[var(--border-hairline)] p-2 max-w-5xl transition-transform duration-100 ease-out origin-top cursor-default ${
                isDarkPaperActive ? 'bg-[var(--bg-surface)]' : 'bg-white'
              }`}
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative max-w-full overflow-hidden rounded-md">
                <div className={`exam-paper-surface w-full ${isDarkPaperActive ? 'bg-[var(--bg-surface)]' : 'bg-white'}`}>
                  <img
                    ref={lightboxImgRef}
                    src={resolvedSrc}
                    alt={title}
                    crossOrigin="anonymous"
                    onLoad={handleLightboxImageLoad}
                    className={`w-full max-w-full h-auto object-contain block select-none pointer-events-none ${
                      isDarkPaperActive ? 'exam-paper-dark-invert' : ''
                    }`}
                  />
                </div>
                {enableAnnotation && (
                  <canvas
                    ref={lightboxCanvasRef}
                    onMouseDown={(e) => handleMouseDown(e, true)}
                    onMouseMove={(e) => handleMouseMove(e, true)}
                    onMouseUp={() => handleMouseUp(true)}
                    onMouseLeave={() => handleMouseUp(true)}
                    onTouchStart={(e) => handleTouchStart(e, true)}
                    onTouchMove={(e) => handleTouchMove(e, true)}
                    onTouchEnd={() => handleTouchEnd(true)}
                    onTouchCancel={() => handleTouchEnd(true)}
                    className={`absolute inset-0 w-full h-full ${
                      isAnnotating ? 'pointer-events-auto touch-none' : 'pointer-events-none'
                    }`}
                    style={{
                      cursor: getCanvasCursor(),
                    }}
                  />
                )}
                {renderTextAnnotations(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;
