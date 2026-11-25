import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, FilterX } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onResetFilters?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CanvasErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleResetFiltersAndReload = () => {
    try {
      if (this.props.onResetFilters) {
        this.props.onResetFilters();
      }
      localStorage.removeItem('cambridge_math_era');
    } catch {
      // ignore storage errors
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl m-4 text-center select-none">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-editorial text-lg font-bold text-[var(--ink-primary)] mb-1.5">
            {this.props.fallbackMessage || 'Canvas Viewer Encountered an Issue'}
          </h3>
          <p className="text-xs text-[var(--ink-muted)] max-w-md mb-5 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading this question image or drawing canvas.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--action-primary-bg)] hover:bg-[var(--action-primary-hover)] text-[var(--action-primary-fg)] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Canvas</span>
            </button>
            <button
              type="button"
              onClick={this.handleResetFiltersAndReload}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-inset)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset Filters &amp; Reload</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--border-hairline)] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;
