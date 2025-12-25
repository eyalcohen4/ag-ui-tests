/**
 * TypeScript types for chat state management.
 */

// Message roles
export type MessageRole = 'user' | 'assistant' | 'tool';

// Reasoning step
export interface ReasoningStep {
  id: string;
  content: string;
  timestamp: number;
}

// Step status
export type StepStatus = 'in_progress' | 'completed';

// Step
export interface Step {
  id: string;
  name: string;
  status: StepStatus;
  startedAt: number;
  finishedAt?: number;
}

// Tool call status
export type ToolCallStatus = 'pending' | 'executing' | 'completed' | 'error';

// Tool call
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: ToolCallStatus;
}

// Chat message
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  reasoningSteps?: ReasoningStep[];
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

// Chat state
export interface ChatState {
  messages: Message[];
  currentStreamingMessageId: string | null;
  currentReasoningSteps: ReasoningStep[];
  currentToolCalls: Map<string, ToolCall>;
  currentSteps: Step[];
  isLoading: boolean;
  error: string | null;
  threadId: string;
  runId: string | null;
}

// Action types
export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'START_STREAMING'; payload: { messageId: string; runId: string } }
  | { type: 'UPDATE_STREAMING_MESSAGE'; payload: { delta: string } }
  | { type: 'ADD_REASONING_STEP'; payload: ReasoningStep }
  | { type: 'START_TOOL_CALL'; payload: { id: string; name: string } }
  | { type: 'UPDATE_TOOL_CALL'; payload: { id: string; argumentsDelta: string } }
  | { type: 'COMPLETE_TOOL_CALL'; payload: { id: string; result: string } }
  | { type: 'START_STEP'; payload: { name: string } }
  | { type: 'FINISH_STEP'; payload: { name: string } }
  | { type: 'FINISH_STREAMING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_CHAT' };

// Context type
export interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (content: string) => Promise<void>;
}

