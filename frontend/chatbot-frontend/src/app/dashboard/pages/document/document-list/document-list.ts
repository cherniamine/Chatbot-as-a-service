import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../../core/services/document.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppDocument } from '../../../../models/document.model';
import { HttpClientModule } from '@angular/common/http';
import { Chatbot } from '../../../../models/chatbot.model';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FileSizePipe } from "../../../../shared/pipes/file-size-pipe";
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';


@Component({
  selector: 'app-document-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule, RouterModule, TranslateModule, FileSizePipe, LucideAngularModule, DeleteModal], 
  templateUrl: './document-list.html',
  styleUrl: './document-list.scss'
})
export class DocumentList implements OnInit {
  chatbots: Chatbot[] = [];
  selectedChatbotId: string = '';
  documents: AppDocument[] = [];
  errorMsg: string = '';
  filterDate: string | null = null;
  filteredDocuments: AppDocument[] = [];
  
  // Propriétés pour la modal de suppression
  showDeleteModal = false;
  documentToDelete: string | null = null;
  deleteInProgress = false;

  constructor(
    private chatbotService: ChatbotService,
    private documentService: DocumentService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    console.log('DocumentList component initialized');
    this.loadChatbots();
    this.filteredDocuments = [...this.documents];
  }

  loadChatbots() {
    console.log('Loading chatbots...');
    this.chatbotService.list().subscribe({
      next: (data) => {
        console.log('Chatbots raw data:', data);

        // Transform the data - handle both _id and id cases
        this.chatbots = data.map(bot => ({
          id: bot.id || (bot as any)._id, // Fallback to _id if id is undefined
          name: bot.name,
          user_id: bot.user_id,
          description: bot.description || '',
          avatarUrl: bot.avatarUrl,
        }));

        console.log('Processed chatbots:', this.chatbots);

        if (this.chatbots.length > 0) {
          this.selectedChatbotId = this.chatbots[0].id;
          console.log('Default selected chatbot ID:', this.selectedChatbotId);
          this.loadDocuments(this.selectedChatbotId);
        } else {
          console.warn('No chatbots found');
          this.errorMsg = 'Aucun chatbot disponible';
        }
      },
      error: (err) => {
        this.errorMsg = 'Erreur lors du chargement des chatbots.';
        console.error('Error loading chatbots:', err);
      }
    });
  }

  isDocumentWithSize(doc: AppDocument): doc is AppDocument & { size: number } {
    const hasSize = 'size' in doc && typeof doc.size === 'number';
    console.log(`Document ${doc.filename} has size:`, hasSize, hasSize ? doc.size : 'N/A');
    return hasSize;
  }

  getSafeDocumentSize(doc: AppDocument): number {
    const size = this.isDocumentWithSize(doc) ? doc.size : 0;
    console.log(`Getting size for ${doc.filename}:`, size);
    return size;
  }

  onChatbotChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedChatbotId = select.value;
    console.log('Chatbot selection changed, new ID:', this.selectedChatbotId);
    this.loadDocuments(this.selectedChatbotId);
  }

  loadDocuments(chatbotId: string) {
    if (!chatbotId) {
      console.warn('No chatbot ID provided, clearing documents list.');
      this.documents = [];
      return;
    }
    console.log(`Loading documents for chatbot ID: ${chatbotId}`);
    this.documentService.list(chatbotId).subscribe({
      next: (docs: AppDocument[]) => {
        console.log(`Documents received for chatbot ID ${chatbotId}:`, docs);

        this.documents = docs.map(d => {
          const newId = d.id || d._id || '';
          console.log(`Mapping document: filename=${d.filename}, original id=${d.id}, _id=${d._id}, assigned id=${newId}`);
          return {
            ...d,
            id: newId,
            _id: d._id || d.id || '',
          };
        });

        console.log('Documents after mapping:', this.documents);
        this.applyDateFilter();
        this.errorMsg = '';
      },
      error: (err) => {
        this.errorMsg = 'Erreur lors du chargement des documents.';
        console.error('Error loading documents:', err);
      }
    });
  }

  shortenId(id: string): string {
    if (!id) return '';
    return id.length > 8 
      ? `${id.substring(0, 4)}...${id.substring(id.length - 4)}` 
      : id;
  }

  // Nouvelle méthode pour ouvrir la modal de suppression
  openDeleteModal(documentId: string): void {
    if (!documentId) {
      console.error('No document ID provided for deletion');
      return;
    }
    
    this.documentToDelete = documentId;
    this.showDeleteModal = true;
  }

  // Méthode pour confirmer la suppression
  confirmDelete(): void {
    if (!this.documentToDelete || this.deleteInProgress) {
      return;
    }

    this.deleteInProgress = true;
    
    this.documentService.delete(this.documentToDelete).subscribe({
      next: () => {
        // Supprimer le document de la liste locale
        this.documents = this.documents.filter(doc => doc.id !== this.documentToDelete);
        
        // Rafraîchir la liste filtrée
        this.applyDateFilter();
        
        // Réinitialiser les états
        this.closeDeleteModal();
        this.deleteInProgress = false;
        
        console.log('Document deleted successfully');
        
        // Optionnel: Recharger les documents depuis le serveur pour être sûr
        // this.loadDocuments(this.selectedChatbotId);
      },
      error: (err) => {
        console.error('Error deleting document:', err);
        this.errorMsg = this.translate.instant('DOCUMENT.DELETE_ERROR');
        this.deleteInProgress = false;
        this.closeDeleteModal();
      }
    });
  }

  // Méthode pour annuler la suppression
  cancelDelete(): void {
    this.closeDeleteModal();
  }

  // Méthode pour fermer la modal
  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.documentToDelete = null;
    this.deleteInProgress = false;
  }

  applyDateFilter() {
    if (!this.filterDate) {
      this.filteredDocuments = [...this.documents];
      return;
    }
    
    const filterDateObj = new Date(this.filterDate);
    
    this.filteredDocuments = this.documents.filter(doc => {
      if (!doc.uploadDate) return false;
      
      // uploadDate peut être string ou Date
      const uploadDate = doc.uploadDate instanceof Date 
        ? doc.uploadDate 
        : new Date(doc.uploadDate);

      return (
        uploadDate.getFullYear() === filterDateObj.getFullYear() &&
        uploadDate.getMonth() === filterDateObj.getMonth() &&
        uploadDate.getDate() === filterDateObj.getDate()
      );
    });
  }

  clearDateFilter() {
    this.filterDate = null;
    this.filteredDocuments = [...this.documents];
  }
}