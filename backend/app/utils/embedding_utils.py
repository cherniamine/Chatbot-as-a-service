# embedding_utils.py
import os
import faiss
import numpy as np
from typing import Union, List
from sentence_transformers import SentenceTransformer


model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

INDEX_DIR = "indexes/"

def encode_texts(texts: List[str]) -> np.ndarray:
    """Encode une liste de textes en vecteurs NumPy"""
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

def get_embedding(texts: Union[str, List[str]]) -> np.ndarray:
    """Retourne les embeddings pour une chaîne ou une liste de chaînes"""
    if isinstance(texts, str):
        texts = [texts]
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

def create_faiss_index(vectors: np.ndarray) -> faiss.Index:
    """Crée un index FAISS HNSWFlat pour une recherche rapide"""
    dim = vectors.shape[1]
    index = faiss.IndexHNSWFlat(dim, 32)
    index.hnsw.efSearch = 64
    index.add(vectors)
    return index

def save_faiss_index(index: faiss.Index, chatbot_id: str):
    """Sauvegarde l'index FAISS sur disque"""
    os.makedirs(INDEX_DIR, exist_ok=True)
    faiss.write_index(index, os.path.join(INDEX_DIR, f"{chatbot_id}.index"))

def load_faiss_index(chatbot_id: str) -> faiss.Index:
    """Charge un index FAISS depuis disque"""
    index_path = os.path.join(INDEX_DIR, f"{chatbot_id}.index")
    if not os.path.exists(index_path):
        raise FileNotFoundError("Index FAISS introuvable pour ce chatbot.")
    return faiss.read_index(index_path)

def search_index(index: faiss.Index, query: str, k=5):
    """Recherche les k vecteurs les plus proches dans un index"""
    vector = get_embedding(query)
    distances, indices = index.search(np.array([vector]).astype("float32"), k)
    return indices[0], distances[0]
