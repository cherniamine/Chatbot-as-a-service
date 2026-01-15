import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';


export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
  admin_id: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
}


@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8000/auth';  

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getSupervisedUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/supervised`, { headers: this.getHeaders() });
  }

  createUser(userData: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData, { headers: this.getHeaders() });
  }

  updateUser(userId: string, updateData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, updateData, { headers: this.getHeaders() });
  }

   deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`, { headers: this.getHeaders() });
  }

  getSupervisedUsersCount(): Observable<{ count: number }> {
  return this.http.get<{ count: number }>(
    `${this.apiUrl}/supervised/count`,
    { headers: this.getHeaders() }
  );
}

}
