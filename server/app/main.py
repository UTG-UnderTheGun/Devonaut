import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import logging
import asyncio
from app.api.v1.endpoints import auth, user, code, ai, test, teacher
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CustomFastAPI(FastAPI):
    mongodb_client: Optional[AsyncIOMotorClient] = None
    mongodb: Optional[AsyncIOMotorDatabase] = None
    redis_instance: Optional[redis.Redis] = None


async def connect_to_mongo(retries=5, delay=2) -> AsyncIOMotorClient:
    """Connect to MongoDB with retry logic"""
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    for attempt in range(retries):
        try:
            client = AsyncIOMotorClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            await client.admin.command("ping")
            logger.info("Successfully connected to MongoDB")
            return client
        except Exception as e:
            if attempt == retries - 1:
                logger.error(f"Failed to connect to MongoDB after {retries} attempts: {str(e)}")
                raise
            logger.warning(f"MongoDB connection attempt {attempt + 1} failed, retrying... Error: {str(e)}")
            await asyncio.sleep(delay)


async def connect_to_redis(retries=5, delay=2):
    """Connect to Redis with retry logic"""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    
    for attempt in range(retries):
        try:
            redis_instance = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=0,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            await redis_instance.ping()
            logger.info(f"Successfully connected to Redis at {redis_host}:{redis_port}")
            return redis_instance
        except Exception as e:
            if attempt == retries - 1:
                logger.error(f"Failed to connect to Redis after {retries} attempts: {str(e)}")
                raise
            logger.warning(f"Redis connection attempt {attempt + 1} failed, retrying... Error: {str(e)}")
            await asyncio.sleep(delay)


async def setup_mongo_indexes(app: CustomFastAPI):
    """Setup MongoDB indexes with proper error handling"""
    if not app.mongodb:
        return
        
    try:
        # Try to create TTL index, handling the case where it already exists with different options
        collection = app.mongodb.chat_history  # Adjust collection name if needed
        
        # First check if the index exists
        existing_indexes = await collection.list_indexes().to_list(length=None)
        index_exists = False
        
        for index in existing_indexes:
            if index.get("name") == "timestamp_1":
                index_exists = True
                # Check if expireAfterSeconds is different
                if "expireAfterSeconds" not in index:
                    # Drop the existing index
                    await collection.drop_index("timestamp_1")
                    index_exists = False
                break
        
        # Create the index if it doesn't exist or was dropped
        if not index_exists:
            await collection.create_index(
                [("timestamp", 1)],
                expireAfterSeconds=15768000  # 6 months in seconds
            )
            
    except Exception as e:
        logger.warning(f"Error setting up MongoDB indexes: {str(e)}")


@asynccontextmanager
async def lifespan(app: CustomFastAPI):
    """Lifespan context manager for FastAPI application."""
    try:
        # Connect to MongoDB with more resilient error handling
        try:
            client = await connect_to_mongo()
            app.mongodb_client = client
            if app.mongodb_client is not None:
                app.mongodb = app.mongodb_client[os.getenv("MONGODB_DB", "users")]
                await setup_mongo_indexes(app)
        except Exception as e:
            logger.error(f"MongoDB connection failed: {str(e)}")
            # Continue even if MongoDB fails - the app might still work partially
            app.mongodb_client = None
            app.mongodb = None

        # Connect to Redis with more resilient error handling
        try:
            redis_instance = await connect_to_redis()
            app.redis_instance = redis_instance
            await FastAPILimiter.init(redis_instance)
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            # Continue even if Redis fails
            app.redis_instance = None

        logger.info("Services initialized")
        yield
    finally:
        # Clean up resources
        if app.mongodb_client:
            app.mongodb_client.close()
            logger.info("MongoDB connection closed")
            
        if app.redis_instance:
            await app.redis_instance.close()
            logger.info("Redis connection closed")


# Get environment variables with appropriate defaults for production
debug_mode = os.getenv("DEBUG", "False").lower() == "true"
environment = os.getenv("ENVIRONMENT", "production")

# Configure FastAPI with production-ready settings
app = CustomFastAPI(
    lifespan=lifespan,
    debug=debug_mode,
    title="DevOnaut API",
    description="Backend API for DevOnaut application",
    version="1.0.0",
    # Set root_path for working behind a proxy that strips /api prefix
    root_path="/api" if environment == "production" else "",
)


# Middleware to handle X-Forwarded-For headers from Nginx
@app.middleware("http")
async def trusted_host_middleware(request: Request, call_next):
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Set client host from the X-Forwarded-For header
        request.scope["client"] = (forwarded_for.split(",")[0].strip(), 0)

    # Get the forwarded proto (http or https)
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    if forwarded_proto:
        request.scope["scheme"] = forwarded_proto

    return await call_next(request)


# Configure CORS for production
allowed_origins = [
    "http://localhost:3000",  # Development
]

# In production, add your domain
if environment == "production":
    domain = os.getenv("DOMAIN", "")
    if domain:
        allowed_origins.extend([
            f"https://{domain}",
            f"http://{domain}",
            f"https://www.{domain}",
            f"http://www.{domain}",
        ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint for health checks
@app.get("/")
async def health_check():
    return {
        "status": "ok", 
        "service": "DevOnaut API",
        "mongo_connected": app.mongodb_client is not None,
        "redis_connected": app.redis_instance is not None
    }

# Include all the API routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(code.router, prefix="/code", tags=["api"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(test.router, prefix="/test", tags=["test"])
app.include_router(teacher.router, prefix="/teacher", tags=["teacher"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=debug_mode
    )
