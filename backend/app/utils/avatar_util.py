import os
from bson import ObjectId
from fastapi import UploadFile, HTTPException
from io import BytesIO
from fastapi.responses import FileResponse, StreamingResponse
from urllib.parse import quote
from app.database.mongodb import db

users = db["users"]
AVATAR_DIR = "avatars"
DEFAULT_AVATAR = os.path.join(AVATAR_DIR, "default.jpg")


def ensure_avatar_dir():
    os.makedirs(AVATAR_DIR, exist_ok=True)

async def save_user_avatar(user_id: str, avatar_bytes: bytes, filename: str):
    ensure_avatar_dir()
    try:
        # Validate user_id format
        ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Save to file system
    avatar_path = os.path.join(AVATAR_DIR, f"{user_id}.jpg")
    with open(avatar_path, "wb") as f:
        f.write(avatar_bytes)
    
    # Also store reference in MongoDB
    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"has_avatar": True}}
    )

def get_user_avatar_by_id(user_id: str):
    try:
        ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    avatar_path = os.path.join(AVATAR_DIR, f"{user_id}.jpg")
    
    if os.path.exists(avatar_path):
        return FileResponse(avatar_path, media_type="image/jpeg")
    
    if os.path.exists(DEFAULT_AVATAR):
        return FileResponse(DEFAULT_AVATAR, media_type="image/jpeg")
    
    raise HTTPException(status_code=404, detail="Avatar not found")