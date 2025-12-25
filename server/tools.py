"""
Tool definitions and execution logic for the AG-UI server.
"""
import json
import random
from typing import Any

# Tool definitions in OpenAI format
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Perform mathematical calculations. Evaluates a mathematical expression and returns the result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to evaluate, e.g., '2 + 2', '15 * 23 + 42', 'sqrt(16)'"
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a given city. Returns temperature, conditions, and humidity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "The city name to get weather for, e.g., 'New York', 'London', 'Tokyo'"
                    },
                    "units": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature units (celsius or fahrenheit). Defaults to celsius."
                    }
                },
                "required": ["city"]
            }
        }
    }
]


def execute_tool(tool_name: str, arguments: str) -> str:
    """
    Execute a tool and return the result as a string.
    
    Args:
        tool_name: Name of the tool to execute
        arguments: JSON string of arguments
        
    Returns:
        Result as a string
    """
    try:
        args = json.loads(arguments)
    except json.JSONDecodeError:
        return f"Error: Invalid JSON arguments: {arguments}"
    
    if tool_name == "calculate":
        return calculate(args.get("expression", ""))
    elif tool_name == "get_weather":
        return get_weather(args.get("city", ""), args.get("units", "celsius"))
    else:
        return f"Error: Unknown tool '{tool_name}'"


def get_weather(city: str, units: str = "celsius") -> str:
    """
    Simulated weather API - returns mock weather data.
    
    Args:
        city: City name
        units: Temperature units (celsius or fahrenheit)
        
    Returns:
        Weather information as JSON string
    """
    if not city:
        return "Error: City name is required"
    
    # Simulated weather data
    conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Rainy", "Stormy", "Snowy", "Foggy", "Windy"]
    
    # Generate consistent but random-looking data based on city name
    seed = sum(ord(c) for c in city.lower())
    random.seed(seed)
    
    temp_celsius = random.randint(-10, 40)
    humidity = random.randint(30, 95)
    condition = random.choice(conditions)
    wind_speed = random.randint(0, 50)
    
    if units == "fahrenheit":
        temp = round(temp_celsius * 9/5 + 32)
        temp_unit = "°F"
    else:
        temp = temp_celsius
        temp_unit = "°C"
    
    result = {
        "city": city,
        "temperature": f"{temp}{temp_unit}",
        "condition": condition,
        "humidity": f"{humidity}%",
        "wind_speed": f"{wind_speed} km/h",
        "units": units
    }
    
    return json.dumps(result, indent=2)


def calculate(expression: str) -> str:
    """
    Safely evaluate a mathematical expression.
    
    Args:
        expression: Mathematical expression to evaluate
        
    Returns:
        Result as a string
    """
    import math
    
    # Define allowed names for safe evaluation
    allowed_names = {
        "abs": abs,
        "round": round,
        "min": min,
        "max": max,
        "sum": sum,
        "pow": pow,
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "pi": math.pi,
        "e": math.e,
    }
    
    try:
        # Compile expression to check for valid syntax
        code = compile(expression, "<string>", "eval")
        
        # Check that only allowed names are used
        for name in code.co_names:
            if name not in allowed_names:
                return f"Error: Use of '{name}' is not allowed"
        
        # Evaluate the expression safely
        result = eval(code, {"__builtins__": {}}, allowed_names)
        return str(result)
    except SyntaxError as e:
        return f"Error: Invalid expression syntax - {e}"
    except Exception as e:
        return f"Error: {str(e)}"

