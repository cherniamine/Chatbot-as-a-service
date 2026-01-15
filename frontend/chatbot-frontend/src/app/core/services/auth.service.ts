import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { UserCreate, UserLogin, UserInDB, UserToken, AdminUser } from '../../models/user.model';

export interface AdminStats {
  chatbotsCreated: number;
  documentsUploaded: number;
  interactionsLast30Days: number;
}

export interface UserStatsResponse {
  activeBots: number;
  uploadedDocuments: number;
  monthlyInteractions: number;
  createdAt: string;
  lastLogin: string;
  emailVerified: boolean;
  adminStats?: AdminStats;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8000';
  private readonly TOKEN_KEY = 'access_token';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  getAdmins(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/auth/admins`).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des admins:', error);
        return throwError(() => error);
      })
    );
  }

  register(user: UserCreate): Observable<UserInDB> {
    return this.http.post<UserInDB>(`${this.apiUrl}/auth/register`, user).pipe(
      catchError(error => {
        console.error('Erreur d\'inscription:', error);
        return throwError(() => error);
      })
    );
  }

  
login(credentials: UserLogin): Observable<UserToken> {
  return this.http.post<UserToken>(`${this.apiUrl}/auth/login`, credentials).pipe(
    tap(response => {
      this.setToken(response.access_token);
      this.isAuthenticatedSubject.next(true);
      
      const user = this.getUserInfo();
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }

      // Use array format for navigate to avoid double slashes
      if (user.role === 'admin') {
        this.router.navigate(['/dashboard', 'home']);
      } else {
        this.router.navigate(['/dashboard', 'chatbots']);
      }
    }),
    catchError(error => {
      console.error('Erreur de connexion:', error);
      return throwError(() => error);
    })
  );
}

  logout(): void {
    this.clearToken();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.hasValidToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.parseJwtPayload(token);
      return payload.exp < Date.now() / 1000;
    } catch (error) {
      console.error('Erreur parsing token:', error);
      return true;
    }
  }

  private parseJwtPayload(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }

  
  getUserInfo(): { email?: string; name?: string; role?: string } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.parseJwtPayload(token);
      return {
        email: payload.email,
        name: payload.name || payload.username,
        role: payload.role || 'user'
      };
    } catch (e) {
      return null;
    }
  }

getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.parseJwtPayload(token);
      return payload.sub || null;
    } catch (e) {
      console.error('Error parsing user id from token', e);
      return null;
    }
  }

verifyEmail(token: string) {
    return this.http.get<{ message: string }>(`${this.apiUrl}/auth/verify-email?token=${token}`);
  }

  // Méthode pour ajouter les headers d'authentification
  private getAuthHeaders() {
    const token = this.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  // Utilisation des headers dans les appels sécurisés

  getEmailStatus(userId: string) {
    return this.http.get<{ verified: boolean }>(
      `${this.apiUrl}/auth/user/email-status?userId=${userId}`,
      this.getAuthHeaders()
    );
  }

changePasswordWithOld(userId: string, oldPassword: string, newPassword: string) {
  return this.http.post(
    `${this.apiUrl}/auth/user/change-password`,
    { userId, oldPassword, newPassword }
  );
}


uploadAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('userId', userId);
  return this.http.post(
    `${this.apiUrl}/auth/user/upload-avatar`,
    formData,
    {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.getToken() || ''}`
      })
    }
  );
}

getUserAvatar(userId: string) {
  return this.http.get(
    `${this.apiUrl}/auth/user/avatar/${userId}`,
    {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.getToken() || ''}`
      })
    }
  );
}

// Dans AuthService
resendVerificationEmail(userId: string): Observable<{ message: string }> {
  return this.http.post<{ message: string }>(
    `${this.apiUrl}/auth/resend-verification`,
    { userId },
    this.getAuthHeaders()
  );
}

getUserDetails(userId: string): Observable<{
  createdAt: string;
  lastLogin: string;
  username: string;
  emailVerified: boolean;
}> {
  return this.http.get<{
    createdAt: string;
    lastLogin: string;
    username: string;
    emailVerified: boolean;
  }>(`${this.apiUrl}/auth/user/${userId}`, this.getAuthHeaders());
}

getUserStats(userId: string): Observable<UserStatsResponse> {
  return this.http.get<UserStatsResponse>(
    `${this.apiUrl}/auth/user/stats/${userId}`,
    this.getAuthHeaders()
  );
}

loginWithGoogle() {
  window.location.href = 'http://localhost:8000/auth/google'; 
}

loginWithGithub() {
  window.location.href = 'http://localhost:8000/auth/github';
}

handleAuthenticationCallback(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    // Stocker le token
    localStorage.setItem('access_token', token);
    
    // Rediriger vers le tableau de bord
    this.router.navigate(['/dashboard']);
  }

}

// auth.service.ts
forgotPassword(email: string) {
  return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
}

resetPassword(token: string, newPassword: string) {
  return this.http.post(`${this.apiUrl}/auth/reset-password`, {
    token: token,
    new_password: newPassword
  });
}



}