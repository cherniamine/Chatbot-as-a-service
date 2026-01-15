import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles: string[] = route.data['expectedRoles'];
    const user = this.authService.getUserInfo();

    if (!user) {
      this.router.navigate(['/auth', 'login']);
      return false;
    }

    if (expectedRoles.includes(user.role!)) {
      return true;
    }

    // Use array format for navigation
    if (user.role === 'admin') {
      this.router.navigate(['/dashboard', 'home']);
    } else {
      this.router.navigate(['/dashboard', 'chatbots']);
    }
    
    return false;
  }
}