import type React from 'react';

export interface SpotlightPreset {
  spotlightColor: string;
  borderGlowColor: string;
  ambientGlowColor: string;
}

export const SUBJECT_SPOTLIGHT_PRESETS: Record<string, SpotlightPreset> = {
  // 0580 Mathematics — Royal Plum #7E22CE (rgb(126, 34, 206))
  '0580': {
    spotlightColor: 'rgba(126, 34, 206, 0.08)',
    borderGlowColor: 'rgba(126, 34, 206, 0.3)',
    ambientGlowColor: 'rgba(126, 34, 206, 0.06)',
  },
  mathematics: {
    spotlightColor: 'rgba(126, 34, 206, 0.08)',
    borderGlowColor: 'rgba(126, 34, 206, 0.3)',
    ambientGlowColor: 'rgba(126, 34, 206, 0.06)',
  },
  math: {
    spotlightColor: 'rgba(126, 34, 206, 0.08)',
    borderGlowColor: 'rgba(126, 34, 206, 0.3)',
    ambientGlowColor: 'rgba(126, 34, 206, 0.06)',
  },
  purple: {
    spotlightColor: 'rgba(126, 34, 206, 0.08)',
    borderGlowColor: 'rgba(126, 34, 206, 0.3)',
    ambientGlowColor: 'rgba(126, 34, 206, 0.06)',
  },
  amber: {
    spotlightColor: 'rgba(126, 34, 206, 0.08)',
    borderGlowColor: 'rgba(126, 34, 206, 0.3)',
    ambientGlowColor: 'rgba(126, 34, 206, 0.06)',
  },

  // 0625 Physics — Cobalt #1D4ED8 (rgb(29, 78, 216))
  '0625': {
    spotlightColor: 'rgba(29, 78, 216, 0.08)',
    borderGlowColor: 'rgba(29, 78, 216, 0.3)',
    ambientGlowColor: 'rgba(29, 78, 216, 0.06)',
  },
  physics: {
    spotlightColor: 'rgba(29, 78, 216, 0.08)',
    borderGlowColor: 'rgba(29, 78, 216, 0.3)',
    ambientGlowColor: 'rgba(29, 78, 216, 0.06)',
  },
  blue: {
    spotlightColor: 'rgba(29, 78, 216, 0.08)',
    borderGlowColor: 'rgba(29, 78, 216, 0.3)',
    ambientGlowColor: 'rgba(29, 78, 216, 0.06)',
  },
  indigo: {
    spotlightColor: 'rgba(29, 78, 216, 0.08)',
    borderGlowColor: 'rgba(29, 78, 216, 0.3)',
    ambientGlowColor: 'rgba(29, 78, 216, 0.06)',
  },

  // 0620 Chemistry — Crimson-Orange #C2410C (rgb(194, 65, 12))
  '0620': {
    spotlightColor: 'rgba(194, 65, 12, 0.08)',
    borderGlowColor: 'rgba(194, 65, 12, 0.3)',
    ambientGlowColor: 'rgba(194, 65, 12, 0.06)',
  },
  chemistry: {
    spotlightColor: 'rgba(194, 65, 12, 0.08)',
    borderGlowColor: 'rgba(194, 65, 12, 0.3)',
    ambientGlowColor: 'rgba(194, 65, 12, 0.06)',
  },
  orange: {
    spotlightColor: 'rgba(194, 65, 12, 0.08)',
    borderGlowColor: 'rgba(194, 65, 12, 0.3)',
    ambientGlowColor: 'rgba(194, 65, 12, 0.06)',
  },
  cyan: {
    spotlightColor: 'rgba(194, 65, 12, 0.08)',
    borderGlowColor: 'rgba(194, 65, 12, 0.3)',
    ambientGlowColor: 'rgba(194, 65, 12, 0.06)',
  },

  // 0610 Biology — Botanical Emerald #15803D (rgb(21, 128, 61))
  '0610': {
    spotlightColor: 'rgba(21, 128, 61, 0.08)',
    borderGlowColor: 'rgba(21, 128, 61, 0.3)',
    ambientGlowColor: 'rgba(21, 128, 61, 0.06)',
  },
  biology: {
    spotlightColor: 'rgba(21, 128, 61, 0.08)',
    borderGlowColor: 'rgba(21, 128, 61, 0.3)',
    ambientGlowColor: 'rgba(21, 128, 61, 0.06)',
  },
  emerald: {
    spotlightColor: 'rgba(21, 128, 61, 0.08)',
    borderGlowColor: 'rgba(21, 128, 61, 0.3)',
    ambientGlowColor: 'rgba(21, 128, 61, 0.06)',
  },
};

export function getSubjectSpotlightPreset(key?: string): SpotlightPreset {
  const normalized = (key || 'chemistry').toLowerCase();
  return SUBJECT_SPOTLIGHT_PRESETS[normalized] || SUBJECT_SPOTLIGHT_PRESETS.chemistry;
}

export function getSubjectSpotlightStyle(
  key?: string,
  spotlightSize?: number
): React.CSSProperties {
  const preset = getSubjectSpotlightPreset(key);
  const style: Record<string, string> = {
    '--spotlight-color': preset.spotlightColor,
    '--border-glow-color': preset.borderGlowColor,
  };
  if (spotlightSize) {
    style['--spotlight-size'] = `${spotlightSize}px`;
  }
  return style as React.CSSProperties;
}

export function registerSpotlightTarget(_el: HTMLElement, _clientX: number, _clientY: number) {
  // Editorial design mode keeps surfaces flat without cursor glow tracking
}

export function unregisterSpotlightTarget(_el: HTMLElement) {
  // No-op in editorial mode
}

export function handleSpotlightMove(_e: React.PointerEvent<HTMLElement>) {
  // No-op in editorial mode
}

export function handleSpotlightLeave(_e: React.PointerEvent<HTMLElement>) {
  // No-op in editorial mode
}
