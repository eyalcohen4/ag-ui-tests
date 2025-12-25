/**
 * ChatMessage component for displaying individual messages.
 */
import React from 'react';
import { Message } from '../store/types';
import { ReasoningStep } from './ReasoningStep';
import { ToolCall } from './ToolCall';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-up`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {/* Role indicator */}
        <div className={`text-xs mb-1 ${isUser ? 'text-accent-400' : 'text-midnight-400'}`}>
          {isUser ? 'You' : 'Assistant'}
        </div>

        {/* Reasoning steps (only for assistant messages) */}
        {isAssistant && message.reasoningSteps && message.reasoningSteps.length > 0 && (
          <ReasoningStep steps={message.reasoningSteps} isStreaming={message.isStreaming} />
        )}

        {/* Tool calls (only for assistant messages) */}
        {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-2 mb-3">
            {message.toolCalls.map((toolCall) => (
              <ToolCall key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Message content */}
        {(message.content || message.isStreaming) && (
          <div
            className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {message.isStreaming && !message.content && (
                <span className="text-midnight-400 italic">Generating response...</span>
              )}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-accent-400 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-midnight-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

