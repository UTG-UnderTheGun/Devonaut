import anthropic
import os
from dotenv import load_dotenv
import asyncio
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
API_KEY = os.getenv("ANTHROPIC_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
MAX_TOKENS = int(os.getenv("MAX_RESPONSE_TOKENS", "1024"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0"))
MAX_CONVERSATION_LENGTH = int(os.getenv("MAX_CONVERSATION_LENGTH", "10"))

# MongoDB connection with proper connection pooling
client = MongoClient(
    MONGO_URI, maxPoolSize=50, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000
)
db = client["mydatabase"]
users_collection = db["users"]


async def chat(prompt: str, user_id: str, conversation: list):
    """
    Generate a streaming chat response using the Anthropic Claude API.

    Args:
        prompt (str): The user's prompt/question
        user_id (str): The MongoDB ObjectId of the user as a string
        conversation (list): The conversation history list

    Yields:
        str: Chunks of the response as they are generated
    """
    anthropic_client = anthropic.Anthropic(api_key=API_KEY)
    response_text = ""

    try:
        # Get user's skill level from database with error handling
        skill_level = "beginner"  # Default in case of errors
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                skill_level = user.get("skill_level", "beginner")
                logger.info(f"User {user_id} skill level: {skill_level}")
            else:
                logger.warning(f"User {user_id} not found in database")
        except PyMongoError as db_error:
            logger.error(f"Database error retrieving user: {str(db_error)}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving user: {str(e)}")

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
            ),
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

        # Ensure conversation is not too long
        if len(conversation) > MAX_CONVERSATION_LENGTH * 2:
            # Keep only the most recent messages (in pairs of user and assistant)
            conversation = conversation[-MAX_CONVERSATION_LENGTH * 2 :]
            logger.info(
                f"Trimmed conversation history for user {user_id} to {len(conversation)} messages"
            )

        try:
            with anthropic_client.messages.stream(
                model=MODEL_NAME,
                max_tokens=MAX_TOKENS,
                temperature=TEMPERATURE,
                system=system_message,
                messages=[*conversation, {"role": "user", "content": prompt}],
            ) as stream:
                for text in stream.text_stream:
                    response_text += text
                    yield text

            # Don't append to conversation here - the router now handles this
            # Simply return the response and let the router handle storage

        except anthropic.APIError as api_error:
            error_message = f"Anthropic API error: {str(api_error)}"
            logger.error(error_message)
            yield error_message

        except anthropic.APIConnectionError as conn_error:
            error_message = f"Connection error: {str(conn_error)}"
            logger.error(error_message)
            yield error_message

        except anthropic.RateLimitError as rate_error:
            error_message = f"Rate limit exceeded: {str(rate_error)}"
            logger.error(error_message)
            yield error_message

        except Exception as e:
            error_message = f"Unexpected error during API call: {str(e)}"
            logger.error(error_message)
            yield error_message

    except Exception as e:
        error_message = f"Error in chat service: {str(e)}"
        logger.error(error_message)
        yield error_message
