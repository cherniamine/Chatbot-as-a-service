import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { AskInput, AskResponse, Chatbot, Message } from '../../../../models/chatbot.model';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DocumentUpload } from '../../document/document-upload/document-upload';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-chatbot-ask',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './chatbot-ask.html',
  styleUrls: ['./chatbot-ask.scss']
})
export class ChatbotAsk implements OnInit, OnDestroy, AfterViewChecked {

  chatbotId: string | null = null;
  chatbot: Chatbot | null = null;
  messages: Message[] = [];
  userMessage = '';
  isLoading = false;
  selectedLanguage: 'fr' | 'en' | 'ar' = 'fr';
  isRecording = false;
  isRecorded = false;
  recordedChunks: BlobPart[] = [];
  audioPreviewUrl: string | null = null;
  mediaRecorder!: MediaRecorder;
  stream!: MediaStream;
  duration = 15;
  elapsed = 0;
  timer: any;
  userRole: string = '';

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  constructor(
    private chatbotService: ChatbotService,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.selectedLanguage = (this.translate.currentLang as 'fr' | 'en' | 'ar') || 'fr';
    const userInfo = this.authService.getUserInfo();
    this.userRole = userInfo?.role || 'user';

    this.route.paramMap.subscribe(params => {
      this.chatbotId = params.get('chatbotId');
      if (this.chatbotId) this.loadChatbot();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.warn('Scroll failed', err);
    }
  }

  trackByTimestamp(index: number, item: Message): string {
    return item.timestamp ?? '';
  }

  loadChatbot(): void {
    if (!this.chatbotId) return;
    this.chatbotService.list().subscribe({
      next: bots => {
        this.chatbot = bots.find(bot => bot.id === this.chatbotId || (bot as any)._id === this.chatbotId) ?? null;
        if (this.chatbot) this.loadHistory();
      },
      error: err => console.error('Failed to load chatbot:', err)
    });
  }

  loadHistory(): void {
    if (!this.chatbotId) return;
    this.chatbotService.getHistory(this.chatbotId, 10).subscribe({
      next: history => {
        this.messages = history?.reverse() ?? [];
      },
      error: err => console.error('Failed to load history:', err)
    });
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || !this.chatbotId) return;

    const input: AskInput = {
      chatbot_id: this.chatbotId,
      question: this.userMessage,
      language: this.selectedLanguage
    };

    const userMsg: Message = {
      chatbot_id: this.chatbotId,
      question: this.userMessage,
      answer: '',
      summary: '',
      sources: [],
      timestamp: new Date().toISOString()
    };

    this.messages.push(userMsg);
    this.isLoading = true;
    this.userMessage = '';

    const lang = this.translate.currentLang as 'fr' | 'en' | 'ar';

    this.chatbotService.ask(input, lang).subscribe({
      next: (response: AskResponse) => {
        userMsg.answer = response.answer ?? '';
        const audioUrl = (response as any).audioUrl ?? (response as any).audio_url;
        if (audioUrl) userMsg.audioUrl = audioUrl;
        userMsg.summary = response.summary ?? '';
        userMsg.sources = response.sources ?? [];
        this.isLoading = false;
      },
      error: (err: any) => {
        userMsg.answer = 'Désolé, une erreur s\'est produite';
        this.isLoading = false;
        console.error('Erreur envoi texte:', err);
      }
    });
  }

startRecording(): void {
    if (this.isRecording || this.isRecorded || !this.chatbotId) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.stream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.audioPreviewUrl = URL.createObjectURL(blob);
        this.isRecording = false;
        this.isRecorded = true;
        clearInterval(this.timer);

        // 👉 Afficher la prévisualisation dans le chat
        this.messages.push({
          chatbot_id: this.chatbotId!,
          question: '[ Prévisualisation vocale ]',
          answer: '',
          summary: '',
          sources: [],
          timestamp: new Date().toISOString(),
          audioUrl: this.audioPreviewUrl,
        });

        this.scrollToBottom();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.elapsed = 0;

      this.timer = setInterval(() => {
        this.elapsed++;
        if (this.elapsed >= this.duration) {
          this.stopRecording();
        }
      }, 1000);
    }).catch(err => {
      console.error('Erreur accès micro :', err);
    });
  }

  sendRecording(): void {
    if (!this.chatbotId || this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

    // ❌ Supprime le message de prévisualisation
    this.messages = this.messages.filter(msg => msg.question !== '[ Prévisualisation vocale ]');

   const userMsg: Message = {
  chatbot_id: this.chatbotId,
  question: '[ Prévisualisation vocale ]',
  answer: '',
  summary: '',
  sources: [],
  audioUrl: this.audioPreviewUrl || '',
  timestamp: new Date().toISOString()
};

    this.messages.push(userMsg);
    this.scrollToBottom();
    this.isLoading = true;

    this.chatbotService.askVoiceByLang(file, this.chatbotId, this.selectedLanguage)
      .subscribe({
        next: (response: AskResponse) => {
          userMsg.answer = response.answer ?? '';
          userMsg.summary = response.summary ?? '';
          userMsg.sources = response.sources ?? [];
          this.isLoading = false;
          this.resetRecording();
          this.scrollToBottom();

          const audioUrl = (response as any).audioUrl ?? (response as any).audio_url;
          if (audioUrl) {
            this.playAudio(audioUrl);
            userMsg.audioUrl = audioUrl;
          }
        },
        error: (err) => {
          userMsg.answer = 'Une erreur est survenue lors du traitement du message vocal.';
          this.isLoading = false;
          this.resetRecording();
          this.scrollToBottom();
          console.error('Erreur envoi vocal:', err);
        }
      });
  }
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  resetRecording(): void {
    this.recordedChunks = [];
    this.audioPreviewUrl = null;
    this.isRecording = false;
    this.isRecorded = false;
    clearInterval(this.timer);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
  }

  

  playAudio(audioUrl: string): void {
    const audio = new Audio(`http://localhost:8000${audioUrl}`);
    audio.play().catch(err => console.error('Erreur lecture audio:', err));
  }

  resetConversation(): void {
    this.messages = [];
  }

  
}
