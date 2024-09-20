from pydantic import BaseModel, Field
from bson import ObjectId

class User(BaseModel):
    username: str
    password: str

class UserInDB(User):
    id: ObjectId = Field(default_factory=ObjectId)

    class Config:
        json_encoders = {ObjectId: str}
