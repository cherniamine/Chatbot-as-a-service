# services/document_service.py
from datetime import datetime
from app.core.database import db
from app.models.document import DocumentUpload, DocumentInDB
from app.utils.file_utils import split_into_chunks
from bson import ObjectId

documents = db["documents"]

def save_document(data: dict, chatbot_id: str, file_size: int, user_creator: str):
    # Utiliser la nouvelle fonction avec des paramètres ajustés
    chunks = split_into_chunks(
        data['content'], 
        max_tokens=300,  # Réduire pour plus de chunks
        overlap_tokens=20  # Chevauchement pour la continuité
    )
    
    now = datetime.utcnow()
    doc = {
        "filename": data['filename'],
        "chatbot_id": chatbot_id,
        "chunks": chunks,
        "size": file_size,
        "uploadDate": now,
        "createdAt": now,
        "user_creator": user_creator, 
        "metadata": {
            "original_size": file_size,
            "chunk_count": len(chunks),
            "chunking_method": "enhanced_with_overlap"
        }
    }
    
    result = documents.insert_one(doc)
    return DocumentInDB(
        id=str(result.inserted_id),
        filename=data['filename'],
        chatbot_id=chatbot_id,
        chunks=chunks,
        size=file_size,
        uploadDate=now,
        createdAt=now,
        user_creator=user_creator,  
        metadata=doc["metadata"]
    )


def get_documents_by_chatbot(chatbot_id: str):
    docs = documents.find({"chatbot_id": chatbot_id})
    result = []
    for doc in docs:
        doc_dict = dict(doc)
        doc_dict["_id"] = str(doc["_id"]) if doc.get("_id") else None

        # ✅ Corriger le type de user_creator
        if isinstance(doc_dict.get("user_creator"), ObjectId):
            doc_dict["user_creator"] = str(doc_dict["user_creator"])

        # 🕒 Convertir les dates MongoDB -> ISO
        for date_field in ("uploadDate", "createdAt", "updatedAt"):
            if date_field in doc_dict and doc_dict[date_field] is not None:
                doc_dict[date_field] = doc_dict[date_field].isoformat()

        # 📦 Par défaut, estimer la taille si absente
        if "size" not in doc_dict:
            doc_dict["size"] = len(doc.get("chunks", [])) * 255 * 1024

        # ✅ Valider le document avec Pydantic
        doc_obj = DocumentInDB.model_validate(doc_dict)
        result.append(doc_obj)
    return result






def delete_document(document_id: str):
    """Supprime un document et ses chunks associés"""
    from app.core.database import db
    
    # Suppression du document principal
    result = documents.delete_one({"_id": ObjectId(document_id)})
    
    if result.deleted_count == 0:
        raise ValueError("Document non trouvé")
    
    # Optionnel: Suppression des embeddings associés
    # db["embeddings"].delete_many({"document_id": document_id})
    
    return True