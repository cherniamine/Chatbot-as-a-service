from app.core.database import db
from app.models.chatbot import ChatbotCreate, ChatbotInDB, ChatbotUpdate
from bson import ObjectId

from app.services import document_service

chatbots = db["chatbots"]

def create_chatbot(data: ChatbotCreate, user_id: str):
    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

    chatbot_doc = {
        "name": data.name,
        "description": data.description,
        "user_id": user_obj_id
    }
    result = chatbots.insert_one(chatbot_doc)
    return ChatbotInDB(
        id=str(result.inserted_id),
        name=data.name,
        description=data.description,
        user_id=str(user_obj_id)
    )

def get_user_chatbots(user_id: str):
    user_obj_id = ObjectId(user_id)
    users = db["users"]
    chatbots_collection = db["chatbots"]

    user = users.find_one({"_id": user_obj_id})
    if not user:
        return []

    chatbots_list = []

    if user.get("role") == "admin":
        cursor = chatbots_collection.find({})
    else:
        admin_id = user.get("admin_id")
        if not admin_id:
            return []
        cursor = chatbots_collection.find({"user_id": ObjectId(admin_id)})

    for chatbot in cursor:
        chatbot_id = str(chatbot["_id"])

        # ✅ Vérifier s’il y a au moins un document pour ce chatbot
        documents = document_service.get_documents_by_chatbot(chatbot_id)
        is_active = len(documents) > 0

        chatbots_list.append(
            ChatbotInDB(
                id=chatbot_id,
                name=chatbot["name"],
                description=chatbot.get("description", ""),
                user_id=str(chatbot["user_id"]),
                isActive=is_active   # ✅ Remplir dynamiquement
            )
        )

    return chatbots_list

def delete_chatbot(chatbot_id: str, user_id: str) -> bool:
    try:
        print(f"Attempting to delete chatbot {chatbot_id} for user {user_id}")
        chatbot_obj_id = ObjectId(chatbot_id)
        user_obj_id = ObjectId(user_id)
    except Exception as e:
        print(f"Invalid ID format: {e}")
        return False

    # Verify user exists
    user = db["users"].find_one({"_id": user_obj_id})
    if not user:
        print("User not found in database")
        return False

    print(f"User role: {user.get('role')}")

    # Verify chatbot exists
    chatbot = chatbots.find_one({"_id": chatbot_obj_id})
    if not chatbot:
        print("Chatbot not found in database")
        return False

    # Admin can delete any chatbot
    if user.get("role") == "admin":
        print("Admin delete attempt")
        result = chatbots.delete_one({"_id": chatbot_obj_id})
    # Regular user can only delete their own chatbots
    else:
        print("Regular user delete attempt")
        result = chatbots.delete_one({
            "_id": chatbot_obj_id,
            "user_id": user_obj_id
        })

    print(f"Delete operation result: {result.raw_result}")
    return result.deleted_count == 1

def update_chatbot(chatbot_id: str, user_id: str, data: ChatbotUpdate) -> bool:
    try:
        chatbot_obj_id = ObjectId(chatbot_id)
        user_obj_id = ObjectId(user_id)
    except Exception as e:
        print(f"Invalid ID format: {e}")
        return False

    # Check if chatbot exists first
    chatbot = chatbots.find_one({"_id": chatbot_obj_id})
    if not chatbot:
        print(f"Chatbot {chatbot_id} not found")
        return False

    # Check if user has permission (either owner or admin)
    user = db["users"].find_one({"_id": user_obj_id})
    if not user:
        print(f"User {user_id} not found")
        return False

    if user.get("role") != "admin" and str(chatbot["user_id"]) != user_id:
        print(f"User {user_id} doesn't own chatbot {chatbot_id}")
        return False

    update_fields = {}
    if data.name:
        update_fields["name"] = data.name
    if data.description:
        update_fields["description"] = data.description

    if not update_fields:
        return False

    result = chatbots.update_one(
        {"_id": chatbot_obj_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 1:
        return True
    else:
        print(f"Update failed for chatbot {chatbot_id}")
        return False