/**
 * ToolCall component for displaying tool call execution.
 * Shows "Using tool..." similar to OpenAI's interface.
 */
import { useState } from 'react';
import { ToolCall as ToolCallType } from '../store/types';

interface ToolCallProps {
  toolCall: ToolCallType;
}

// Tool-specific icons
const toolIcons: Record<string, React.ReactNode> = {
  calculate: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  get_weather: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
};

// Human-readable tool names
const toolDisplayNames: Record<string, string> = {
  calculate: 'Calculator',
  get_weather: 'Weather',
};

export function ToolCall({ toolCall }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isExecuting = toolCall.status === 'pending' || toolCall.status === 'executing';
  const isCompleted = toolCall.status === 'completed';
  
  const displayName = toolDisplayNames[toolCall.name] || toolCall.name;
  const icon = toolIcons[toolCall.name] || (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  // Format arguments for display
  const formatArguments = (args: string) => {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return args;
    }
  };

  // Format result for display
  const formatResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return result;
    }
  };

  // Get summary of the tool call for inline display
  const getToolSummary = () => {
    try {
      const args = JSON.parse(toolCall.arguments);
      if (toolCall.name === 'calculate') {
        return args.expression;
      } else if (toolCall.name === 'get_weather') {
        return `${args.city}${args.units ? ` (${args.units})` : ''}`;
      }
      return Object.values(args).join(', ');
    } catch {
      return toolCall.arguments;
    }
  };

  return (
    <div className="my-3 animate-slide-up">
      {/* Main "Using tool" display - like OpenAI */}
      <div 
        className={`
          inline-flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer
          transition-all duration-200 
          ${isExecuting 
            ? 'bg-midnight-800 border border-accent-500/30' 
            : 'bg-midnight-800/50 border border-midnight-700 hover:border-midnight-600'
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Icon with animation when executing */}
        <div className={`${isExecuting ? 'animate-pulse text-accent-400' : 'text-midnight-400'}`}>
          {icon}
        </div>
        
        {/* Tool info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isExecuting ? 'text-accent-300' : 'text-midnight-200'}`}>
              {isExecuting ? `Using ${displayName}` : `Used ${displayName}`}
            </span>
            {isExecuting && (
              <svg className="w-4 h-4 animate-spin text-accent-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isCompleted && (
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-xs text-midnight-400 font-mono">
            {getToolSummary()}
          </span>
        </div>

        {/* Expand/collapse icon */}
        <svg
          className={`w-4 h-4 text-midnight-500 transition-transform duration-200 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-midnight-700 space-y-3 animate-fade-in">
          {toolCall.arguments && (
            <div>
              <div className="text-xs text-midnight-400 mb-1 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                Input
              </div>
              <pre className="bg-midnight-900/70 rounded-lg p-3 text-xs font-mono text-midnight-200 overflow-x-auto">
                {formatArguments(toolCall.arguments)}
              </pre>
            </div>
          )}

          {toolCall.result && (
            <div>
              <div className="text-xs text-midnight-400 mb-1 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Output
              </div>
              <pre className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 text-xs font-mono text-green-300 overflow-x-auto">
                {formatResult(toolCall.result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
