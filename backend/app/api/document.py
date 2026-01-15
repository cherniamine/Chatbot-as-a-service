# api/document_api.py
import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from app.models.document import DeleteResponse, DocumentInDB
from app.services import document_service, rag_service
from app.utils.auth_utils import get_current_user
from app.utils.file_utils import extract_text
from typing import List

router = APIRouter()

@router.post("/upload", response_model=DocumentInDB)
async def upload_document(
    chatbot_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    content = await extract_text(file)
    # Récupération de la taille du fichier original
    file_size = file.size
    
    doc = document_service.save_document(
        {"filename": file.filename, "content": content},
        chatbot_id,
        file_size,
        user_creator=str(user["_id"]) 

    )
    
    try:
        rag_service.build_index(chatbot_id)
    except Exception as e:
        logging.error(f"Erreur lors de build_index: {e}", exc_info=True)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la construction de l'index"
        )
    return doc

@router.get("/list", response_model=List[DocumentInDB])
def list_documents(chatbot_id: str, user=Depends(get_current_user)):
    return document_service.get_documents_by_chatbot(chatbot_id)


@router.delete("/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str,
    user=Depends(get_current_user)
):
    try:
        if not ObjectId.is_valid(document_id):
            raise ValueError("Format d'ID invalide")
            
        success = document_service.delete_document(document_id)
        return {
            "success": success,
            "message": "Document supprimé avec succès" if success else "Document non trouvé"
        }
        
    except Exception as e:
        logging.error(f"Erreur suppression: {e}")
        return {
            "success": False,
            "message": str(e)
        }