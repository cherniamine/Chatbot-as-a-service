import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Toast } from "../../../../shared/components/toast/toast";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  imports: [Toast,CommonModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail implements OnInit {
  message = 'Vérification de votre compte en cours...';
  redirecting = false;
  showToast = false;
  toastMessage = '';
  toastDuration = 3000;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      this.authService.verifyEmail(token).subscribe({
        next: (res) => {
          this.message = res.message || 'Votre compte a été vérifié avec succès.';
          this.toastMessage = this.message;
          this.showToast = true;

          this.redirecting = true;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, this.toastDuration);
        },
        error: (err) => {
          this.message = err.error?.detail || 'Échec de la vérification. Token invalide ou expiré.';
          this.toastMessage = this.message;
          this.showToast = true;
        }
      });
    } else {
      this.message = 'Token de vérification manquant dans l\'URL.';
      this.toastMessage = this.message;
      this.showToast = true;
    }
  }
}
