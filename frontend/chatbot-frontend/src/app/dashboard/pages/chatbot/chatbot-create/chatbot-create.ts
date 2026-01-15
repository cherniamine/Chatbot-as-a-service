import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Toast } from '../../../../shared/components/toast/toast';

@Component({
  selector: 'app-chatbot-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule,
    Toast,
  ],
  templateUrl: './chatbot-create.html',
  styleUrl: './chatbot-create.scss',
})
export class ChatbotCreate {
  chatbotForm: FormGroup;
  submitting = false;
  showToast: any;
  toastMessage: any;
  toastDuration: any;
  type: any;

  constructor(
    private fb: FormBuilder,
    private chatbotService: ChatbotService,
    private router: Router
  ) {
    this.chatbotForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  onSubmit(): void {
    if (this.chatbotForm.invalid) return;
    this.submitting = true;

    this.chatbotService.create(this.chatbotForm.value).subscribe({
      next: () => {
        this.type = 'success';
        this.toastDuration = 5000;
        this.toastMessage = 'Chat Bot created Successfully';
        this.showToast = true;
        setTimeout(() => {
          this.router.navigate(['/dashboard/chatbots']);
        }, 2000);
      },
      complete: () => (this.submitting = false),
    });
  }
  navigateToList(): void {
    this.router.navigate(['/dashboard/chatbots']);
  }
}