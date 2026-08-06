# api/document_api.py
import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from app.models.document import DeleteResponse, DocumentInDB
from app.services import document_service, rag_service
from app.utils.auth_utils import get_current_user
from app.utils.file_utils import extract_text, extract_text_from_image_bytes_azure, is_image_filename
from typing import List

router = APIRouter()


@router.post("/ocr-preview")
async def ocr_preview(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """
    Extrait le texte d'une image via OCR sans rien sauvegarder,
    pour permettre à l'utilisateur de vérifier/corriger le résultat
    avant l'upload définitif.
    """
    if not is_image_filename(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Ce fichier n'est pas une image supportée pour l'OCR"
        )

    contents = await file.read()

    try:
        text = extract_text_from_image_bytes_azure(contents)
    except RuntimeError as e:
        logging.error(f"Erreur OCR preview: {e}", exc_info=True)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'extraction OCR: {str(e)}"
        )

    return {"filename": file.filename, "text": text}


@router.post("/upload", response_model=DocumentInDB)
async def upload_document(
    chatbot_id: str = Form(...),
    file: UploadFile = File(...),
    corrected_text: str = Form(None),
    user=Depends(get_current_user)
):
    # Si l'utilisateur a corrigé le texte OCR en preview, on l'utilise tel quel
    # au lieu de relancer l'extraction (évite un appel OCR redondant).
    if corrected_text is not None and is_image_filename(file.filename):
        content = corrected_text
    else:
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