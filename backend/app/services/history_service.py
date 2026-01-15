# app/services/history_service.py

from datetime import datetime
from typing import List, Dict, Optional
from app.database.mongodb import get_database
from app.models.schemas import Message

db = get_database()
history_collection = db["history"]

def save_message(chatbot_id: str, question: str, answer: str, summary: str = "", sources: List[str] = []) -> str:
    message = {
        "chatbot_id": chatbot_id,
        "question": question,
        "answer": answer,
        "summary": summary,
        "sources": sources,
        "timestamp": datetime.utcnow()
    }
    result = history_collection.insert_one(message)
    return str(result.inserted_id)

def get_history(
    chatbot_id: str, 
    limit: int = 20, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None
) -> List[Dict]:
    query = {"chatbot_id": chatbot_id}

    # Construction du filtre timestamp
    if start_date and end_date:
        query["timestamp"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["timestamp"] = {"$gte": start_date}
    elif end_date:
        query["timestamp"] = {"$lte": end_date}

    messages_cursor = history_collection.find(query).sort("timestamp", -1).limit(limit)
    return [Message(**msg).dict() for msg in messages_cursor]
