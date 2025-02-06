from fastapi import FastAPI
import json

CODE_JSON = """
{
    "title": "EX1",
    "details": {
        "id":"1",
        "code":"print(1+1)"
    }
}
"""


async def export_code():
    response = json.loads(CODE_JSON)
    return {"title": response["title"], "details": response["details"]}

