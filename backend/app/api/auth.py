from io import BytesIO
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Depends, UploadFile, Request, status
from fastapi.responses import StreamingResponse, RedirectResponse
from datetime import datetime, timedelta
from bson import ObjectId
from openai import BaseModel
from pydantic import EmailStr
from app.core.database import db
from app.models.user import ResetPasswordRequest, UserCreate, UserLogin, UserInDB, UserUpdate
from app.services import user_service
from app.utils.auth_utils import (
    create_access_token,
    create_verification_token,
    get_current_user,
    admin_required,
    verify_reset_password_token,
    verify_token
)
from app.services.email_service import send_reset_password_email, send_welcome_email
from app.utils.avatar_util import get_user_avatar_by_id, save_user_avatar
from app.core.oauth import oauth
from starlette.config import Config
from app.utils.auth_utils import create_reset_password_token, verify_token

# Charger les variables depuis .env
config = Config(".env")
FRONTEND_REDIRECT_URI = config("FRONTEND_REDIRECT_URI", default="http://localhost:4200/auth/callback")

users = db["users"]
router = APIRouter()
AVATAR_FOLDER = "avatars"
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# ------------------ INSCRIPTION ------------------ #
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, background_tasks: BackgroundTasks):
    existing_user = user_service.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    new_user = user_service.create_user(user)
    if not new_user:
        raise HTTPException(status_code=500, detail="Erreur lors de la création de l'utilisateur")

    token = create_verification_token(str(new_user.id))
    verification_url = f"http://localhost:4200/auth/verify-email?token={token}"

    background_tasks.add_task(send_welcome_email, new_user.email, new_user.name, verification_url)
    return {"message": "Inscription réussie. Un email de confirmation vous a été envoyé."}

@router.get("/verify-email")
async def verify_email(token: str):
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")

    success = user_service.verify_user_email(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {"message": "Votre adresse email a bien été vérifiée. Vous pouvez maintenant vous connecter."}

# ------------------ LOGIN ------------------ #
@router.post("/login")
def login(data: UserLogin):
    user = user_service.get_user_by_email(data.email)
    if not user or not user_service.verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_service.update_last_login(str(user["_id"]))

    token = create_access_token(
        {
            "sub": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user.get("role", "user")
        },
        expires_delta=timedelta(hours=12)
    )
    return {"access_token": token, "token_type": "bearer"}

# ------------------ ROUTES UTILISATEUR ------------------ #
@router.get("/whoami")
def whoami(user=Depends(get_current_user)):
    return {
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role", "user")
    }

@router.get("/admins")
def get_admins():
    admins_cursor = users.find({"role": "admin"}, {"_id": 1, "name": 1, "email": 1})
    return [
        {
            "_id": str(admin["_id"]),
            "name": admin.get("name"),
            "email": admin.get("email")
        }
        for admin in admins_cursor
    ]

@router.get("/supervised")
def get_supervised_users(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")

    supervised_users_cursor = users.find({"admin_id": ObjectId(user["_id"])})
    return [
        {
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u.get("name", ""),
            "role": u.get("role", "user")
        }
        for u in supervised_users_cursor
    ]

@router.post("/users", response_model=UserInDB, status_code=status.HTTP_201_CREATED)
def create_user_api(user: UserCreate, current_admin=Depends(admin_required)):
    return user_service.create_user(user)

@router.put("/users/{user_id}", response_model=UserInDB)
def update_user_api(user_id: str, user_update: UserUpdate, current_admin=Depends(admin_required)):
    updated_user = user_service.update_user(user_id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_api(user_id: str, current_admin=Depends(admin_required)):
    success = user_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

@router.get("/supervised/count")
def count_supervised_users(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    count = users.count_documents({"admin_id": ObjectId(user["_id"])})
    return {"count": count}

@router.get("/user/email-status")
def get_email_status(userId: str, user=Depends(get_current_user)):
    user_in_db = user_service.get_user_by_id(userId)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"verified": user_in_db.get("is_verified", False)}

@router.post("/user/change-password")
def change_password(userId: str, newPassword: str, user=Depends(get_current_user)):
    if str(user["_id"]) != userId and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")
    success = user_service.change_password(userId, newPassword)
    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Mot de passe mis à jour avec succès"}

@router.post("/user/upload-avatar")
async def upload_avatar(userId: str = Form(...), avatar: UploadFile = File(...), user=Depends(get_current_user)):
    if str(user["_id"]) != userId and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")
    if not avatar.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Type de fichier invalide")
    await save_user_avatar(userId, await avatar.read(), avatar.filename)
    return {"message": "Avatar uploadé avec succès"}

@router.get("/user/avatar/{user_id}")
def get_user_avatar(user_id: str):
    return get_user_avatar_by_id(user_id)

@router.get("/user/stats/{user_id}")
def get_user_stats(user_id: str, current_user=Depends(get_current_user)):
    if str(current_user["_id"]) != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")

    user_obj_id = ObjectId(user_id)
    chatbots_count = db["chatbots"].count_documents({"owner_id": user_obj_id})
    documents_count = db["documents"].count_documents({"uploaded_by": user_obj_id})
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    interactions_count = db["interactions"].count_documents({
        "user_id": user_obj_id,
        "timestamp": {"$gte": thirty_days_ago}
    })

    user_doc = users.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    response = {
        "activeBots": chatbots_count,
        "uploadedDocuments": documents_count,
        "monthlyInteractions": interactions_count,
        "createdAt": user_doc.get("createdAt"),
        "lastLogin": user_doc.get("lastLogin"),
        "emailVerified": user_doc.get("is_verified", False),
    }

    if current_user.get("role") == "admin":
        admin_stats = user_service.get_admin_stats(current_user["_id"])
        response["adminStats"] = admin_stats

    return response

# ------------------ GOOGLE OAUTH ------------------ #
@router.get("/google")
async def login_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def auth_google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Impossible de récupérer les infos Google")

    email = user_info["email"]
    name = user_info.get("name", email.split("@")[0])

    user = user_service.get_user_by_email(email)
    if not user:
        user = user_service.create_user_oauth(email=email, name=name, provider="google")

    jwt_token = create_access_token(
        {"sub": str(user["_id"]), "email": email, "name": name, "role": user.get("role", "user")},
        expires_delta=timedelta(hours=12)
    )
    return RedirectResponse(f"{FRONTEND_REDIRECT_URI}?token={jwt_token}")

# ------------------ GITHUB OAUTH ------------------ #
@router.get("/github")
async def login_github(request: Request):
    redirect_uri = request.url_for("auth_github_callback")
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/github/callback")
async def auth_github_callback(request: Request):
    token = await oauth.github.authorize_access_token(request)
    resp = await oauth.github.get("user", token=token)
    profile = resp.json()

    email = profile.get("email")
    if not email:
        resp_emails = await oauth.github.get("user/emails", token=token)
        emails = resp_emails.json()
        email = next((e["email"] for e in emails if e.get("primary")), None)

    if not email:
        raise HTTPException(status_code=400, detail="Impossible de récupérer l'email GitHub")

    name = profile.get("name") or profile.get("login")
    user = user_service.get_user_by_email(email)
    if not user:
        user = user_service.create_user_oauth(email=email, name=name, provider="github")

    jwt_token = create_access_token(
        {"sub": str(user["_id"]), "email": email, "name": name, "role": user.get("role", "user")},
        expires_delta=timedelta(hours=12)
    )
    return RedirectResponse(f"{FRONTEND_REDIRECT_URI}?token={jwt_token}")



@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = user_service.get_user_by_email(request.email)
    # Ne pas révéler si l'utilisateur existe ou pas pour sécurité
    if user:
        token = create_reset_password_token(str(user["_id"]))
        reset_url = f"http://localhost:4200/auth/reset-password?token={token}"
        background_tasks.add_task(send_reset_password_email, user["email"], user.get("name", ""), reset_url)
    
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}


# ------------------ RESET PASSWORD ------------------ #
@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    user_id = verify_reset_password_token(request.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")

    success = user_service.change_password(user_id, request.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {"message": "Mot de passe réinitialisé avec succès !"}