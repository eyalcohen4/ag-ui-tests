/**
 * StepIndicator component for displaying workflow steps.
 */
import { Step } from '../store/types';

interface StepIndicatorProps {
  steps: Step[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            transition-all duration-300
            ${step.status === 'in_progress'
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }
          `}
        >
          {step.status === 'in_progress' ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{step.name}</span>
          {step.finishedAt && step.startedAt && (
            <span className="text-xs opacity-60">
              {((step.finishedAt - step.startedAt) / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

