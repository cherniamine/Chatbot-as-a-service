import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Edit3, LucideAngularModule, MessageCircle, Trash2, Settings, LogOut } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { User } from 'lucide-angular/src/icons';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, FormsModule, TranslateModule,RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  animations: [
    trigger('fadeInDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('100ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]

})
export class Navbar {
  avatarUrl: string = 'assets/user-avatar.png';
  userName: string = '';
  showSettings = false;
  isDarkMode = false;
  selectedLanguage = 'fr';
  searchQuery = '';
  

  constructor(
    private router: Router,
    private auth: AuthService,
    private translate: TranslateService
  ) {
    this.checkDarkModePreference();
    this.selectedLanguage = this.translate.currentLang || 'fr';
  }

   ngOnInit(): void {
    const user = this.auth.getUserInfo();
    if (user?.name) {
      this.userName = user.name;
    } else if (user?.email) {
      this.userName = user.email.split('@')[0]; 
    }
    
    this.loadUserAvatar();
  }

  loadUserAvatar() {
    const userId = this.auth.getUserId();
    if (userId) {
      this.auth.getUserAvatar(userId).subscribe({
        next: (blob) => {
          this.avatarUrl = URL.createObjectURL(blob);
        },
        error: (err) => {
          console.error('Error loading avatar:', err);
          this.avatarUrl = 'assets/user-avatar.png'; 
        }
      });
    }
  }
  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/auth/login']);
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'disabled');
    }
  }

  checkDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled' || (!darkMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode = false;
      document.documentElement.classList.remove('dark');
    }
  }

  onLanguageChange() {
    this.translate.use(this.selectedLanguage);
    localStorage.setItem('preferredLanguage', this.selectedLanguage);
  }
  onSearch() {
  if (this.searchQuery && this.searchQuery.trim().length > 0) {
    console.log('Recherche:', this.searchQuery.trim());
    // Tu peux ici ajouter d'autres traitements, ex: filtrer des données en local, appeler une API, etc.
  }
}

 
  

  

}