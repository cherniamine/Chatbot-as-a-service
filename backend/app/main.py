from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
import os

from app.api import auth, chatbot, document

app = FastAPI(
    title="ChatBot as a Service",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SessionMiddleware requis pour OAuth (Google/GitHub)
SESSION_SECRET_KEY = os.environ.get("SESSION_SECRET_KEY", "super-secret-session-key")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

# Répertoire des avatars
AVATAR_DIR = "avatars"

# Endpoint pour récupérer un avatar utilisateur
@app.get("/auth/user/avatar/{user_id}")
def get_user_avatar(user_id: str):
    avatar_path = os.path.join(AVATAR_DIR, f"{user_id}.jpg")
    if os.path.exists(avatar_path):
        return FileResponse(avatar_path, media_type="image/jpeg")
    
    default_avatar = os.path.join(AVATAR_DIR, "default.jpg")
    if os.path.exists(default_avatar):
        return FileResponse(default_avatar, media_type="image/jpeg")
    
    raise HTTPException(status_code=404, detail="Avatar not found")

# Inclure les autres routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])
app.include_router(document.router, prefix="/document", tags=["Document"])
app.mount("/voice/audio", StaticFiles(directory="temp_audio"), name="voice_audio")
