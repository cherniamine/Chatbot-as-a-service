import os
import io
import azure.cognitiveservices.speech as speechsdk
from gtts import gTTS
from fastapi import APIRouter, UploadFile, File, Query, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse, FileResponse
from app.services import rag_service
from app.models.schemas import AskResponse, AskResponseMultiLang, Message
from app.utils.auth_utils import get_current_user
from app.services.history_service import save_message, get_history
from datetime import datetime
from typing import List, Optional
from app.models.chatbot import ChatbotCreate, ChatbotInDB, ChatbotUpdate
from app.models.ask import AskInput
from app.services import chatbot_service
from pydub import AudioSegment
import logging
import time

router = APIRouter()

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_AUDIO_DIR = "temp_audio"
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

# ---------- 🔊 Utilitaires Azure Speech ----------
def convert_to_wav(file_path: str) -> str:
    """Convertit un fichier audio en WAV PCM 16kHz mono 16-bit."""
    try:
        sound = AudioSegment.from_file(file_path)
        wav_path = file_path + ".wav"
        sound = sound.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        sound.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        logger.error(f"Erreur conversion WAV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur conversion audio: {str(e)}")

def cleanup_file(file_path: str, max_attempts: int = 5, delay: float = 0.1):
    """Tente de supprimer un fichier avec plusieurs tentatives et délais."""
    for attempt in range(max_attempts):
        try:
            os.remove(file_path)
            logger.info(f"Fichier supprimé: {file_path}")
            return True
        except PermissionError:
            if attempt < max_attempts - 1:
                logger.warning(f"Tentative {attempt + 1}/{max_attempts} - Fichier verrouillé, attente de {delay}s: {file_path}")
                time.sleep(delay)
                delay *= 2  # Backoff exponentiel
            else:
                logger.warning(f"Impossible de supprimer le fichier après {max_attempts} tentatives: {file_path}")
        except FileNotFoundError:
            logger.info(f"Fichier déjà supprimé: {file_path}")
            return True
        except Exception as e:
            logger.warning(f"Erreur suppression fichier {file_path}: {e}")
            break
    return False

def transcribe_with_azure(file_path: str, lang="fr-FR"):
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    service_region = os.getenv("AZURE_SPEECH_REGION")
    wav_path = None
    recognizer = None

    try:
        logger.info(f"Début transcription Azure: {file_path}, lang={lang}")

        if not speech_key:
            raise HTTPException(status_code=500, detail="Configuration Azure manquante: AZURE_SPEECH_KEY")
        if not service_region:
            raise HTTPException(status_code=500, detail="Configuration Azure manquante: AZURE_SPEECH_REGION")

        # Convertir en WAV
        wav_path = convert_to_wav(file_path)
        logger.info(f"WAV créé: {wav_path}")

        # Configuration Azure Speech
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
        speech_config.speech_recognition_language = lang
        audio_input = speechsdk.AudioConfig(filename=wav_path)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_input)
        
        result = recognizer.recognize_once()
        logger.info(f"Résultat Azure: reason={result.reason}")

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            logger.info(f"Texte reconnu: {result.text}")
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
            raise HTTPException(status_code=400, detail="Aucune parole détectée dans l'audio")
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            logger.error(f"Transcription annulée: {cancellation.reason} - {cancellation.error_details}")
            raise HTTPException(
                status_code=500,
                detail=f"Transcription annulée: {cancellation.reason} - {cancellation.error_details}"
            )
        else:
            error_details = getattr(result, 'no_match_details', "Détails non disponibles")
            raise HTTPException(status_code=500, detail=f"Erreur de transcription: {result.reason} - {error_details}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur transcription Azure")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la transcription: {str(e)}")
    finally:
        if recognizer:
            del recognizer
        if wav_path and os.path.exists(wav_path):
            cleanup_file(wav_path)



# ---------- 🔊 Traitement vocal ----------
async def process_voice_request(audio: UploadFile, chatbot_id: str, user_id: str, lang: str) -> AskResponse:
    temp_path = os.path.join(TEMP_AUDIO_DIR, f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{audio.filename}")
    
    try:
        # Sauvegarder le fichier audio
        with open(temp_path, "wb") as f:
            content = await audio.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Fichier audio vide")
            f.write(content)

        # Transcrire l'audio
        lang_map = {"fr": "fr-FR", "en": "en-US", "ar": "ar-EG"}
        question = transcribe_with_azure(temp_path, lang=lang_map.get(lang, "fr-FR"))
        
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Aucune transcription générée")

        # Traiter avec RAG
        response = rag_service.query(question, chatbot_id, user_id, langs=[lang])
        if not response:
            raise HTTPException(status_code=500, detail="Erreur du service RAG")

        answer = response.get(f"answer_{lang}", response.get("answer_fr", "Désolé, je n'ai pas pu générer de réponse."))
        summary = response.get(f"summary_{lang}", response.get("summary_fr", ""))

        # Sauvegarder l'historique
        try:
            save_message(chatbot_id, question, answer, summary, response.get("sources", []))
        except Exception as e:
            logger.warning(f"Erreur sauvegarde historique: {e}")

        # Générer réponse audio
        audio_filename = None
        try:
            tts_lang = lang if lang in ['fr', 'en', 'ar'] else 'fr'
            tts = gTTS(text=answer, lang=tts_lang)
            audio_filename = f"{chatbot_id}_{user_id}_{lang}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
            audio_path = os.path.join(TEMP_AUDIO_DIR, audio_filename)
            tts.save(audio_path)
        except Exception as e:
            logger.warning(f"Erreur génération TTS: {e}")

        return AskResponse(
            answer=answer,
            summary=summary,
            sources=response.get("sources", []),
            time_to_respond=response.get("time_to_respond", 0),
            audio_url=f"/voice/audio/{audio_filename}" if audio_filename else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur traitement vocal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
        
    finally:
        # Nettoyage sécurisé avec plusieurs tentatives
        cleanup_file(temp_path)

# ---------- 🔊 Routes vocales ----------
@router.post("/ask-voice-fr", response_model=AskResponse)
async def ask_with_voice_fr(audio: UploadFile = File(...), chatbot_id: str = Query(...), user=Depends(get_current_user)):
    return await process_voice_request(audio, chatbot_id, user["_id"], "fr")

@router.post("/ask-voice-en", response_model=AskResponse)
async def ask_with_voice_en(audio: UploadFile = File(...), chatbot_id: str = Query(...), user=Depends(get_current_user)):
    return await process_voice_request(audio, chatbot_id, user["_id"], "en")

@router.post("/ask-voice-ar", response_model=AskResponse)
async def ask_with_voice_ar(audio: UploadFile = File(...), chatbot_id: str = Query(...), user=Depends(get_current_user)):
    return await process_voice_request(audio, chatbot_id, user["_id"], "ar")

# ---------- 🔊 Traitement vocal multilingue ----------
@router.post("/ask-voice-multi", response_model=AskResponseMultiLang)
async def ask_with_voice_multi(
    audio: UploadFile = File(...),
    chatbot_id: str = Query(...),
    user=Depends(get_current_user),
    lang: str = Query("fr", description="Language code (fr, en, ar)")
):
    temp_path = os.path.join(TEMP_AUDIO_DIR, f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{audio.filename}")
    try:
        with open(temp_path, "wb") as f:
            content = await audio.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Fichier audio vide")
            f.write(content)

        lang_map = {"fr": "fr-FR", "en": "en-US", "ar": "ar-EG"}
        question = transcribe_with_azure(temp_path, lang=lang_map.get(lang, "fr-FR"))

        response = rag_service.query(question, chatbot_id, user["_id"], langs=["fr", "en", "ar"])

        answer = response.get(f"answer_{lang}", response["answer_fr"])
        tts_lang = lang if lang in ['fr', 'en', 'ar'] else 'fr'

        # Générer audio
        audio_filename = None
        try:
            tts = gTTS(text=answer, lang=tts_lang)
            audio_filename = f"{chatbot_id}_{user['_id']}_{lang}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
            audio_path = os.path.join(TEMP_AUDIO_DIR, audio_filename)
            tts.save(audio_path)
        except Exception as e:
            logger.warning(f"Erreur génération TTS multi: {e}")

        return AskResponseMultiLang(
            question=question,
            answer_fr=response.get("answer_fr", ""),
            answer_en=response.get("answer_en", response.get("answer_fr", "")),
            answer_ar=response.get("answer_ar", response.get("answer_fr", "")),
            audio_url=f"/voice/audio/{audio_filename}" if audio_filename else None,
            sources=response.get("sources", []),
            time_to_respond=response.get("time_to_respond", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur traitement vocal multi: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur traitement vocal: {str(e)}")
    finally:
        cleanup_file(temp_path)


# ---------- 💬 Traitement texte multilingue ----------
@router.post("/ask-multi", response_model=AskResponseMultiLang)
def ask_question_multi(input: AskInput, user=Depends(get_current_user)):
    response = rag_service.query(input.question, input.chatbot_id, user["_id"], langs=["fr", "en", "ar"])
    return AskResponseMultiLang(
        question=input.question,
        answer_fr=response.get("answer_fr", ""),
        answer_en=response.get("answer_en", response.get("answer_fr", "")),
        answer_ar=response.get("answer_ar", response.get("answer_fr", "")),
        sources=response.get("sources", []),
        time_to_respond=response.get("time_to_respond", 0)
    )

@router.post("/ask-fr", response_model=AskResponse)
def ask_question_fr(input: AskInput, user=Depends(get_current_user)):
    return process_text_request(input, user["_id"], "fr")

@router.post("/ask-en", response_model=AskResponse)
def ask_question_en(input: AskInput, user=Depends(get_current_user)):
    return process_text_request(input, user["_id"], "en")

@router.post("/ask-ar", response_model=AskResponse)
def ask_question_ar(input: AskInput, user=Depends(get_current_user)):
    return process_text_request(input, user["_id"], "ar")

def process_text_request(input: AskInput, user_id: str, lang: str) -> AskResponse:
    response = rag_service.query(input.question, input.chatbot_id, user_id, langs=[lang])

    answer_key = f"answer_{lang}"
    summary_key = f"summary_{lang}"

    answer = response.get(answer_key) or response.get("answer_fr") or "Réponse indisponible."
    summary = response.get(summary_key) or response.get("summary_fr") or ""

    save_message(
        input.chatbot_id,
        input.question,
        answer,
        summary,
        response.get("sources", [])
    )

    return AskResponse(
        answer=answer,
        summary=summary,
        sources=response.get("sources", []),
        time_to_respond=response.get("time_to_respond", 0),
    )

# ---------- 🔉 TTS / Streaming audio ----------
@router.get("/voice/audio/{filename}")
def get_audio_file(filename: str):
    file_path = os.path.join(TEMP_AUDIO_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier audio non trouvé")
    return FileResponse(file_path, media_type="audio/mpeg")

@router.get("/voice/stream")
def stream_voice(
    text: str = Query(...),
    lang: str = Query("fr")
):
    try:
        tts = gTTS(text=text, lang=lang if lang in ['fr', 'en', 'ar'] else 'fr')
        mp3_buffer = io.BytesIO()
        tts.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)

        return StreamingResponse(
            mp3_buffer,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=stream.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de synthèse vocale : {str(e)}")

@router.post("/voice/speak")
def speak(text: str = Query(...), lang: str = Query("fr")):
    tts = gTTS(text=text, lang=lang if lang in ['fr', 'en', 'ar'] else 'fr')
    mp3_io = io.BytesIO()
    tts.write_to_fp(mp3_io)
    mp3_io.seek(0)
    return StreamingResponse(mp3_io, media_type="audio/mpeg")

# ---------- 🧠 Gestion des chatbots ----------
@router.post("/create", response_model=ChatbotInDB)
def create_chatbot(data: ChatbotCreate, user=Depends(get_current_user)):
    return chatbot_service.create_chatbot(data, user_id=user["_id"])

@router.get("/list", response_model=List[ChatbotInDB])
def list_chatbots(user=Depends(get_current_user)):
    return chatbot_service.get_user_chatbots(user_id=user["_id"])

@router.delete("/delete/{chatbot_id}")
def delete_chatbot(chatbot_id: str, user=Depends(get_current_user)):
    print(f"Delete request - Chatbot: {chatbot_id}, User: {user['_id']}, Role: {user.get('role')}")
    
    success = chatbot_service.delete_chatbot(chatbot_id, user["_id"])
    if not success:
        print("Failed to delete - see service logs for details")
        raise HTTPException(
            status_code=404,
            detail="Chatbot not found or permission denied"
        )
    return {"message": "Chatbot deleted successfully"}

@router.put("/update/{chatbot_id}")
def update_chatbot(chatbot_id: str, data: ChatbotUpdate, user=Depends(get_current_user)):
    print(f"Attempting to update chatbot {chatbot_id} for user {user['_id']}")
    success = chatbot_service.update_chatbot(chatbot_id, user["_id"], data)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Chatbot not found or you don't have permission to update it"
        )
    return {"message": "Chatbot updated successfully"}

@router.get("/history", response_model=List[Message])
async def get_chat_history(
    chatbot_id: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None
    return get_history(chatbot_id, limit, start_dt, end_dt) 