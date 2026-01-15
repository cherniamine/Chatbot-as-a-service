import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [CommonModule,FormsModule,ReactiveFormsModule,LucideAngularModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  userId!: string;
  userName = '';
  email = '';
  emailVerified = false;
  createdAt: string = '';
 lastLogin: Date | null = null;
  role: string = 'user';
  currentPlan: string = 'Gratuit';
  planExpiration?: string;

adminChatbotsCreated: number = 0;
adminDocumentsUploaded: number = 0;
adminInteractionsLast30Days: number = 0;

  
  avatarUrl: string = '';
  avatarFile: File | null = null;
companyName: string = 'Insomea'; 
department: string = 'Ressources Humaines'; 
accessLevel: string = 'Complet';
itSupportEmail = 'it-support@insomea.com';
  passwordForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

    activeBotsCount: number = 0;
  uploadedDocumentsCount: number = 0;
  monthlyInteractions: number = 0;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private chatbotService: ChatbotService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userInfo = this.auth.getUserInfo();
    this.userId = this.auth.getUserId() || '';
    this.userName = userInfo?.name || '';
    this.email = userInfo?.email || '';

    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.checkEmailVerification();
    this.loadAvatar();
     this.loadUserData();
  }

private loadUserData(): void {
    const userInfo = this.auth.getUserInfo();
    this.userId = this.auth.getUserId() || '';

    if (!this.userId || !userInfo) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.userName = userInfo.name || '';
    this.email = userInfo.email || '';
    this.role = userInfo.role || 'user';

    this.auth.getUserStats(this.userId).subscribe({
      next: (stats) => {
       console.log('User stats received:', stats);
    this.createdAt = new Date(stats.createdAt).toLocaleString();
    this.lastLogin = stats.lastLogin ? new Date(stats.lastLogin) : null;
    this.emailVerified = stats.emailVerified;
    this.activeBotsCount = stats.activeBots || 0;
    this.uploadedDocumentsCount = stats.uploadedDocuments || 0;
    this.monthlyInteractions = stats.monthlyInteractions || 0;
    this.checkEmailVerification();
         if (stats.adminStats) {
      this.adminChatbotsCreated = stats.adminStats.chatbotsCreated || 0;
      this.adminDocumentsUploaded = stats.adminStats.documentsUploaded || 0;
      this.adminInteractionsLast30Days = stats.adminStats.interactionsLast30Days || 0;
    }
    
      },
      error: (err) => {
        console.error('Failed to load user details', err);
        this.loadStats();
      }
    });
  }

private loadStats(): void {
  if (!this.userId) {
    console.warn('loadStats: userId is null or undefined');
    return;
  }

  console.log(`loadStats: fetching stats for userId=${this.userId}`);

  this.auth.getUserStats(this.userId).subscribe({
    next: (stats) => {
      console.log('loadStats: stats received:', stats);

      this.activeBotsCount = stats.activeBots || 0;
      this.uploadedDocumentsCount = stats.uploadedDocuments || 0;
      this.monthlyInteractions = stats.monthlyInteractions || 0;
      this.createdAt = stats.createdAt;
      this.lastLogin = stats.lastLogin ? new Date(stats.lastLogin) : null;

      console.log(
        `loadStats: activeBotsCount=${this.activeBotsCount}, creation=${this.createdAt}, lastLogin=${this.lastLogin}, uploadedDocumentsCount=${this.uploadedDocumentsCount}, monthlyInteractions=${this.monthlyInteractions}`
      );
    },
    error: (err) => {
      console.error('loadStats: failed to load stats', err);
    }
  });
}



   resendVerificationEmail(): void {
    if (!this.userId) return;

    this.auth.resendVerificationEmail(this.userId).subscribe({
      next: () => this.successMessage = 'Email de vérification envoyé',
      error: (err) => {
        console.error('Failed to resend verification email', err);
        this.errorMessage = 'Échec de l\'envoi de l\'email de vérification';
      }
    });
  }

    clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  checkEmailVerification() {
  console.log('Checking email verification for user:', this.userId);
  this.auth.getEmailStatus(this.userId).subscribe({
    next: (res) => {
      this.emailVerified = res.verified;
      console.log('Email verification status from API:', res.verified);
      console.log('Current emailVerified value:', this.emailVerified);
    },
    error: (err) => {
      console.error('Error checking email:', err);
      this.emailVerified = false;
    }
  });
}

  toggleVisibility(field: string) {
    if (field === 'old') this.showOldPassword = !this.showOldPassword;
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  onAvatarSelected(event: any) {
    this.avatarFile = event.target.files[0];
  }

  uploadAvatar() {
    if (!this.avatarFile) return;
    this.auth.uploadAvatar(this.userId, this.avatarFile).subscribe({
      next: () => {
        this.successMessage = 'Avatar mis à jour avec succès';
        this.errorMessage = '';
        this.loadAvatar(); // Recharger l'avatar après upload
      },
      error: () => {
        this.errorMessage = 'Erreur lors de l\'upload de l\'avatar';
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.isSubmitting = true;
    this.auth.changePasswordWithOld(this.userId, oldPassword, newPassword).subscribe({
      next: () => {
        this.successMessage = 'Mot de passe changé avec succès';
        this.errorMessage = '';
        this.passwordForm.reset();
      },
      error: () => {
        this.errorMessage = 'Ancien mot de passe incorrect';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  loadAvatar() {
    this.auth.getUserAvatar(this.userId).subscribe({
      next: (blob) => {
        this.avatarUrl = URL.createObjectURL(blob);
      },
      error: (err) => {
        console.error('Erreur chargement avatar', err);
        this.avatarUrl = 'assets/user-avatar.png'; // fallback
      }
    });
  }

  onAvatarLoadError(): void {
  this.avatarUrl = 'assets/default-avatar.png';  
}


}