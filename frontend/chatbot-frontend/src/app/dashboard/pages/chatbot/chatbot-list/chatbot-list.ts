import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { Chatbot } from '../../../../models/chatbot.model';
import { LucideAngularModule, Trash2, Edit3, MessageCircle } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { RenameModal } from '../../../../shared/components/rename-modal/rename-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-chatbot-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule,DeleteModal,TranslateModule,ReactiveFormsModule,FormsModule],
  templateUrl: './chatbot-list.html',
  styleUrls: ['./chatbot-list.scss']
})
export class ChatbotList implements OnInit {
  userRole: string | null = null;
  chatbots: Chatbot[] = [];
  filteredChatbots: Chatbot[] = []; 
  searchQuery = '';
  isDeleting = false
  loading = false;
  error: string | null = null;
 selectedBotId: string | null = null;
  showDeleteModal = false;
  icons = {
    trash: Trash2,
    edit: Edit3,
    message: MessageCircle
  };

  constructor(private chatbotService: ChatbotService, private router: Router,private dialog: MatDialog,private authService: AuthService  ) {}

  ngOnInit(): void {
  this.loadChatbots();

  const user = this.authService.getUserInfo();
  this.userRole = user?.role ?? null;
  console.log('Role utilisateur détecté :', this.userRole);

  console.log('Type of role:', typeof this.userRole); // Check if string
  console.log('Exact value:', JSON.stringify(this.userRole)); // Check for hidden chars

}


  loadChatbots(): void {
    this.loading = true;
    this.error = null;

    this.chatbotService.list()
      .pipe(
        catchError(err => {
          this.error = 'Erreur lors du chargement des chatbots.';
          console.error(err);
          return of([]);
        })
      )
      .subscribe({
        next: (res: any[]) => {
          this.chatbots = res.map(item => ({
            id: item._id,
            name: item.name,
            user_id: item.user_id,
            description: item.description || '' ,
            isActive: item.isActive === true || item.isActive === 'true' || item.isActive === 1

          }));
           console.log('Chatbots loaded:', this.chatbots); // Ajoutez ce log pour vérification
        this.filteredChatbots = [...this.chatbots];
        },
        complete: () => (this.loading = false)
      });
  }
 filterChatbots(): void {
    if (!this.searchQuery) {
      this.filteredChatbots = [...this.chatbots];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredChatbots = this.chatbots.filter(bot => 
      bot.name.toLowerCase().includes(query) || 
      bot.id.toLowerCase().includes(query)
    );
  }

  navigateToCreate(): void {
    this.router.navigate(['/dashboard/chatbots/create']);
  }
  
  shortenId(id: string): string {
    return id.length > 8 ? `${id.substring(0, 4)}...${id.substring(id.length - 4)}` : id;
  }

 openDeleteModal(id: string): void {
  this.selectedBotId = id;
  this.showDeleteModal = true;
}

confirmDelete(): void {
  if (!this.selectedBotId) return;
  
  this.isDeleting = true;
  this.error = null;

  this.chatbotService.delete(this.selectedBotId).subscribe({
    next: () => {
      // Update both the main list and filtered list
      this.chatbots = this.chatbots.filter(bot => bot.id !== this.selectedBotId);
      this.filteredChatbots = this.filteredChatbots.filter(bot => bot.id !== this.selectedBotId);
      
      this.selectedBotId = null;
      this.showDeleteModal = false;
      this.isDeleting = false;
    },
    error: (err) => {
      this.error = err.message;
      console.error('Delete error:', err);
      this.isDeleting = false;
    }
  });
}
cancelDelete(): void {
  this.showDeleteModal = false;
  this.selectedBotId = null;
}


 renameChatbot(bot: Chatbot): void {
  const dialogRef = this.dialog.open(RenameModal, {
    data: { currentName: bot.name },
    width: '400px',
    panelClass: 'custom-dialog-container',
    disableClose: true,
  });

  const instance = dialogRef.componentInstance;
  instance.currentName = bot.name;

  instance.renamed.subscribe((newName: string) => {
    if (newName.trim() && newName.trim() !== bot.name) {
      this.chatbotService.update(bot.id, newName.trim())
        .pipe(
          catchError(err => {
            this.error = 'Erreur lors du renommage.';
            console.error(err);
            return of(null);
          })
        )
        .subscribe({
          next: () => {
            const target = this.chatbots.find(c => c.id === bot.id);
            if (target) {
              target.name = newName.trim();
            }
            dialogRef.close();
          }
        });
    } else {
      dialogRef.close(); // fermer s’il n’y a pas de changement
    }
  });

  instance.cancelled.subscribe(() => dialogRef.close());
}

navigateToChat(chatbotId: string): void {
  this.router.navigate([`/dashboard/chatbots/${chatbotId}/ask`]);
}


}
