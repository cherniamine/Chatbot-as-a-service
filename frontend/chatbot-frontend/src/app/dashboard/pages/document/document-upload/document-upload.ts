import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
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

  // --- OCR preview (images uniquement) ---
  private readonly imageExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp'];
  isImageFile = false;
  isOcrLoading = false;
  ocrText: string | null = null;
  ocrError: string | null = null;

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
      this.handleSelectedFile(this.selectedFile);
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
        this.handleSelectedFile(file);
      } else {
        console.warn('Format non supporté:', file.name);
        alert('Format de fichier non supporté');
      }
    }
  }

  /** Détecte si le fichier est une image et lance la preview OCR le cas échéant */
  private handleSelectedFile(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    this.isImageFile = this.imageExtensions.includes(extension);
    this.ocrText = null;
    this.ocrError = null;

    if (this.isImageFile) {
      this.isOcrLoading = true;
      this.documentService.ocrPreview(file).subscribe({
        next: (res) => {
          this.isOcrLoading = false;
          this.ocrText = res.text?.trim() || '';
        },
        error: (err) => {
          this.isOcrLoading = false;
          this.ocrError =
            err.error?.detail || err.message || "Erreur lors de l'extraction OCR";
          console.error('Erreur OCR preview:', err);
        },
      });
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
    this.isImageFile = false;
    this.isOcrLoading = false;
    this.ocrText = null;
    this.ocrError = null;
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

      // Si c'est une image et que la preview OCR a produit un texte
      // (éventuellement corrigé par l'utilisateur), on l'envoie tel quel
      // pour éviter de relancer l'OCR et pour indexer la version corrigée.
      const correctedText = this.isImageFile && this.ocrText !== null ? this.ocrText : undefined;

      this.documentService.upload(this.chatbotId, this.selectedFile, correctedText).subscribe({
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