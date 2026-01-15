// src/app/models/document.model.ts
export interface DocumentUpload {
  filename: string;
  content: string;
}

export interface AppDocument  {
  id?: string;             
  _id?: string; 
  filename: string;
  chatbot_id: string;
  chunks: string[];
  embedding_id?: string;
   uploadDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string; 
  size?: number; 
}
