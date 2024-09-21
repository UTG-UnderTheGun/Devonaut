from app.db.database import db

def get_user(db, username: str):
    user = db.find_one({"username": username})
    if user:
        return user
    return None
