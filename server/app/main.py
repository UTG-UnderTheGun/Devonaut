import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import logging
import asyncio
from app.api.v1.endpoints import auth, user, code, ai, test, teacher, assignment
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
    "https://localhost:3000", # Development with HTTPS
    "http://127.0.0.1:3000",  # Alternative development URL
    "http://localhost:8000",  # Allow API server
    "http://localhost",       # Allow any localhost
    "*"                       # Allow all origins in development mode
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
    allow_origins=["*"],  # Allow all origins in any mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "X-CSRFToken"],
    max_age=86400,
)

# Root endpoint for health checks
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "DevOnaut API"}

# Health check endpoint that can handle OPTIONS requests
@app.options("/health-check")
@app.get("/health-check")
async def cors_health_check():
    return {"status": "ok", "cors": "enabled"}

# Include all the API routes
logger.info("Registering API routes")
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(code.router, prefix="/code", tags=["api"])
logger.info("Registering AI router with prefix /ai")
app.include_router(ai.router, prefix="/ai", tags=["ai"])  # ใช้ /ai เพื่อให้ตรงกับที่ client เรียกใช้
app.include_router(test.router, prefix="/test", tags=["test"])
app.include_router(teacher.router, prefix="/teacher", tags=["teacher"])
app.include_router(assignment.router, prefix="/assignments", tags=["assignments"])

# เพิ่ม endpoint สำหรับทดสอบการเข้าถึง
@app.get("/ai/test")
async def test_ai_direct():
    """Test AI route accessibility directly"""
    return {"status": "ok", "message": "Direct AI test route is working"}

# เพิ่ม endpoint สำหรับ chat history simple ที่ root level
@app.get("/ai/chat-history-simple")
async def chat_history_simple_direct(
    user_id: str = None,
    assignment_id: str = None,
    exercise_id: str = None
):
    """Direct endpoint for chat history at root level"""
    # Forward to the actual handler in ai router
    from app.api.v1.endpoints.ai import get_chat_history_simple
    return await get_chat_history_simple(user_id, assignment_id, exercise_id)

# Log all registered routes for debugging
@app.on_event("startup")
async def log_routes():
    """Log all registered routes on startup"""
    routes = []
    for route in app.routes:
        routes.append({"path": route.path, "name": route.name, "methods": route.methods})
    
    logger.info(f"Registered routes: {routes}")

# Add test endpoints
@app.get("/api/v1/routes")
async def list_routes():
    """List all registered routes"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path, 
            "name": route.name, 
            "methods": list(route.methods) if route.methods else []
        })
    return {"routes": routes}

@app.get("/api/v1/ai/test")
async def test_ai_route():
    """Test AI route accessibility"""
    return {"status": "ok", "message": "AI route is accessible at root level"}

# Add better error handling
@app.exception_handler(404)
async def custom_404_handler(request, exc):
    """Custom 404 handler with request details"""
    return {
        "error": "Not Found",
        "status_code": 404,
        "path": request.url.path,
        "method": request.method,
        "headers": dict(request.headers),
        "available_routes": [route.path for route in app.routes]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=debug_mode
    )
