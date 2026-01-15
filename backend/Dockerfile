# Utilise une image Python officielle avec version sécurisée
FROM python:3.12-slim

# Configuration de l'environnement Python (nouveau format recommandé)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système requises (si nécessaire)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier l'application
COPY app/ ./app
COPY .env .

# Créer un utilisateur non-root pour la sécurité
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Exposer le port de l'API
EXPOSE 8000

# Commande de lancement
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]