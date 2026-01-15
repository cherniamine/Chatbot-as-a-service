import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DocumentService } from '../../../../core/services/document.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FileSizePipe } from '../../../../shared/pipes/file-size-pipe';
import { TranslateModule } from '@ngx-translate/core';
import { Toast } from '../../../../shared/components/toast/toast';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    FileSizePipe,
    TranslateModule,
    Toast,
  ],
  templateUrl: './document-upload.html',
  styleUrls: ['./document-upload.scss'],
})
export class DocumentUpload {
  selectedFile: File | null = null;
  @Input() chatbotId: string = '';
  isDragging = false;
  isLoading = false;
  supportedFormats = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'];
  showToast: any;
  toastMessage: any;
  toastDuration: any;
  type: any;

  constructor(
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.chatbotId = this.route.snapshot.queryParamMap.get('chatbot_id') || '';
    console.log('Chatbot ID:', this.chatbotId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Fichier sélectionné:', this.selectedFile);
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      console.log('Fichier déposé:', file);
      if (this.isFileFormatSupported(file)) {
        this.selectedFile = file;
        console.log('Format supporté:', file.name);
      } else {
        console.warn('Format non supporté:', file.name);
        alert('Format de fichier non supporté');
      }
    }
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    console.log('Drag over actif');
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    console.log('Drag leave');
  }

  removeFile(): void {
    console.log('Fichier supprimé:', this.selectedFile?.name);
    this.selectedFile = null;
  }

  onUpload(): void {
    if (this.selectedFile && this.chatbotId) {
      if (this.selectedFile.size > 10 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 10MB)');
        console.warn('Fichier trop volumineux:', this.selectedFile.size);
        return;
      }

      this.isLoading = true;
      console.log("Début de l'upload pour:", this.selectedFile.name);

      this.documentService.upload(this.chatbotId, this.selectedFile).subscribe({
        next: () => {
          this.isLoading = false;
          console.log('Upload réussi:', this.selectedFile?.name);

          this.type = 'success';
          this.toastDuration = 5000;
          this.toastMessage = 'Document uploadé avec succès';
          this.showToast = true;
          const currentUrl = this.router.url;
          const isFromAskPage = /\/dashboard\/chatbots\/[^\/]+\/ask/.test(
            currentUrl
          );
          console.log('URL actuelle:', currentUrl);
          console.log('Redirection nécessaire ?', !isFromAskPage);
          setTimeout(() => {
            if (!isFromAskPage) {
              this.router.navigate(['/dashboard/documents'], {
                queryParams: {
                  chatbotId: this.chatbotId,
                  refresh: new Date().getTime(),
                },
              });
            }
          }, 5000);
        },
        error: (err) => {
          this.isLoading = false;
          console.error("Erreur lors de l'upload:", err);

          this.type = 'danger';
          this.toastDuration = 5000;
          this.toastMessage = `Erreur lors de l'upload: ${
            err.error?.message || err.message
          }`;
          this.showToast = true;
        },
      });
    } else {
      console.warn('Aucun fichier sélectionné ou chatbot ID manquant');
    }
  }

  private isFileFormatSupported(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    console.log('Extension de fichier détectée:', extension);
    
    // Liste complète des formats supportés
    const supported = [
      'pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'pptx',
      'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'
    ];
    
    return extension ? supported.includes(extension) : false;
  }
}