from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi_limiter.depends import RateLimiter
import datetime
import redis.asyncio as redis
import os

router = APIRouter()


@router.get("/mongodb-test")
async def test_mongodb(request: Request):
    """Test MongoDB connection by inserting and retrieving a test document"""
    try:
        test_collection = request.app.mongodb.test_collection
        test_doc = {"test": "Hello MongoDB!", "timestamp": datetime.datetime.now()}
        insert_result = await test_collection.insert_one(test_doc)
        retrieved_doc = await test_collection.find_one(
            {"_id": insert_result.inserted_id}
        )

        await test_collection.delete_one({"_id": insert_result.inserted_id})

        return {
            "status": "success",
            "message": "MongoDB is working!",
            "data": {
                "inserted_id": str(insert_result.inserted_id),
                "retrieved_data": str(retrieved_doc["test"]),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB test failed: {str(e)}")


@router.get("/redis-test")
async def test_redis(
    request: Request,
    rate_limit: bool = Depends(RateLimiter(times=2, seconds=5)),
):
    """Test Redis connection by checking if rate limiting works"""
    return {
        "status": "success",
        "message": "Redis is working! Rate limiting is active (2 requests per 5 seconds)",
    }


@router.get("/all-connections")
async def test_all_connections(request: Request):
    """Test all database connections"""
    try:
        mongo_result = await test_mongodb(request)

        redis_instance = redis.Redis(
            host=os.getenv("REDIS_HOST", "redis"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0,
            decode_responses=True,
        )
        await redis_instance.ping()
        await redis_instance.close()

        return {
            "mongodb_status": mongo_result["status"],
            "redis_status": "success",
            "message": "All database connections are working!",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

