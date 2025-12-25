# AG-UI Battle Test

A complete implementation for testing the AG-UI (Agent User Interaction) protocol with a Python server and React client.

## Overview

This project demonstrates the AG-UI protocol capabilities:

- **Streaming**: Real-time message streaming with Server-Sent Events
- **Reasoning**: Display of AI thinking/reasoning steps  
- **Tool Calls**: Execution and visualization of tool calls

## Architecture

```
┌─────────────────┐     AG-UI Events     ┌─────────────────┐
│     React       │ ◄───────────────────  │     Python      │
│     Client      │                       │     Server      │
│   (Vite + TS)   │ ──────────────────► │   (FastAPI)     │
└─────────────────┘    HTTP POST /       └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │     OpenAI      │
                                         │       API       │
                                         └─────────────────┘
```

## Quick Start

### 1. Start the Server

```bash
cd server
export OPENAI_API_KEY=your-api-key-here
poetry install
poetry run python server.py
```

Server runs on `http://localhost:8000`

### 2. Start the Client

```bash
cd client
pnpm install
pnpm dev
```

Client runs on `http://localhost:5173`

### 3. Test the Features

Open `http://localhost:5173` and try:

- **Streaming**: "Explain how neural networks work"
- **Tool Calls**: "What is 15 * 23 + 42?"
- **Complex Calculations**: "Calculate sqrt(144) + pow(2, 10)"

## Project Structure

```
ag-ui-tests/
├── server/                   # Python FastAPI server
│   ├── pyproject.toml        # Poetry dependencies
│   ├── server.py             # Main server with AG-UI events
│   ├── tools.py              # Tool definitions (calculate)
│   └── README.md             # Server documentation
│
├── client/                   # React TypeScript client
│   ├── src/
│   │   ├── App.tsx           # Main chat interface
│   │   ├── store/            # State management
│   │   └── components/       # UI components
│   ├── package.json          # npm dependencies
│   └── README.md             # Client documentation
│
└── README.md                 # This file
```

## AG-UI Events Implemented

### Lifecycle Events
- `RUN_STARTED` - Run begins
- `RUN_FINISHED` - Run completes successfully
- `RUN_ERROR` - Run encounters an error

### Content Events
- `TEXT_MESSAGE_START` - Assistant message begins
- `TEXT_MESSAGE_CONTENT` - Text content chunk
- `TEXT_MESSAGE_END` - Assistant message completes

### Tool Events
- `TOOL_CALL_START` - Tool call begins
- `TOOL_CALL_ARGS` - Tool arguments streaming
- `TOOL_CALL_END` - Tool call completes with result

## Technologies

### Server
- Python 3.12+
- FastAPI
- OpenAI Python SDK
- AG-UI Protocol SDK

### Client
- React 18
- TypeScript
- Vite
- Tailwind CSS
- @ag-ui/client

## Resources

- [AG-UI Documentation](https://docs.ag-ui.com)
- [AG-UI Server Quickstart](https://docs.ag-ui.com/quickstart/server)
- [AG-UI Client Quickstart](https://docs.ag-ui.com/quickstart/clients)

