import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.authService.getUserInfo();
    
    if (!user) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    if (user.role === 'admin') {
      this.router.navigate(['/dashboard', 'home']);
      return false;
    } else {
      this.router.navigate(['/dashboard', 'chatbots']);
      return false;
    }
  }
}