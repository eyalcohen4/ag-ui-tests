/**
 * ReasoningStep component for displaying AI reasoning/thinking steps.
 */
import { useState, useMemo } from 'react';
import { ReasoningStep as ReasoningStepType } from '../store/types';

interface ReasoningStepProps {
  steps: ReasoningStepType[];
  isStreaming?: boolean;
}

export function ReasoningStep({ steps, isStreaming = false }: ReasoningStepProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Combine all thinking content into one flowing text
  const combinedThinking = useMemo(() => {
    return steps.map(s => s.content).join('');
  }, [steps]);

  if (steps.length === 0 || !combinedThinking.trim()) return null;

  return (
    <div className="reasoning-container mb-3 animate-fade-in w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left text-amber-400 hover:text-amber-300 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isStreaming ? 'animate-pulse-slow' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span className="font-medium text-sm">
            {isStreaming ? 'Thinking...' : 'Thought Process'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 border-l-2 border-amber-600/30 pl-4">
          <div className="text-midnight-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {combinedThinking}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-amber-400/50 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
