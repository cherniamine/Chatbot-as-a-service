import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Toast } from '../../../shared/components/toast/toast';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LottieComponent, AnimationOptions  } from 'ngx-lottie';

@Component({
  selector: 'app-login',
  standalone: true, 
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
 imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    LottieComponent,
    Toast
  ]
})
export class Login implements OnInit {
 form!: FormGroup;
  toastMessage = '';
  showToast = false;
  toastDuration = 4000;
  showPassword = false;
  isLoading = false;

  // Options Lottie
  leftRobotOptions: AnimationOptions  = {
    path: 'assets/lotties/robot-left.json',
    renderer: 'svg',
    loop: true,
    autoplay: true
  };

  rightRobotOptions: AnimationOptions  = {
    path: 'assets/lotties/robot-right.json',
    renderer: 'svg',
    loop: true,
    autoplay: true
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
      this.auth.handleAuthenticationCallback();
  }

  onSubmit() {
    if (this.showToast) {
      this.showToast = false;
    }

    if (this.form.valid) {
      this.isLoading = true;
      this.auth.login(this.form.value).subscribe({
        next: () => {
          this.toastMessage = 'Connexion réussie !';
          this.showToast = true;
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, this.toastDuration);
        },
        error: (err) => {
          this.toastMessage = 'Erreur de connexion, veuillez vérifier vos identifiants.';
          this.showToast = true;
          console.error(err);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.toastMessage = 'Veuillez remplir correctement le formulaire.';
      this.showToast = true;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle() {
  this.auth.loginWithGoogle();
}

loginWithGithub() {
  this.auth.loginWithGithub();
}

}