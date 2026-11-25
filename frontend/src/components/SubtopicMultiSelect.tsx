import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  X
} from 'lucide-react';
import { handleSpotlightMove, handleSpotlightLeave } from '../utils/spotlight';

interface SubtopicHierarchy {
  topicName: string;
  subtopics: {
    name: string;
    count: number;
  }[];
}

interface SubtopicMultiSelectProps {
  hierarchy: SubtopicHierarchy[];
  selectedSubtopics: string[];
  onChange: (selected: string[]) => void;
  questions?: { subtopic?: string; subtopics?: string[] }[];
  fullWidth?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const SubtopicMultiSelect: React.FC<SubtopicMultiSelectProps> = ({
  hierarchy,
  selectedSubtopics,
  onChange,
  questions,
  fullWidth = false,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Dynamic question counts per subtopic (incrementing every subtopic in q.subtopics)
  const effectiveHierarchy = useMemo(() => {
    if (!questions || questions.length === 0) return hierarchy;
    const subtopicCounts = new Map<string, number>();
    for (const q of questions) {
      const subs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : q.subtopic ? [q.subtopic] : [];
      for (const s of subs) {
        if (!s) continue;
        subtopicCounts.set(s, (subtopicCounts.get(s) || 0) + 1);
      }
    }
    return hierarchy.map((group) => ({
      ...group,
      subtopics: group.subtopics.map((sub) => ({
        ...sub,
        count: subtopicCounts.get(sub.name) ?? sub.count,
      })),
    }));
  }, [hierarchy, questions]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleTopicCollapse = (topicName: string) => {
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicName)) next.delete(topicName);
      else next.add(topicName);
      return next;
    });
  };

  const handleToggleSubtopic = (subtopic: string) => {
    if (selectedSubtopics.includes(subtopic)) {
      onChange(selectedSubtopics.filter(s => s !== subtopic));
    } else {
      onChange([...selectedSubtopics, subtopic]);
    }
  };

  const handleSelectAllInTopic = (subtopicNames: string[]) => {
    const allSelected = subtopicNames.every(s => selectedSubtopics.includes(s));
    if (allSelected) {
      // Deselect these
      onChange(selectedSubtopics.filter(s => !subtopicNames.includes(s)));
    } else {
      // Add all missing
      const newItems = subtopicNames.filter(s => !selectedSubtopics.includes(s));
      onChange([...selectedSubtopics, ...newItems]);
    }
  };

  const handleClearAll = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Filter hierarchy by search term
  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return effectiveHierarchy;
    const q = search.toLowerCase();

    return effectiveHierarchy
      .map(group => {
        const matchingSubtopics = group.subtopics.filter(
          s => s.name.toLowerCase().includes(q) || group.topicName.toLowerCase().includes(q)
        );
        return {
          ...group,
          subtopics: matchingSubtopics
        };
      })
      .filter(group => group.subtopics.length > 0);
  }, [effectiveHierarchy, search]);

  const totalAvailable = useMemo(() => {
    return effectiveHierarchy.reduce((sum, g) => sum + g.subtopics.length, 0);
  }, [effectiveHierarchy]);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        title="Filter by subtopics"
        onClick={() => setIsOpen(prev => !prev)}
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        className={`${
          fullWidth ? 'w-full' : 'max-w-[200px] xl:max-w-[260px]'
        } flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-colors select-none whitespace-nowrap ${
          selectedSubtopics.length > 0
            ? 'bg-[var(--subject-bg)] border-[var(--subject-border)] text-[var(--subject-accent)] font-semibold'
            : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--subject-accent)' }} />
          <span
            className="truncate text-left"
            title={
              selectedSubtopics.length === 0
                ? 'All Subtopics'
                : selectedSubtopics.length === 1
                ? selectedSubtopics[0]
                : `${selectedSubtopics.length} Subtopics Selected`
            }
          >
            {selectedSubtopics.length === 0
              ? 'All Subtopics'
              : selectedSubtopics.length === 1
              ? selectedSubtopics[0]
              : `${selectedSubtopics.length} Subtopics`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedSubtopics.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClearAll(e);
              }}
              title="Clear subtopics"
              className="w-4 h-4 rounded-full bg-[var(--action-primary-bg)] hover:bg-rose-600 text-[var(--action-primary-fg)] flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}

          <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-[296px] sm:w-[312px] xl:w-[336px] max-w-[calc(100vw-1.5rem)] max-h-[480px] z-50 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg flex flex-col overflow-hidden`}
          style={{ boxShadow: 'var(--shadow-popover)' }}
        >
          {/* Header Search */}
          <div className="p-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-inset)] shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search official subtopics..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-md pl-8 pr-3 py-1.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-caption)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] px-1">
              <span>
                {selectedSubtopics.length} of {totalAvailable} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = hierarchy.flatMap(g => g.subtopics.map(s => s.name));
                    onChange(all);
                  }}
                  className="text-[var(--ink-primary)] hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-[var(--border-strong)]">·</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Subtopic Accordion Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-[var(--border-hairline)]">
            {filteredHierarchy.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
                No matching subtopics found
              </div>
            ) : (
              filteredHierarchy.map(group => {
                const isCollapsed = collapsedTopics.has(group.topicName);
                const groupSubNames = group.subtopics.map(s => s.name);
                const selectedInGroup = groupSubNames.filter(s => selectedSubtopics.includes(s)).length;
                const allInGroupSelected = groupSubNames.length > 0 && selectedInGroup === groupSubNames.length;

                return (
                  <div key={group.topicName} className="pt-1.5 first:pt-0">
                    {/* Collapsible Main Topic Header */}
                    <div
                      onClick={() => toggleTopicCollapse(group.topicName)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--bg-inset)] cursor-pointer text-xs font-semibold text-[var(--ink-primary)] group select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                        )}
                        <span className="truncate text-[var(--ink-primary)] text-xs" title={group.topicName}>{group.topicName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedInGroup > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--subject-bg)] text-[var(--subject-accent)] border border-[var(--subject-border)] text-[10px] font-mono tabular-nums">
                            {selectedInGroup}/{groupSubNames.length}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllInTopic(groupSubNames);
                          }}
                          className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
                        >
                          {allInGroupSelected ? 'Deselect' : 'All'}
                        </button>
                      </div>
                    </div>

                    {/* Subtopics Under Group */}
                    {!isCollapsed && (
                      <div className="mt-1 ml-4 pl-2 border-l border-[var(--border-hairline)] space-y-1 py-1">
                        {group.subtopics.map(sub => {
                          const isChecked = selectedSubtopics.includes(sub.name);
                          return (
                            <label
                              key={sub.name}
                              title={sub.name}
                              className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none border ${
                                isChecked
                                  ? 'bg-[var(--subject-bg)] border-[var(--subject-border)] text-[var(--ink-primary)] font-medium'
                                  : 'hover:bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-transparent'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSubtopic(sub.name)}
                                  className="w-3.5 h-3.5 rounded bg-[var(--bg-surface)] border-[var(--border-strong)] accent-[#0F172A] dark:accent-[#F1F5F9] cursor-pointer"
                                />
                              </div>
                              <span className="flex-1 leading-snug truncate" title={sub.name}>{sub.name}</span>
                              {sub.count > 0 && (
                                <span className="text-[10px] text-[var(--ink-muted)] font-mono tabular-nums px-1 rounded bg-[var(--bg-inset)] border border-[var(--border-hairline)] shrink-0">
                                  {sub.count}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtopicMultiSelect;
