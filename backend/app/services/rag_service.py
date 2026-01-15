# rag_service.py
import os
import time
import faiss
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from app.services.document_service import get_documents_by_chatbot
from app.utils.embedding_utils import get_embedding
from openai import AzureOpenAI
from typing import Dict, List, Optional

INDEX_PATH = "app/indexes"
_indexes_cache = {}
_documents_cache = {}
_chunks_cache = {}
_chunk_sources_cache = {}
MAX_CONTEXT_TOKENS = 1024

# Configuration Azure OpenAI client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
)

# Langues supportées
SUPPORTED_LANGUAGES = {
    'fr': {
        'system': "Tu es un assistant qui répond uniquement selon le contexte. Réponds en français.",
        'summary': "Tu es un assistant qui résume les réponses de manière claire et concise en français."
    },
    'en': {
        'system': "You are an assistant that answers strictly based on the context. Respond in English.",
        'summary': "You are an assistant that summarizes answers clearly and concisely in English."
    },
    'ar': {
        'system': "أنت مساعد يجيب فقط بناءً على السياق المقدم. أجب باللغة العربية.",
        'summary': "أنت مساعد يقوم بتلخيص الإجابات بشكل واضح وموجز باللغة العربية."
    }
}

DEFAULT_DEPLOYMENT = "gpt-4o"  


def build_index(chatbot_id: str) -> int:
    documents = get_documents_by_chatbot(chatbot_id)
    all_chunks = [chunk for doc in documents for chunk in doc.chunks]
    vectors = get_embedding(all_chunks)

    if isinstance(vectors[0], (float, np.float32, np.float64)):
        raise ValueError("get_embedding doit retourner un vecteur, pas un scalaire")

    vectors = np.array(vectors).astype("float32")
    dim = vectors.shape[1]

    index = faiss.IndexHNSWFlat(dim, 32)
    index.hnsw.efSearch = 64
    index.add(vectors)

    os.makedirs(INDEX_PATH, exist_ok=True)
    faiss.write_index(index, f"{INDEX_PATH}/{chatbot_id}.index")

    return len(all_chunks)


def _load_index(chatbot_id: str):
    if chatbot_id not in _indexes_cache:
        index_path = f"{INDEX_PATH}/{chatbot_id}.index"
        if not os.path.exists(index_path):
            build_index(chatbot_id)
        _indexes_cache[chatbot_id] = faiss.read_index(index_path)
    return _indexes_cache[chatbot_id]


def _cache_documents_and_chunks(chatbot_id: str):
    if chatbot_id not in _documents_cache:
        docs = get_documents_by_chatbot(chatbot_id)
        _documents_cache[chatbot_id] = docs

        chunks, chunk_sources = [], []
        for doc in docs:
            chunks.extend(doc.chunks)
            chunk_sources.extend([doc.filename] * len(doc.chunks))

        _chunks_cache[chatbot_id] = chunks
        _chunk_sources_cache[chatbot_id] = chunk_sources


def truncate_context(chunks: List[str], max_tokens: int = MAX_CONTEXT_TOKENS) -> str:
    context, total = [], 0
    for chunk in chunks:
        tokens = len(chunk.split())
        if total + tokens > max_tokens:
            break
        context.append(chunk)
        total += tokens
    return "\n".join(context)


def _generate_response(context: str, question: str, lang: str, deployment_name: str, chatbot_id: str) -> str:
    system_prompt = get_chatbot_system_prompt(chatbot_id, lang)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{context}\n\nQuestion: {question}"}
    ]

    response = client.chat.completions.create(
        model=deployment_name,
        messages=messages,
        temperature=0.7,
    )

    return response.choices[0].message.content



def _generate_summary(text: str, lang: str, deployment_name: str) -> str:
    messages = [
        {"role": "system", "content": SUPPORTED_LANGUAGES[lang]['summary']},
        {"role": "user", "content": text}
    ]

    response = client.chat.completions.create(
        model=deployment_name,
        messages=messages,
        temperature=0.7,
    )

    return response.choices[0].message.content


def query(question: str, chatbot_id: str, user_id: str, langs: Optional[List[str]] = None, deployment_name: str = DEFAULT_DEPLOYMENT) -> Dict:
    langs = langs or ['fr']
    start_time = time.time()

    _cache_documents_and_chunks(chatbot_id)

    # 🔍 Chargement de l'index FAISS
    t0 = time.time()
    index = _load_index(chatbot_id)

    # ✅ Vérification : Index vide
    if index.ntotal == 0:
        raise ValueError(f"L'index FAISS pour le chatbot {chatbot_id} est vide. Merci d'ajouter des documents avant de poser des questions.")

    # 🔎 Vectorisation de la question
    question_vector = get_embedding([question]).astype("float32")
    D, I = index.search(question_vector, k=5)
    print(f"🔍 Vector search: {time.time() - t0:.2f}s")

    # ✅ Sélection des chunks pertinents
    chunks = _chunks_cache[chatbot_id]
    chunk_sources = _chunk_sources_cache[chatbot_id]

    relevant_chunks = []
    used_sources = set()
    for idx in I[0]:
        # ✅ Important : Filtrer les index invalides (-1)
        if idx >= 0 and idx < len(chunks):
            relevant_chunks.append(chunks[idx])
            used_sources.add(chunk_sources[idx])

    # ✅ Création du contexte limité en tokens
    context = truncate_context(relevant_chunks)

    # ✅ Génération des réponses et résumés en parallèle pour chaque langue
    with ThreadPoolExecutor() as executor:
        future_responses = {
            lang: executor.submit(_generate_response, context, question, lang, deployment_name, chatbot_id)
            for lang in langs
        }
        answers = {lang: future_responses[lang].result() for lang in langs}

        future_summaries = {
            lang: executor.submit(_generate_summary, answers[lang], lang, deployment_name)
            for lang in langs
        }
        summaries = {lang: future_summaries[lang].result() for lang in langs}

    elapsed_time = time.time() - start_time

    # ✅ Construction du résultat final
    result = {
        "sources": list(used_sources),
        "time_to_respond": elapsed_time,
        "context": context
    }

    for lang in langs:
        result[f"answer_{lang}"] = answers[lang]
        result[f"summary_{lang}"] = summaries[lang]

    # ✅ Rétrocompatibilité : Remplir les clés "answer" et "summary" avec le FR par défaut
    if 'fr' in langs:
        result["answer"] = answers['fr']
        result["summary"] = summaries['fr']

    return result


def get_chatbot_system_prompt(chatbot_id: str, lang: str) -> str:
    from app.core.database import db
    from bson import ObjectId

    chatbots = db["chatbots"]
    try:
        chatbot = chatbots.find_one({"_id": ObjectId(chatbot_id)})
    except Exception:
        chatbot = None

    if chatbot and chatbot.get("description"):
        return f"Tu es un assistant. Description de ton rôle : {chatbot['description']}"
    
    return SUPPORTED_LANGUAGES.get(lang, {}).get('system', 'You are an assistant.')
