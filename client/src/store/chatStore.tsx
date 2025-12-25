/**
 * Chat state management using React Context API + useReducer.
 */
import { createContext, useContext, useReducer, useCallback, ReactNode, useRef } from 'react';
import { HttpAgent } from '@ag-ui/client';
import type { AgentSubscriber } from '@ag-ui/client';
import {
  ChatState,
  ChatAction,
  ChatContextType,
  Message,
  Step,
} from './types';

// Generate unique IDs
const generateId = () => crypto.randomUUID();

// Initial state
const initialState: ChatState = {
  messages: [],
  currentStreamingMessageId: null,
  currentReasoningSteps: [],
  currentToolCalls: new Map(),
  currentSteps: [],
  isLoading: false,
  error: null,
  threadId: generateId(),
  runId: null,
};

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'START_STREAMING':
      return {
        ...state,
        isLoading: true,
        currentStreamingMessageId: action.payload.messageId,
        runId: action.payload.runId,
        currentReasoningSteps: [],
        currentToolCalls: new Map(),
        currentSteps: [],
        messages: [
          ...state.messages,
          {
            id: action.payload.messageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
            reasoningSteps: [],
            toolCalls: [],
          },
        ],
      };

    case 'UPDATE_STREAMING_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, content: msg.content + action.payload.delta }
            : msg
        ),
      };

    case 'ADD_REASONING_STEP':
      const newReasoningSteps = [...state.currentReasoningSteps, action.payload];
      return {
        ...state,
        currentReasoningSteps: newReasoningSteps,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, reasoningSteps: newReasoningSteps }
            : msg
        ),
      };

    case 'START_TOOL_CALL': {
      const newToolCall = {
        id: action.payload.id,
        name: action.payload.name,
        arguments: '',
        status: 'pending' as const,
      };
      const newToolCalls = new Map(state.currentToolCalls);
      newToolCalls.set(action.payload.id, newToolCall);
      
      return {
        ...state,
        currentToolCalls: newToolCalls,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, toolCalls: Array.from(newToolCalls.values()) }
            : msg
        ),
      };
    }

    case 'UPDATE_TOOL_CALL': {
      const existingToolCall = state.currentToolCalls.get(action.payload.id);
      if (!existingToolCall) return state;
      
      const updatedToolCall = {
        ...existingToolCall,
        arguments: existingToolCall.arguments + action.payload.argumentsDelta,
        status: 'executing' as const,
      };
      const updatedToolCalls = new Map(state.currentToolCalls);
      updatedToolCalls.set(action.payload.id, updatedToolCall);
      
      return {
        ...state,
        currentToolCalls: updatedToolCalls,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, toolCalls: Array.from(updatedToolCalls.values()) }
            : msg
        ),
      };
    }

    case 'COMPLETE_TOOL_CALL': {
      const existingToolCall = state.currentToolCalls.get(action.payload.id);
      if (!existingToolCall) return state;
      
      const completedToolCall = {
        ...existingToolCall,
        result: action.payload.result,
        status: 'completed' as const,
      };
      const completedToolCalls = new Map(state.currentToolCalls);
      completedToolCalls.set(action.payload.id, completedToolCall);
      
      return {
        ...state,
        currentToolCalls: completedToolCalls,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, toolCalls: Array.from(completedToolCalls.values()) }
            : msg
        ),
      };
    }

    case 'START_STEP': {
      const newStep: Step = {
        id: generateId(),
        name: action.payload.name,
        status: 'in_progress',
        startedAt: Date.now(),
      };
      return {
        ...state,
        currentSteps: [...state.currentSteps, newStep],
      };
    }

    case 'FINISH_STEP': {
      return {
        ...state,
        currentSteps: state.currentSteps.map((step) =>
          step.name === action.payload.name && step.status === 'in_progress'
            ? { ...step, status: 'completed' as const, finishedAt: Date.now() }
            : step
        ),
      };
    }

    case 'FINISH_STREAMING':
      return {
        ...state,
        isLoading: false,
        currentStreamingMessageId: null,
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, isStreaming: false }
            : msg
        ),
      };

    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        currentStreamingMessageId: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'RESET_CHAT':
      return {
        ...initialState,
        threadId: generateId(),
      };

    default:
      return state;
  }
}

// Create context
const ChatContext = createContext<ChatContextType | null>(null);

// AG-UI Agent
const agent = new HttpAgent({
  url: 'http://localhost:8000/',
});

// Provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  // Use ref to get current state in callbacks without stale closure
  const stateRef = useRef(state);
  stateRef.current = state;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = generateId();
    const runId = generateId();
    const assistantMessageId = generateId();

    // Add user message
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

    // Start streaming assistant message
    dispatch({
      type: 'START_STREAMING',
      payload: { messageId: assistantMessageId, runId },
    });

    try {
      // Build messages for the API - AG-UI requires id field
      const apiMessages = [
        ...state.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })),
        { id: userMessageId, role: 'user' as const, content: content.trim() },
      ];

      // Define the tools for the client
      const tools = [
        {
          name: 'calculate',
          description: 'Perform mathematical calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'The mathematical expression to evaluate',
              },
            },
            required: ['expression'],
          },
        },
        {
          name: 'get_weather',
          description: 'Get the current weather for a given city',
          parameters: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'The city name to get weather for',
              },
              units: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'Temperature units',
              },
            },
            required: ['city'],
          },
        },
      ];

      // Create subscriber with event callbacks
      const subscriber: AgentSubscriber = {
        onEvent({ event }) {
          console.log('[AG-UI Client] Event:', event.type, event);
          
          // Handle thinking events (check various possible type names)
          const eventType = String(event.type);
          if (eventType === 'THINKING_TEXT_MESSAGE_CONTENT' || 
              eventType.includes('THINKING')) {
            const thinkingEvent = event as any;
            const delta = thinkingEvent.delta || thinkingEvent.content || '';
            if (delta) {
              console.log('[AG-UI Client] Thinking content:', delta);
              dispatch({
                type: 'ADD_REASONING_STEP',
                payload: {
                  id: generateId(),
                  content: delta,
                  timestamp: Date.now(),
                },
              });
            }
          }
          
          // Handle tool call result event (might be separate from end)
          if (eventType === 'TOOL_CALL_RESULT') {
            const resultEvent = event as any;
            console.log('[AG-UI Client] Tool call result:', resultEvent);
            dispatch({
              type: 'COMPLETE_TOOL_CALL',
              payload: {
                id: resultEvent.toolCallId,
                result: resultEvent.result || '',
              },
            });
          }
          
          // Handle step events
          if (eventType === 'STEP_STARTED') {
            const stepEvent = event as any;
            console.log('[AG-UI Client] Step started:', stepEvent.stepName);
            dispatch({
              type: 'START_STEP',
              payload: { name: stepEvent.stepName },
            });
          }
          
          if (eventType === 'STEP_FINISHED') {
            const stepEvent = event as any;
            console.log('[AG-UI Client] Step finished:', stepEvent.stepName);
            dispatch({
              type: 'FINISH_STEP',
              payload: { name: stepEvent.stepName },
            });
          }
        },

        onTextMessageContentEvent({ event, textMessageBuffer }) {
          console.log('[AG-UI Client] Text content:', event.delta, 'Buffer:', textMessageBuffer);
          dispatch({
            type: 'UPDATE_STREAMING_MESSAGE',
            payload: { delta: event.delta },
          });
        },

        onToolCallStartEvent({ event }) {
          console.log('[AG-UI Client] Tool call start:', event.toolCallName, event);
          dispatch({
            type: 'START_TOOL_CALL',
            payload: {
              id: event.toolCallId,
              name: event.toolCallName,
            },
          });
        },

        onToolCallArgsEvent({ event }) {
          console.log('[AG-UI Client] Tool call args:', event.delta);
          dispatch({
            type: 'UPDATE_TOOL_CALL',
            payload: {
              id: event.toolCallId,
              argumentsDelta: event.delta,
            },
          });
        },

        onToolCallEndEvent({ event, toolCallName, toolCallArgs }) {
          console.log('[AG-UI Client] Tool call end:', event, 'Name:', toolCallName, 'Args:', toolCallArgs);
          // Check multiple possible property names for the result
          const result = (event as any).result || 
                        (event as any).output || 
                        (event as any).toolCallResult ||
                        '';
          console.log('[AG-UI Client] Tool call end result:', result);
          if (result) {
            dispatch({
              type: 'COMPLETE_TOOL_CALL',
              payload: {
                id: event.toolCallId,
                result: result,
              },
            });
          }
        },

        // Handle tool call result event (might be separate from end)
        onToolCallResultEvent({ event }) {
          console.log('[AG-UI Client] Tool call RESULT:', event);
          const result = (event as any).result || (event as any).content || '';
          dispatch({
            type: 'COMPLETE_TOOL_CALL',
            payload: {
              id: (event as any).toolCallId,
              result: result,
            },
          });
        },

        onRunErrorEvent({ event }) {
          console.error('[AG-UI Client] Error:', event.message);
          dispatch({
            type: 'SET_ERROR',
            payload: event.message || 'An error occurred',
          });
        },

        onRunFinishedEvent() {
          console.log('[AG-UI Client] Run finished');
          dispatch({ type: 'FINISH_STREAMING' });
        },

        onRunFailed({ error }) {
          console.error('[AG-UI Client] Run failed:', error);
          dispatch({
            type: 'SET_ERROR',
            payload: error.message || 'Failed to send message',
          });
        },
      };

      // Set messages and run the agent with subscriber
      // Cast to any to avoid strict typing issues with AG-UI message types
      agent.setMessages(apiMessages as any);
      
      console.log('[AG-UI Client] Running agent with messages:', apiMessages);
      
      await agent.runAgent(
        {
          runId,
          tools,
        },
        subscriber
      );

      // Ensure we finish streaming
      dispatch({ type: 'FINISH_STREAMING' });
    } catch (error) {
      console.error('[AG-UI Client] Error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }, [state.messages]);

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook for using the chat context
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
