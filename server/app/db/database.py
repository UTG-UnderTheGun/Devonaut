import os
from pymongo import MongoClient

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["mydatabase"]
collection = db["users"]
