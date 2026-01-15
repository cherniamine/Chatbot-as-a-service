import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Toast } from '../../../shared/components/toast/toast';
import { LucideAngularModule } from 'lucide-angular';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink, Toast, LucideAngularModule, LottieComponent ]
})
export class Register implements OnInit {
  admins: any[] = [];
  form!: FormGroup;
  showPassword = false;
  toastMessage = '';
  showToast = false;
  toastDuration = 4000;
  isLoading = false;

  leftRobotOptions: AnimationOptions = {
    path: 'assets/lotties/robot-left.json',
    renderer: 'svg',
    loop: true,
    autoplay: true
  };

  rightRobotOptions: AnimationOptions = {
    path: 'assets/lotties/robot-right.json',
    renderer: 'svg',
    loop: true,
    autoplay: true
  };

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', Validators.required],  
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      admin_id: ['', Validators.required] 
    }, { validators: this.passwordMatchValidator });

    this.auth.getAdmins().subscribe({
      next: data => this.admins = data,
      error: err => console.error('Erreur admins:', err)
    });

    // Si OAuth a renvoyé un token (après redirection)
    this.auth.handleAuthenticationCallback();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.showToast) this.showToast = false;

    if (this.form.valid) {
      this.isLoading = true;
      this.auth.register(this.form.value).subscribe({
        next: () => {
          this.toastMessage = "Inscription réussie ! Veuillez vérifier votre email.";
          this.showToast = true;
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/auth/login']), 2000); // redirection après succès
        },
        error: err => {
          this.toastMessage = 'Erreur lors de l\'inscription: ' + (err.error?.detail || 'Veuillez réessayer');
          this.showToast = true;
          this.isLoading = false;
        }
      });
    } else {
      this.toastMessage = this.form.hasError('passwordMismatch') ? 
        'Les mots de passe ne correspondent pas' : 
        'Veuillez remplir correctement le formulaire';
      this.showToast = true;
    }
  }

  registerWithGoogle() {
    this.auth.loginWithGoogle();
  }

  registerWithGithub() {
    this.auth.loginWithGithub();
  }
}
