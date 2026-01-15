import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Toast } from '../../../shared/components/toast/toast';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  standalone: true,
  imports: [LottieComponent, Toast, CommonModule, ReactiveFormsModule]
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  showToast = false;
  toastMessage = '';
  toastDuration = 4000;
  isLoading = false;
  token: string | null = null;

  robotOptions: AnimationOptions = {
    path: 'assets/lotties/robot-right.json',
    loop: true,
    autoplay: true
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    // Récupérer correctement le token dans l'URL et décoder les caractères spéciaux
    const rawToken = this.route.snapshot.queryParamMap.get('token');
    this.token = rawToken ? decodeURIComponent(rawToken) : null;
  }

  onSubmit() {
    if (!this.token) {
      this.showToastMessage('Token invalide ou expiré.');
      return;
    }

    if (this.form.value.newPassword !== this.form.value.confirmPassword) {
      this.showToastMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    if (this.form.valid) {
      this.isLoading = true;
      this.auth.resetPassword(this.token, this.form.value.newPassword).subscribe({
        next: () => {
          this.showToastMessage('Mot de passe réinitialisé avec succès !');
          // Redirection après affichage du toast
          setTimeout(() => this.router.navigate(['/auth/login']), this.toastDuration);
        },
        error: (err) => {
          console.error('HttpErrorResponse:', err);
          // Afficher le message exact du backend si disponible
          const message = err?.error?.detail || 'Erreur lors de la réinitialisation du mot de passe.';
          this.showToastMessage(message);
        },
        complete: () => this.isLoading = false
      });
    }
  }

  showToastMessage(message: string) {
    this.toastMessage = message;
    this.showToast = true;
  }
}
