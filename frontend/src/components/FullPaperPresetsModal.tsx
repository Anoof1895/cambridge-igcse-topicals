import React from 'react';
import { X, Award, Clock } from 'lucide-react';
import { MockExamPreset } from '../types';

interface FullPaperPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: MockExamPreset[];
  selectedPresetId: string | null;
  onApplyPreset: (preset: MockExamPreset) => void;
  accentClasses: {
    primary: string;
    text: string;
    bg: string;
    bgLight: string;
    border: string;
    gradient: string;
  };
}

export const FullPaperPresetsModal: React.FC<FullPaperPresetsModalProps> = ({
  isOpen,
  onClose,
  presets,
  selectedPresetId,
  onApplyPreset,
  accentClasses,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg max-w-xl w-full p-5 sm:p-6 relative overflow-hidden"
        style={{ boxShadow: 'var(--shadow-popover)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-md border ${accentClasses.bgLight} ${accentClasses.border} ${accentClasses.text}`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                <span>Official Cambridge Exam Presets</span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${accentClasses.bgLight} ${accentClasses.text} ${accentClasses.border}`}>
                  Full Paper Mocks
                </span>
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Generate complete past paper simulations calibrated to official Cambridge mark totals and time allocations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-inset)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onApplyPreset(preset);
                  onClose();
                }}
                className={`group p-3.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  isSelected
                    ? `${accentClasses.bgLight} ${accentClasses.border}`
                    : 'bg-[var(--bg-inset)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-xs font-bold ${isSelected ? accentClasses.text : 'text-[var(--ink-primary)]'}`}>
                    {preset.label}
                  </span>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--ink-primary)] tabular-nums">
                    {preset.targetMarks}m
                  </span>
                </div>

                <p className="text-[11px] text-[var(--ink-muted)] line-clamp-2 mb-2.5">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[var(--ink-muted)] pt-2 border-t border-[var(--border-hairline)]">
                  <span className="flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="w-3 h-3" />
                    {preset.durationLabel}
                  </span>
                  <span className="font-semibold capitalize text-[var(--ink-secondary)]">
                    {preset.isMcqOnly ? 'MCQ Only' : preset.calculatorAllowed === false ? 'Non-Calculator' : 'Theory & Calc'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>Randomizes authentic questions while preserving syllabus topic distribution.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-hairline)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
