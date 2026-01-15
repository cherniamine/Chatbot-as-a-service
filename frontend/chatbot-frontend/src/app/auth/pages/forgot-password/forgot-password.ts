import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Toast } from '../../../shared/components/toast/toast';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  standalone: true,
  imports: [LottieComponent, Toast, CommonModule , FormsModule, ReactiveFormsModule ]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  showToast = false;
  toastMessage = '';
  toastDuration = 4000;
  isLoading = false;

  robotOptions: AnimationOptions = {
    path: 'assets/lotties/robot-left.json',
    loop: true,
    autoplay: true
  };

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.auth.forgotPassword(this.form.value.email).subscribe({
        next: () => {
          this.toastMessage = 'Si cet email existe, un lien de réinitialisation a été envoyé.';
          this.showToast = true;
        },
        error: (err) => {
          this.toastMessage = 'Erreur lors de la demande de réinitialisation.';
          this.showToast = true;
          console.error(err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.toastMessage = 'Veuillez entrer une adresse email valide.';
      this.showToast = true;
    }
  }
}
