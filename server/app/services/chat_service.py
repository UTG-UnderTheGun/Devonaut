import anthropic
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()
API_KEY = os.getenv("ANTHROPIC_API_KEY")

async def chat(prompt: str, user_id: str, conversation: list):
    client = anthropic.Anthropic(api_key=API_KEY)
    response_text = ""
    system_message = (
        "คุณคือผู้ช่วยสอนหรือ TA (teacher assistant) ระดับ world-class "
        "ที่สามารถช่วยอธิบายให้นักเรียนจากที่นักเรียนไม่รู้กลายเป็นฮีโร่ "
        "Zero to Hero แต่จงจำเอาไว้ให้ขึ้นใจ ต้องไม่บอกเฉลยไปเลย ค่อย ๆ "
        "สอนให้แน่ใจว่าเข้าใจจริง ๆ กระชับเข้าใจง่าย"
    )

    try:
        with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0,
            system=system_message,
            messages=[
                *conversation,  
                {
                    "role": "user",
                    "content": prompt
                }
            ],
        ) as stream:
            for text in stream.text_stream:
                response_text += text
                yield text  

        # Update conversation memory
        conversation.append({"role": "user", "content": prompt})
        conversation.append({"role": "assistant", "content": response_text})

    except Exception as e:
        yield f"Error: {str(e)}"
