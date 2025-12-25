"""
AG-UI Protocol Server with OpenAI Integration.

This server implements the AG-UI protocol to stream events from OpenAI,
including support for reasoning, tool calls, and text streaming.
"""
import os
import uuid
import logging
from typing import AsyncGenerator

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from ag_ui.core import (
    RunAgentInput,
    EventType,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    TextMessageStartEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ThinkingStartEvent,
    ThinkingEndEvent,
    ThinkingTextMessageStartEvent,
    ThinkingTextMessageContentEvent,
    ThinkingTextMessageEndEvent,
)
from ag_ui.encoder import EventEncoder
import re

from tools import TOOLS, execute_tool

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(title="AG-UI OpenAI Server")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize async OpenAI client for proper streaming
client = AsyncOpenAI()


@app.post("/debug")
async def debug_endpoint(request: Request):
    """Debug endpoint to see raw request body."""
    body = await request.body()
    import json
    try:
        parsed = json.loads(body)
        logger.info(f"Raw request body (parsed): {json.dumps(parsed, indent=2)}")
        return {"received": parsed}
    except:
        logger.info(f"Raw request body: {body}")
        return {"received": body.decode()}


@app.post("/")
async def agentic_chat_endpoint(request: Request):
    """
    Main AG-UI agentic chat endpoint.
    
    Accepts RunAgentInput and streams AG-UI events back.
    """
    # Parse body manually to debug
    body = await request.body()
    import json
    try:
        raw_data = json.loads(body)
        logger.info(f"Raw request body: {json.dumps(raw_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse body: {e}")
        raw_data = {}
    
    # Try to parse as RunAgentInput
    try:
        input_data = RunAgentInput(**raw_data)
    except Exception as e:
        logger.error(f"Failed to parse RunAgentInput: {e}")
        # Try with camelCase to snake_case conversion
        def camel_to_snake(name):
            import re
            return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
        
        converted = {camel_to_snake(k): v for k, v in raw_data.items()}
        logger.info(f"Converted to snake_case: {converted}")
        input_data = RunAgentInput(**converted)
    
    logger.info(f"Received request - thread_id: {input_data.thread_id}, run_id: {input_data.run_id}")
    logger.debug(f"Messages: {input_data.messages}")
    logger.debug(f"Tools: {input_data.tools}")
    
    accept_header = request.headers.get("accept")
    logger.debug(f"Accept header: {accept_header}")
    encoder = EventEncoder(accept=accept_header)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Emit run started event
            logger.info("Emitting RUN_STARTED event")
            yield encoder.encode(
                RunStartedEvent(
                    type=EventType.RUN_STARTED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id
                )
            )

            # System prompt to encourage thinking
            system_prompt = """You are a helpful AI assistant. When answering complex questions or performing calculations:

1. First, wrap your thinking/reasoning process in <thinking>...</thinking> tags
2. Then provide your final answer outside the tags

For simple questions, you can skip the thinking tags.

You have access to tools:
- calculate: for mathematical expressions
- get_weather: for weather information

Example for complex questions:
<thinking>
Let me break this down step by step...
First, I need to...
Then I'll calculate...
</thinking>

The answer is..."""

            # Convert messages to OpenAI format
            messages = [{"role": "system", "content": system_prompt}]
            for message in input_data.messages:
                msg_dict = {
                    "role": message.role,
                    "content": message.content or "",
                }
                
                # Handle tool calls in assistant messages
                if message.role == "assistant" and hasattr(message, 'tool_calls') and message.tool_calls:
                    msg_dict["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in message.tool_calls
                    ]
                
                # Handle tool result messages
                if message.role == "tool" and hasattr(message, 'tool_call_id'):
                    msg_dict["tool_call_id"] = message.tool_call_id
                
                messages.append(msg_dict)

            # Call OpenAI with streaming (async)
            logger.info("Calling OpenAI API...")
            stream = await client.chat.completions.create(
                model="gpt-4o",
                stream=True,
                tools=TOOLS if TOOLS else None,
                messages=messages,
            )
            logger.info("OpenAI stream created successfully")

            message_id = str(uuid.uuid4())
            thinking_message_id = str(uuid.uuid4())
            current_tool_call_id = None
            current_tool_call_name = None
            current_tool_call_args = ""
            has_text_content = False
            has_started_text_message = False
            has_started_thinking = False
            is_in_thinking = False
            content_buffer = ""

            # Process stream chunks (async iteration)
            async for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue
                
                delta = choice.delta
                
                # Handle text content
                if delta.content:
                    content_buffer += delta.content
                    logger.debug(f"Buffer now: {content_buffer[-100:]}")
                    
                    # Process buffer - look for thinking tags
                    while True:
                        if not is_in_thinking:
                            # Look for <thinking> tag
                            if "<thinking>" in content_buffer:
                                # Split at the tag
                                before, after = content_buffer.split("<thinking>", 1)
                                
                                # Emit any content before the thinking tag as regular text
                                if before.strip():
                                    if not has_started_text_message:
                                        logger.info("Emitting TEXT_MESSAGE_START event")
                                        yield encoder.encode(
                                            TextMessageStartEvent(
                                                type=EventType.TEXT_MESSAGE_START,
                                                message_id=message_id,
                                                role="assistant"
                                            )
                                        )
                                        has_started_text_message = True
                                    yield encoder.encode(
                                        TextMessageContentEvent(
                                            type=EventType.TEXT_MESSAGE_CONTENT,
                                            message_id=message_id,
                                            delta=before
                                        )
                                    )
                                    has_text_content = True
                                
                                # Start thinking
                                is_in_thinking = True
                                if not has_started_thinking:
                                    # First emit THINKING_START to begin the thinking phase
                                    logger.info("Emitting THINKING_START event")
                                    yield encoder.encode(
                                        ThinkingStartEvent(
                                            type=EventType.THINKING_START
                                        )
                                    )
                                    # Then emit THINKING_TEXT_MESSAGE_START
                                    logger.info("Emitting THINKING_TEXT_MESSAGE_START event")
                                    yield encoder.encode(
                                        ThinkingTextMessageStartEvent(
                                            type=EventType.THINKING_TEXT_MESSAGE_START
                                        )
                                    )
                                    has_started_thinking = True
                                
                                content_buffer = after
                                continue  # Check for more tags
                            else:
                                # No thinking tag, emit as regular content
                                # But wait in case tag is being split across chunks
                                if "<" in content_buffer and not content_buffer.endswith(">"):
                                    # Might be partial tag, wait for more content
                                    break
                                
                                if content_buffer.strip():
                                    if not has_started_text_message:
                                        logger.info("Emitting TEXT_MESSAGE_START event")
                                        yield encoder.encode(
                                            TextMessageStartEvent(
                                                type=EventType.TEXT_MESSAGE_START,
                                                message_id=message_id,
                                                role="assistant"
                                            )
                                        )
                                        has_started_text_message = True
                                    yield encoder.encode(
                                        TextMessageContentEvent(
                                            type=EventType.TEXT_MESSAGE_CONTENT,
                                            message_id=message_id,
                                            delta=content_buffer
                                        )
                                    )
                                    has_text_content = True
                                content_buffer = ""
                                break
                        else:
                            # We're in thinking mode - look for </thinking>
                            if "</thinking>" in content_buffer:
                                # Split at the closing tag
                                thinking_content, after = content_buffer.split("</thinking>", 1)
                                
                                # Emit thinking content
                                if thinking_content.strip():
                                    logger.info(f"Emitting thinking content: {thinking_content[:50]}...")
                                    yield encoder.encode(
                                        ThinkingTextMessageContentEvent(
                                            type=EventType.THINKING_TEXT_MESSAGE_CONTENT,
                                            delta=thinking_content
                                        )
                                    )
                                
                                # End thinking
                                logger.info("Emitting THINKING_TEXT_MESSAGE_END event")
                                yield encoder.encode(
                                    ThinkingTextMessageEndEvent(
                                        type=EventType.THINKING_TEXT_MESSAGE_END
                                    )
                                )
                                # End the thinking phase
                                logger.info("Emitting THINKING_END event")
                                yield encoder.encode(
                                    ThinkingEndEvent(
                                        type=EventType.THINKING_END
                                    )
                                )
                                is_in_thinking = False
                                content_buffer = after
                                continue  # Check for more content
                            else:
                                # Still in thinking, wait in case tag is split
                                if "<" in content_buffer and not content_buffer.endswith(">"):
                                    # Might be partial closing tag, wait
                                    break
                                
                                # Emit thinking content
                                if content_buffer.strip():
                                    logger.debug(f"Emitting thinking chunk: {content_buffer[:30]}...")
                                    yield encoder.encode(
                                        ThinkingTextMessageContentEvent(
                                            type=EventType.THINKING_TEXT_MESSAGE_CONTENT,
                                            delta=content_buffer
                                        )
                                    )
                                content_buffer = ""
                                break
                
                # Handle tool calls
                if delta.tool_calls:
                    logger.debug(f"Tool calls in delta: {delta.tool_calls}")
                    for tool_call in delta.tool_calls:
                        # New tool call starting
                        if tool_call.id:
                            logger.info(f"New tool call starting: {tool_call.id}")
                            # End previous tool call if exists
                            if current_tool_call_id:
                                # Execute the tool
                                logger.info(f"Executing tool: {current_tool_call_name} with args: {current_tool_call_args}")
                                result = execute_tool(current_tool_call_name, current_tool_call_args)
                                logger.info(f"Tool result: {result}")
                                
                                yield encoder.encode(
                                    ToolCallEndEvent(
                                        type=EventType.TOOL_CALL_END,
                                        tool_call_id=current_tool_call_id,
                                        result=result
                                    )
                                )
                            
                            current_tool_call_id = tool_call.id
                            current_tool_call_name = tool_call.function.name if tool_call.function else None
                            current_tool_call_args = tool_call.function.arguments if tool_call.function else ""
                            
                            logger.info(f"Emitting TOOL_CALL_START: {current_tool_call_name}")
                            yield encoder.encode(
                                ToolCallStartEvent(
                                    type=EventType.TOOL_CALL_START,
                                    tool_call_id=current_tool_call_id,
                                    tool_call_name=current_tool_call_name,
                                    parent_message_id=message_id
                                )
                            )
                        
                        # Tool call arguments streaming
                        if tool_call.function and tool_call.function.arguments:
                            current_tool_call_args += tool_call.function.arguments
                            logger.debug(f"Tool args delta: {tool_call.function.arguments}")
                            
                            yield encoder.encode(
                                ToolCallArgsEvent(
                                    type=EventType.TOOL_CALL_ARGS,
                                    tool_call_id=current_tool_call_id,
                                    delta=tool_call.function.arguments
                                )
                            )
                
                # Check for finish reason
                if choice.finish_reason:
                    logger.info(f"Finish reason: {choice.finish_reason}")
                    
                    # End any pending tool call and collect results
                    tool_results = []
                    if current_tool_call_id:
                        logger.info(f"Executing final tool: {current_tool_call_name}")
                        result = execute_tool(current_tool_call_name, current_tool_call_args)
                        logger.info(f"Tool result: {result}")
                        
                        yield encoder.encode(
                            ToolCallEndEvent(
                                type=EventType.TOOL_CALL_END,
                                tool_call_id=current_tool_call_id,
                                result=result
                            )
                        )
                        
                        tool_results.append({
                            "tool_call_id": current_tool_call_id,
                            "name": current_tool_call_name,
                            "arguments": current_tool_call_args,
                            "result": result
                        })
                    
                    # End text message if started
                    if has_started_text_message:
                        logger.info("Emitting TEXT_MESSAGE_END event")
                        yield encoder.encode(
                            TextMessageEndEvent(
                                type=EventType.TEXT_MESSAGE_END,
                                message_id=message_id
                            )
                        )
                    
                    # If we had tool calls, continue the conversation with OpenAI
                    if choice.finish_reason == "tool_calls" and tool_results:
                        logger.info("Tool calls completed, continuing conversation with OpenAI...")
                        
                        # Build the assistant message with tool calls
                        assistant_tool_calls = [
                            {
                                "id": tr["tool_call_id"],
                                "type": "function",
                                "function": {
                                    "name": tr["name"],
                                    "arguments": tr["arguments"]
                                }
                            }
                            for tr in tool_results
                        ]
                        
                        # Add assistant message with tool calls
                        messages.append({
                            "role": "assistant",
                            "content": None,
                            "tool_calls": assistant_tool_calls
                        })
                        
                        # Add tool result messages
                        for tr in tool_results:
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tr["tool_call_id"],
                                "content": tr["result"]
                            })
                        
                        # Call OpenAI again to get the final response
                        logger.info("Calling OpenAI again for final response...")
                        continuation_stream = await client.chat.completions.create(
                            model="gpt-4o",
                            stream=True,
                            messages=messages,
                        )
                        
                        # Process continuation stream
                        continuation_message_id = str(uuid.uuid4())
                        continuation_started = False
                        
                        async for cont_chunk in continuation_stream:
                            cont_choice = cont_chunk.choices[0] if cont_chunk.choices else None
                            if not cont_choice:
                                continue
                            
                            cont_delta = cont_choice.delta
                            
                            if cont_delta.content:
                                if not continuation_started:
                                    logger.info("Emitting continuation TEXT_MESSAGE_START")
                                    yield encoder.encode(
                                        TextMessageStartEvent(
                                            type=EventType.TEXT_MESSAGE_START,
                                            message_id=continuation_message_id,
                                            role="assistant"
                                        )
                                    )
                                    continuation_started = True
                                
                                yield encoder.encode(
                                    TextMessageContentEvent(
                                        type=EventType.TEXT_MESSAGE_CONTENT,
                                        message_id=continuation_message_id,
                                        delta=cont_delta.content
                                    )
                                )
                            
                            if cont_choice.finish_reason:
                                if continuation_started:
                                    yield encoder.encode(
                                        TextMessageEndEvent(
                                            type=EventType.TEXT_MESSAGE_END,
                                            message_id=continuation_message_id
                                        )
                                    )

            # Emit run finished event
            logger.info("Emitting RUN_FINISHED event")
            yield encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id
                )
            )

        except Exception as error:
            logger.error(f"Error in event generator: {error}", exc_info=True)
            yield encoder.encode(
                RunErrorEvent(
                    type=EventType.RUN_ERROR,
                    message=str(error)
                )
            )

    # Return streaming response with proper SSE headers to prevent buffering
    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )


if __name__ == "__main__":
    main()

