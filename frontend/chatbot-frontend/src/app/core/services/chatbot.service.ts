import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  ChatbotCreate, Chatbot, AskInput, AskResponse, Message,
  AskResponseMultiLang,
  ChatbotUpdate
} from '../../models/chatbot.model';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private apiUrl = 'http://localhost:8000/chatbot';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

// ✅ Création de chatbot
  create(data: ChatbotCreate): Observable<Chatbot> {
    return this.http.post<Chatbot>(
      `${this.apiUrl}/create`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // ✅ Liste chatbots utilisateur
  list(): Observable<Chatbot[]> {
    return this.http.get<Chatbot[]>(
      `${this.apiUrl}/list`,
      { headers: this.getHeaders() }
    );
  }

  // ✅ Pose question texte par langue
 ask(input: AskInput, lang: 'fr' | 'en' | 'ar'): Observable<AskResponse> {
  return this.http.post<AskResponse>(
    `${this.apiUrl}/ask-${lang}`,
    input,
    { headers: this.getHeaders() }
  );
}

  // ✅ Question texte multilangue
  askMultiLang(input: AskInput): Observable<AskResponseMultiLang> {
    return this.http.post<AskResponseMultiLang>(
      `${this.apiUrl}/ask-multi`,
      input,
      { headers: this.getHeaders() }
    );
  }

  // ✅ Question vocale (mono-langue)
  askVoiceByLang(audioFile: File, chatbotId: string, lang: 'fr' | 'en' | 'ar'): Observable<AskResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const params = new HttpParams().set('chatbot_id', chatbotId);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<AskResponse>(
      `${this.apiUrl}/ask-voice-${lang}`,
      formData,
      {
        headers,
        params
      }
    );
  }

  // ✅ Question vocale multi-langue
  askVoiceMulti(audioFile: File, chatbotId: string, lang: 'fr' | 'en' | 'ar' = 'fr'): Observable<AskResponseMultiLang> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const params = new HttpParams()
      .set('chatbot_id', chatbotId)
      .set('lang', lang);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<AskResponseMultiLang>(
      `${this.apiUrl}/ask-voice-multi`,
      formData,
      {
        headers,
        params
      }
    );
  }

  // ✅ Streaming TTS d'un texte
  speak(text: string, lang: 'fr' | 'en' | 'ar' = 'fr'): Observable<Blob> {
    const params = new HttpParams().set('text', text).set('lang', lang);
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/voice/speak`, {
      headers,
      params,
      responseType: 'blob'
    });
  }

  // ✅ Supprimer un chatbot
delete(chatbotId: string): Observable<{ message: string }> {
  return this.http.delete<{ message: string }>(
    `${this.apiUrl}/delete/${chatbotId}`,
    { 
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    }
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Error deleting chatbot';
      if (error.status === 404) {
        errorMessage = error.error?.detail || 'Chatbot not found or no permission';
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}
  // ✅ Historique basique
  getHistory(chatbotId: string, limit: number = 20): Observable<Message[]> {
    const params = new HttpParams()
      .set('chatbot_id', chatbotId)
      .set('limit', limit.toString());

    return this.http.get<Message[]>(
      `${this.apiUrl}/history`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  // ✅ Historique avancé avec filtres
  getHistoryAdvanced(filters: {
    chatbot_id: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Observable<Message[]> {
    let params = new HttpParams()
      .set('chatbot_id', filters.chatbot_id);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.limit !== undefined) params = params.set('limit', filters.limit.toString());

    return this.http.get<Message[]>(`${this.apiUrl}/history`, {
      headers: this.getHeaders(),
      params
    });
  }

  // ✅ Update chatbot name
update(chatbotId: string, newName: string): Observable<{ message: string }> {
  if (!newName || newName.trim().length === 0) {
    return throwError(() => new Error('Name cannot be empty'));
  }

  return this.http.put<{ message: string }>(
    `${this.apiUrl}/update/${chatbotId}`,
    { name: newName.trim() },
    { 
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    }
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Error updating chatbot';
      if (error.status === 422) {
        errorMessage = error.error?.detail || 'Invalid data provided';
      } else if (error.status === 404) {
        errorMessage = error.error?.detail || 'Chatbot not found or no permission';
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}

  // Accès direct au token (utile pour certains cas)
  getToken(): string | null {
    return this.authService.getToken();
  }

// Dans ChatbotService
getUserStats(userId: string): Observable<{
  activeBots: number;
  uploadedDocuments: number;
  monthlyInteractions: number;
}> {
  return this.http.get<{
    activeBots: number;
    uploadedDocuments: number;
    monthlyInteractions: number;
  }>(`${this.apiUrl}/stats/user/${userId}`, {
    headers: this.getHeaders()
  });
}


}
