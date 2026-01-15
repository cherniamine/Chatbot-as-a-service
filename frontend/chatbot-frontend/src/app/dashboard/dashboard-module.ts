import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing-module';
import { Navbar } from './layout/navbar/navbar'; // standalone
import { Sidebar } from './layout/sidebar/sidebar'; // standalone
import { Layout } from './layout/layout/layout'; // standalone
import { History } from './pages/history/history'; // NOT standalone (assumed)

import { ChatbotCreate } from './pages/chatbot/chatbot-create/chatbot-create'; // NOT standalone
import { DocumentList } from './pages/document/document-list/document-list'; // NOT standalone
import { Home } from './pages/home/home'; // NOT standalone
import { ChatbotList } from './pages/chatbot/chatbot-list/chatbot-list'; // NOT standalone
import { DocumentUpload } from './pages/document/document-upload/document-upload'; // NOT standalone

import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatbotAsk } from './pages/chatbot/chatbot-ask/chatbot-ask';
import { Help } from './help/help';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,

      Home,
    ChatbotList,
    ChatbotCreate,
    ChatbotAsk,
    DocumentList,
    DocumentUpload,
    History,
    Navbar,
    Sidebar,
    Layout,
    Help
  ]
})
export class DashboardModule { }
