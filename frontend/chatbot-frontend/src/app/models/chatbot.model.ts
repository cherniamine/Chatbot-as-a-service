export interface ChatbotCreate {
  name: string;
  description: string;  
}

export interface Chatbot {
  id: string;          
  name: string;
  description: string;  
  user_id: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface ChatbotUpdate {
  name?: string;          
  description?: string;   
}

export interface AskInput {
  chatbot_id: string;
  question: string;
  language?: 'fr' | 'en' | 'ar';
}

export interface AskResponse {
  answer: string;
  summary: string;
  sources: string[];
  time_to_respond?: number;   
  audio_url?: string;
}

export interface AskResponseMultiLang {
  question: string;
  answer_fr: string;
  answer_en: string;
  answer_ar: string;
  summary_fr: string;
  summary_en: string;
  summary_ar: string;
  sources: string[];
  time_to_respond: number;
  audio_url?: string;
  context?: string;
}

export interface Message {
  chatbot_id: string;
  question: string;
  answer: string;
  summary?: string;
  sources: string[];
  timestamp?: string;        
  audioUrl?: string;
}

export interface UserStats {
  activeBots: number;
  uploadedDocuments: number;
  monthlyInteractions: number;
}