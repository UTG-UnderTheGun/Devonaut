import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import logging
import asyncio
from app.api.v1.endpoints import auth, user, code, ai, test
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CustomFastAPI(FastAPI):
    mongodb_client: Optional[AsyncIOMotorClient] = None
    mongodb: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> AsyncIOMotorClient:
    """Connect to MongoDB with retry logic"""
    mongo_uri = os.getenv("MONGO_URI")
    try:
        client = AsyncIOMotorClient(mongo_uri)
        await client.admin.command("ping")
        logger.info("Successfully connected to MongoDB")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise


async def connect_to_redis(retries=5, delay=1):
    """Connect to Redis with retry logic"""
    for attempt in range(retries):
        try:
            redis_instance = redis.Redis(
                host=os.getenv("REDIS_HOST", "redis"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=0,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            await redis_instance.ping()
            logger.info("Successfully connected to Redis")
            return redis_instance
        except redis.ConnectionError as e:
            if attempt == retries - 1:
                logger.error(f"Failed to connect to Redis after {retries} attempts")
                raise
            logger.warning(
                f"Redis connection attempt {attempt + 1} failed, retrying..."
            )
            await asyncio.sleep(delay)


@asynccontextmanager
async def lifespan(app: CustomFastAPI):
    """Lifespan context manager for FastAPI application."""
    try:
        client = await connect_to_mongo()
        app.mongodb_client = client
        if app.mongodb_client is not None:
            app.mongodb = app.mongodb_client[os.getenv("MONGODB_DB", "users")]

        redis_instance = await connect_to_redis()
        await FastAPILimiter.init(redis_instance)

        logger.info("All services initialized successfully")
        yield
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    finally:
        if app.mongodb_client:
            app.mongodb_client.close()
        redis_instance = await FastAPILimiter.get_redis()
        if redis_instance:
            await redis_instance.close()


app = CustomFastAPI(lifespan=lifespan, debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(code.router, prefix="/code", tags=["api"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(test.router, prefix="/test", tags=["test"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
