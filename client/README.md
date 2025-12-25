# AG-UI Client

A React/TypeScript chat client that implements the AG-UI protocol with streaming, reasoning, and tool call visualization.

## Features

- **Streaming Messages**: Real-time display of AI responses as they're generated
- **Reasoning Visualization**: Collapsible display of AI thinking/reasoning steps
- **Tool Call Display**: Visual representation of tool calls with arguments and results
- **State Management**: Centralized state using React Context + useReducer
- **Modern UI**: Beautiful dark theme with Tailwind CSS animations

## Prerequisites

- Node.js 18 or later
- pnpm (recommended) or npm

## Setup

1. **Install pnpm** (if not already installed):

   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:

   ```bash
   cd client
   pnpm install
   ```

## Running the Client

```bash
cd client
pnpm dev
```

The client will start on `http://localhost:5173`.

## Configuration

The client connects to the AG-UI server at `http://localhost:8000/`. To change this, edit the `agent` configuration in `src/store/chatStore.tsx`:

```typescript
const agent = new HttpAgent({
  url: 'http://localhost:8000/',
});
```

## Project Structure

```
client/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main chat component
│   ├── index.css             # Tailwind CSS styles
│   ├── store/
│   │   ├── chatStore.tsx     # State management (Context + useReducer)
│   │   └── types.ts          # TypeScript type definitions
│   └── components/
│       ├── ChatMessage.tsx   # Message display component
│       ├── ReasoningStep.tsx # Reasoning visualization
│       └── ToolCall.tsx      # Tool call display
├── public/
│   └── vite.svg              # Favicon
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # This file
```

## State Management

The app uses React Context API with useReducer for state management:

### State Structure

```typescript
interface ChatState {
  messages: Message[];              // All chat messages
  currentStreamingMessageId: string | null;  // Active streaming message
  currentReasoningSteps: ReasoningStep[];    // Current reasoning steps
  currentToolCalls: Map<string, ToolCall>;   // Active tool calls
  isLoading: boolean;               // Loading state
  error: string | null;             // Error message
  threadId: string;                 // Chat thread ID
  runId: string | null;             // Current run ID
}
```

### Actions

- `ADD_MESSAGE` - Add a new message
- `START_STREAMING` - Begin streaming a response
- `UPDATE_STREAMING_MESSAGE` - Append content to streaming message
- `ADD_REASONING_STEP` - Add a reasoning step
- `START_TOOL_CALL` - Begin a tool call
- `UPDATE_TOOL_CALL` - Update tool call arguments
- `COMPLETE_TOOL_CALL` - Finish tool call with result
- `FINISH_STREAMING` - Complete the streaming response
- `SET_ERROR` / `CLEAR_ERROR` - Handle errors
- `RESET_CHAT` - Reset the chat

## Usage

1. Start the AG-UI server (see server README)
2. Start the client with `pnpm dev`
3. Open `http://localhost:5173` in your browser
4. Type a message and press Enter or click Send

### Testing Features

- **Streaming**: Send any message to see streaming responses
- **Tool Calls**: Ask a math question like "What is 15 * 23 + 42?" to trigger the calculate tool
- **Reasoning**: Reasoning steps will be displayed when the AI includes them (model-dependent)

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift+Enter` - New line in message

