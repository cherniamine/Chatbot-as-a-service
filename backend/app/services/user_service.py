from typing import Optional
from bson import ObjectId
from passlib.context import CryptContext
from app.core.database import db
from datetime import datetime, timedelta
from app.models.user import UserCreate, UserInDB, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
users = db["users"]

def get_user_by_email(email: str):
    return users.find_one({"email": email})

def create_user(user: UserCreate) -> Optional[UserInDB]:
    now = datetime.utcnow()  # date/heure UTC actuelle

    hashed_password = pwd_context.hash(user.password)
    user_doc = {
        "email": user.email,
        "name": user.name,
        "password": hashed_password,
        "role": "user",
        "admin_id": ObjectId(user.admin_id) if user.admin_id else None,
        "is_verified": False,
        "createdAt": now,
        "passwordUpdatedAt": now,
    }
    result = users.insert_one(user_doc)
    new_user = users.find_one({"_id": result.inserted_id})
    if new_user:
        return UserInDB(
            id=str(new_user["_id"]),
            email=new_user["email"],
            name=new_user["name"],
            role=new_user.get("role", "user"),
            admin_id=str(new_user.get("admin_id")) if new_user.get("admin_id") else None,
            is_verified=new_user.get("is_verified", False)
        )
    return None


def verify_user_email(user_id: str) -> bool:
    result = users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_verified": True}})
    return result.modified_count == 1

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_id(user_id: str):
    from bson import ObjectId
    try:
        return users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    
def update_user(user_id: str, user_update: UserUpdate) -> Optional[UserInDB]:
    update_fields = {}
    if user_update.name is not None:
        update_fields["name"] = user_update.name
    if user_update.email is not None:
        update_fields["email"] = user_update.email
    if user_update.role is not None:
        update_fields["role"] = user_update.role
    if user_update.password is not None:
        update_fields["password"] = pwd_context.hash(user_update.password)

    result = users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    if result.matched_count == 0:
        return None

    user_doc = users.find_one({"_id": ObjectId(user_id)})
    return UserInDB(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc["name"],
        role=user_doc.get("role", "user")
    )

def delete_user(user_id: str) -> bool:
    result = users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0


def change_password(user_id: str, new_password: str) -> bool:
    hashed_password = pwd_context.hash(new_password)
    now = datetime.utcnow()
    result = users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_password, "passwordUpdatedAt": now}}
    )
    return result.modified_count == 1


def get_user_details(user_id: str):
    user = users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    return {
        "createdAt": user.get("createdAt"),
        "lastLogin": user.get("lastLogin"),
        "emailVerified": user.get("is_verified", False),
        "passwordUpdatedAt": user.get("passwordUpdatedAt")
    }


def get_admin_stats(admin_id: ObjectId):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    admin_id_str = str(admin_id)

    # 1. Chatbots créés
    chatbots = db["chatbots"].find({"user_id": admin_id})
    chatbot_ids = [str(c["_id"]) for c in chatbots]

    # 2. Documents uploadés
    documents_count = db["documents"].count_documents({"user_creator": admin_id_str})

    # 3. Interactions sur les chatbots de l’admin
    interactions_count = db["interactions"].count_documents({
        "chatbot_id": {"$in": chatbot_ids},
        "timestamp": {"$gte": thirty_days_ago}
    })

    return {
        "chatbotsCreated": len(chatbot_ids),
        "documentsUploaded": documents_count,
        "interactionsLast30Days": interactions_count,
    }


def update_last_login(user_id: str) -> bool:
    """Met à jour la date de dernière connexion"""
    result = users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"lastLogin": datetime.utcnow()}}
    )
    return result.modified_count == 1

def create_user_oauth(email: str, name: str, provider: str):
    user_data = {
        "email": email,
        "name": name,
        "role": "user",
        "is_verified": True,
        "provider": provider,
        "createdAt": datetime.utcnow(),
        "lastLogin": datetime.utcnow(),
    }
    result = users.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return user_data
