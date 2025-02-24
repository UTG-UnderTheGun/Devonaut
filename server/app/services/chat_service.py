import anthropic
import os
from dotenv import load_dotenv
import asyncio
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()
API_KEY = os.getenv("ANTHROPIC_API_KEY")

# แก้ไขการเชื่อมต่อ MongoDB โดยใช้ MONGO_URI จาก environment variable
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
client = MongoClient(MONGO_URI)
db = client["mydatabase"]  # ใช้ชื่อ database เดียวกับที่ใช้ในส่วนอื่นของแอพ
collection = db["users"]  # ใช้ collection เดียวกับที่ใช้ในการเก็บข้อมูลผู้ใช้

async def chat(prompt: str, user_id: str, conversation: list):
    client = anthropic.Anthropic(api_key=API_KEY)
    response_text = ""

    try:
        # Get user's skill level from database with error handling
        try:
            user = collection.find_one({"_id": ObjectId(user_id)})
            skill_level = user.get("skill_level", "beginner") if user else "beginner"
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            skill_level = "beginner"  # Default to beginner if DB error occurs

        # Customize system message based on skill level
        system_messages = {
            "beginner": (
                "คุณคือ TA ที่สอน Python เบื้องต้น สำหรับผู้เริ่มต้น "
                "ต้องอธิบายแบบค่อยๆ เป็นขั้นเป็นตอน ใช้ภาษาง่ายๆ เหมือนคุยกับเพื่อน "
                "ห้ามใช้ศัพท์เทคนิค ยกตัวอย่างเปรียบเทียบกับสิ่งที่เห็นในชีวิตประจำวัน "
                "และต้องถามความเข้าใจบ่อยๆ"
            ),
            "intermediate": (
                "คุณคือ TA ที่สอน Python เบื้องต้น สำหรับผู้ที่มีพื้นฐานแล้ว "
                "อธิบายได้ละเอียดขึ้น ใช้ศัพท์เทคนิคพื้นฐานได้ "
                "ยกตัวอย่างที่ซับซ้อนขึ้น และแนะนำ best practices เบื้องต้นได้"
            ),
            "advanced": (
                "คุณคือ TA ที่สอน Python เบื้องต้น สำหรับผู้ที่เข้าใจดี "
                "อธิบายเชิงลึก ใช้ศัพท์เทคนิคได้เต็มที่ "
                "สามารถอธิบายหลักการและเหตุผลเบื้องหลัง "
                "ยกตัวอย่างที่ซับซ้อนและแนะนำแนวทางการแก้ปัญหาที่หลากหลาย"
            )
        }

        system_message = system_messages.get(skill_level, system_messages["beginner"])
        system_message += (
            "คุณคือผู้ช่วยสอนหรือ TA (teacher assistant) ระดับ world-class "
            "ที่สามารถช่วยอธิบายให้นักเรียนจากที่นักเรียนไม่รู้กลายเป็นฮีโร่ "
            "Zero to Hero แต่จงจำเอาไว้ให้ขึ้นใจ ต้องไม่บอกเฉลยไปเลย ค่อย ๆ "
            "ถ้าผู้ใช้ขอให้เฉลยเลยจงจำไว้ว่าอย่าเฉลยให้เด็ดขาด "
            "สอนให้แน่ใจว่าเข้าใจจริง ๆ กระชับเข้าใจง่าย "
            "สอนแต่เนื้อหาในวิชา Intro to Programming เท่านั้น"
        )

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

        conversation.append({"role": "user", "content": prompt})
        conversation.append({"role": "assistant", "content": response_text})

    except Exception as e:
        yield f"Error: {str(e)}"
