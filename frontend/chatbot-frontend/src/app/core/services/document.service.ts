// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';
import { AuthService } from './auth.service';  // importer AuthService
import { AppDocument } from '../../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  upload(chatbotId: string, file: File): Observable<AppDocument> {
    const formData = new FormData();
    formData.append('chatbot_id', chatbotId);
    formData.append('file', file);

    return this.http.post<AppDocument>(`${this.apiUrl}/document/upload`, formData, {
      headers: this.getHeaders()
    });
  }

  list(chatbotId: string): Observable<AppDocument[]> {
    const params = new HttpParams().set('chatbot_id', chatbotId);
    return this.http.get<AppDocument[]>(`${this.apiUrl}/document/list`, {
      headers: this.getHeaders(),
      params
    });
  }

delete(documentId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/document/${documentId}`,
      {
        headers: this.getHeaders()
      }
    );
  }

}
