from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
from pydantic import ConfigDict

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "user"
    admin_id: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str  
    email: EmailStr
    name: str
    role: Optional[str] = "user"
    lastLogin: Optional[datetime] = None
    is_verified: bool = False

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

# ------------------ Password Reset Models ------------------ #
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str