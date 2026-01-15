from typing import List, Optional
from pydantic import BaseModel

class AskInput(BaseModel):
    chatbot_id: str
    question: str
class AskResponse(BaseModel):
    answer: str
    summary: str
    sources: List[str]
    audio_url: Optional[str] = None  