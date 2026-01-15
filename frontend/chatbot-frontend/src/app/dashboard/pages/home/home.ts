import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chatbot } from '../../../models/chatbot.model';
import { ChatbotService } from '../../../core/services/chatbot.service';
import { catchError, forkJoin, of } from 'rxjs';
import { DocumentService } from '../../../core/services/document.service';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslateModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  chatbots: Chatbot[] = [];
  uploadedDocuments: any[] = [];
  totalConversations = 0;
  supervisedUserCount = 0;
  totalBots: number = 0;
  lastUploadDate: Date | null = null;

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private router: Router,
    private documentService: DocumentService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadChatbots();
    this.loadSupervisedUserCount();
  }

  loadChatbots(): void {
    this.chatbotService.list()
      .pipe(
        catchError(err => {
          console.error(err);
          return of([]);
        })
      )
      .subscribe((res: any[]) => {
        this.chatbots = res.map(bot => ({
          id: bot._id,
          name: bot.name,
          user_id: bot.user_id,
          description: bot.description || '',
        }));
        this.loadDocuments();
      });
  }

  loadDocuments(): void {
    if (this.chatbots.length === 0) {
      this.resetDocumentStats();
      return;
    }

    this.totalBots = this.chatbots.length;

    const documentRequests = this.chatbots.map(bot => 
      this.documentService.list(bot.id).pipe(
        catchError(err => {
          console.error(`Error loading documents for bot ${bot.name}`, err);
          return of([]);
        })
      )
    );

    const conversationRequests = this.chatbots.map(bot => 
      this.chatbotService.getHistory(bot.id, 100).pipe(
        catchError(err => {
          console.error(`Error loading history for bot ${bot.name}`, err);
          return of([]);
        })
      )
    );

    forkJoin([
      forkJoin(documentRequests),
      forkJoin(conversationRequests)
    ]).subscribe(([allDocs, allConversations]) => {
      this.processDocuments(allDocs, allConversations);
    });
  }

  private resetDocumentStats(): void {
    this.uploadedDocuments = [];
    this.totalConversations = 0;
    this.totalBots = 0;
    this.lastUploadDate = null;
  }

  private processDocuments(allDocs: any[][], allConversations: any[][]): void {
    this.uploadedDocuments = allDocs.flat();
    this.updateLastUploadDate();
    
    this.chatbots = this.chatbots.map((bot, index) => ({
      ...bot,
      isActive: Array.isArray(allDocs[index]) && allDocs[index].length > 0
    }));

    this.totalConversations = allConversations.reduce(
      (sum, convArray) => sum + (Array.isArray(convArray) ? convArray.length : 0), 
      0
    );
  }

  private updateLastUploadDate(): void {
    if (this.uploadedDocuments.length === 0) {
      this.lastUploadDate = null;
      return;
    }

    const validDates = this.uploadedDocuments
      .map(doc => {
        const dateStr = doc.uploadDate || doc.createdAt;
        if (!dateStr) return null;
        
        try {
          return new Date(dateStr);
        } catch {
          return null;
        }
      })
      .filter((date): date is Date => date instanceof Date && !isNaN(date.getTime()));

    this.lastUploadDate = validDates.length > 0 
      ? new Date(Math.max(...validDates.map(date => date.getTime())))
      : null;
  }

  getUploadStatusText(): string {
    if (this.uploadedDocuments.length === 0) {
      return this.translate.instant('DASHBOARD.STATS.NO_UPLOADS');
    }
    
    const prefix = this.translate.instant('DASHBOARD.STATS.LAST_UPLOAD') + ': ';
    
    if (!this.lastUploadDate) {
      return prefix + this.translate.instant('DASHBOARD.STATS.DATE_NOT_AVAILABLE');
    }

    return prefix + this.lastUploadDate.toLocaleDateString();
  }

  get activeBotsCount(): number {
    return this.chatbots.filter(bot => bot.isActive).length;
  }

  loadSupervisedUserCount(): void {
    this.userService.getSupervisedUsersCount().subscribe({
      next: (response) => {
        this.supervisedUserCount = response.count;
      },
      error: (err) => {
        console.error('Erreur en récupérant le nombre d\'utilisateurs supervisés', err);
      }
    });
  }

  goToCreateChatbot(): void {
    this.router.navigate(['/dashboard/chatbots/create']);
  }

  navigateToHelp(): void {
  this.router.navigate(['/dashboard/help']);
}

}