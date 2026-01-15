import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Home, Bot, FileText, History } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, TranslateModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar {
   isSidebarCollapsed = false; 
  userRole = '';
  userName = '';
  userEmail = '';
  avatarUrl = 'assets/user-avatar.png'; 
  activeNotifications = {
    home: false // Vous pouvez ajouter d'autres notifications ici
  };

  icons = {
    home: Home,
    bot: Bot,
    fileText: FileText,
    history: History
  };

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getUserInfo();
    if (user) {
      this.userRole = user.role || 'user';
      this.userName = user.name || 'Utilisateur';
      this.userEmail = user.email || '';
      
      this.loadUserAvatar();
    }
  }

  
  private loadUserAvatar() {
    const userId = this.auth.getUserId();
    if (userId) {
      this.auth.getUserAvatar(userId).subscribe(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          this.avatarUrl = reader.result as string;
        };
        reader.readAsDataURL(blob);
      }, () => {
        this.avatarUrl = 'assets/user-avatar.png';
      });
    }
  }

}