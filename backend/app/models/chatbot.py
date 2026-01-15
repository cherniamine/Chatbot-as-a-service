from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ChatbotCreate(BaseModel):
    name: str
    description: str  

class ChatbotInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: str  
    user_id: str
    isActive: Optional[bool] = False


    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class ChatbotUpdate(BaseModel):
   name: Optional[str] = None  
   description: Optional[str] = None