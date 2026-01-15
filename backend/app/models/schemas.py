# app/models/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AskRequest(BaseModel):
    question: str
    chatbot_id: str

class AskResponse(BaseModel):
    answer: str
    summary: str
    sources: List[str]
    time_to_respond: Optional[float] = None
    audio_url: Optional[str] = None  

class Message(BaseModel):
    chatbot_id: str
    question: str
    answer: str
    summary: Optional[str] = ""
    sources: Optional[List[str]] = []
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
class AskResponseMultiLang(BaseModel):
    question: str
    answer_fr: str
    answer_en: str
    answer_ar: str
    summary_fr: str
    summary_en: str
    summary_ar: str
    sources: List[str]
    time_to_respond: float
    audio_url: Optional[str] = None
    context: Optional[str] = None  