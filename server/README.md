# AG-UI Server

A Python FastAPI server that implements the AG-UI protocol with OpenAI integration.

## Features

- **Streaming Responses**: Real-time streaming of AI responses using Server-Sent Events (SSE)
- **Tool Support**: Built-in `calculate` tool for mathematical operations
- **AG-UI Protocol**: Full implementation of AG-UI events (RUN_STARTED, TEXT_MESSAGE_*, TOOL_CALL_*, RUN_FINISHED, RUN_ERROR)
- **OpenAI Integration**: Powered by GPT-4o

## Prerequisites

- Python 3.12 or later
- Poetry (for dependency management)
- OpenAI API key

## Setup

1. **Install Poetry** (if not already installed):

   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Install dependencies**:

   ```bash
   cd server
   poetry install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the server directory:

   ```bash
   OPENAI_API_KEY=your-api-key-here
   PORT=8000
   ```

## Running the Server

```bash
cd server
poetry run python server.py
```

The server will start on `http://localhost:8000`.

## API Endpoints

### POST `/`

Main AG-UI chat endpoint. Accepts `RunAgentInput` and streams AG-UI events.

**Request Body**:

```json
{
  "thread_id": "unique-thread-id",
  "run_id": "unique-run-id",
  "messages": [
    {
      "role": "user",
      "content": "What is 15 * 23 + 42?"
    }
  ],
  "tools": [
    {
      "name": "calculate",
      "description": "Perform mathematical calculations",
      "parameters": {
        "type": "object",
        "properties": {
          "expression": {
            "type": "string",
            "description": "The mathematical expression to evaluate"
          }
        },
        "required": ["expression"]
      }
    }
  ]
}
```

**Response**: Server-Sent Events stream with AG-UI events.

### GET `/health`

Health check endpoint.

## Tools

### calculate

Performs safe mathematical calculations.

**Supported Operations**:
- Basic arithmetic: `+`, `-`, `*`, `/`
- Power: `pow(x, y)`
- Square root: `sqrt(x)`
- Trigonometry: `sin`, `cos`, `tan`
- Logarithms: `log`, `log10`
- Constants: `pi`, `e`

**Example**:

```json
{
  "expression": "sqrt(16) + pow(2, 3)"
}
```

Returns: `12.0`

## Project Structure

```
server/
├── pyproject.toml    # Poetry configuration
├── server.py         # Main FastAPI application
├── tools.py          # Tool definitions and execution
└── README.md         # This file
```

