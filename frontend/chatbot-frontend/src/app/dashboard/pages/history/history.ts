import { Component, OnInit } from '@angular/core';
import { Chatbot, Message } from '../../../models/chatbot.model';
import { ChatbotService } from '../../../core/services/chatbot.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule,TranslateModule,LucideAngularModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit {
  chatbots: Chatbot[] = [];
  selectedChatbotId: string = '';
  startDate: string = '';
  endDate: string = '';
  messages: Message[] = [];
  loading = false;
  errorMsg = '';
  hasSearched = false; 

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.loadChatbots();
  }

  loadChatbots(): void {
    this.loading = true;
    this.chatbotService.list().subscribe({
      next: (data) => {
        this.chatbots = data.map(bot => ({
          id: bot.id || (bot as any)._id,
          name: bot.name,
          user_id: bot.user_id,
          description: bot.description || '',
          avatarUrl: bot.avatarUrl
        }));
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Erreur lors du chargement des chatbots.';
        this.loading = false;
        console.error('Error loading chatbots:', err);
      }
    });
  }

  onChatbotChange(): void {
    this.messages = [];
    this.hasSearched = false;
  }

  getHistoryAdvanced(): void {
    if (!this.selectedChatbotId) {
      this.errorMsg = 'Veuillez choisir un chatbot.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.hasSearched = true; 

    const params = {
      chatbot_id: this.selectedChatbotId,
      ...(this.startDate && { start_date: this.startDate }),
      ...(this.endDate && { end_date: this.endDate })
    };

    this.chatbotService.getHistoryAdvanced(params).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Erreur lors du chargement de l\'historique.';
        this.loading = false;
        console.error('Erreur lors du chargement de l\'historique:', err);
      }
    });
  }
}