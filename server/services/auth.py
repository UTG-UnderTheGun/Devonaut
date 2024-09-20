from fastapi import HTTPException
from passlib.context import CryptContext
from pymongo import MongoClient
from db.models.model import User, UserInDB

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = MongoClient("mongodb://root:example@mongo:27017/")
db = client.users
users_collection = db["users"]

def get_user_by_username(username: str):
    user = users_collection.find_one({"username": username})
    if user:
        return UserInDB(**user)
    return None

def create_user(user: User):
    hashed_password = pwd_context.hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    users_collection.insert_one(user_dict)

def authenticate_user(username: str, password: str):
    user = get_user_by_username(username)
    if user and pwd_context.verify(password, user.password):
        return user
    return None
