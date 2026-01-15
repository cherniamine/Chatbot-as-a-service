from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List , Union
from datetime import datetime

class DocumentUpload(BaseModel):
    filename: str
    content: str  
    size: int

class DocumentInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    filename: str
    chatbot_id: str
    chunks: List[str]
    size: int
    embedding_id: Optional[str] = None
    metadata: Optional[dict] = None
    uploadDate: Optional[Union[datetime, str]] = None
    createdAt: Optional[Union[datetime, str]] = None
    updatedAt: Optional[Union[datetime, str]] = None
    user_creator: Optional[str] = None 

class DeleteResponse(BaseModel):
    success: bool
    message: str

    model_config = ConfigDict(
        from_attributes=True,         
        populate_by_name=True          
    )

