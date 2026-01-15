import { Injectable } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  constructor(private authService: AuthService) {}

  login(data: any) {
    return this.authService.login(data);
  }

  register(data: any) {
    return this.authService.register(data);
  }

  logout() {
    this.authService.logout();
  }

  isAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  getToken(): string | null {
    return this.authService.getToken();
  }
}
