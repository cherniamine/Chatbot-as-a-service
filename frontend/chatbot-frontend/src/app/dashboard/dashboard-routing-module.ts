import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentUpload } from './pages/document/document-upload/document-upload';
import { ChatbotList } from './pages/chatbot/chatbot-list/chatbot-list';
import { ChatbotCreate } from './pages/chatbot/chatbot-create/chatbot-create';
import { DocumentList } from './pages/document/document-list/document-list';
import { Home } from './pages/home/home';
import { Layout } from './layout/layout/layout';
import { History } from './pages/history/history';
import { ChatbotAsk } from './pages/chatbot/chatbot-ask/chatbot-ask';
import { AuthGuard } from '../core/guards/auth.guard';
import { Help } from './help/help';
import { RoleGuard } from '../core/guards/role-guard';
import { RedirectGuard } from '../core/guards/redirect-guard';
import { UserList } from './pages/user/user-list/user-list';
import { Profile } from './pages/profile/profile/profile';


const routes: Routes = [
  {
    path: '',
    component: Layout,
    canActivate: [AuthGuard],
    children: [
      // ✅ Redirection dynamique initiale
     { path: '', redirectTo: '', pathMatch: 'full', canActivate: [RedirectGuard] },


      // ✅ Accès Admin uniquement
      { path: 'home', component: Home, canActivate: [RoleGuard], data: { expectedRoles: ['admin'] } },
      { path: 'chatbots/create', component: ChatbotCreate, canActivate: [RoleGuard], data: { expectedRoles: ['admin'] } },
      { path: 'documents', component: DocumentList, canActivate: [RoleGuard], data: { expectedRoles: ['admin'] } },
      { path: 'documents/upload', component: DocumentUpload, canActivate: [RoleGuard], data: { expectedRoles: ['admin'] } },
      {  path: 'users',  component: UserList, canActivate: [RoleGuard], data: { expectedRoles: ['admin'] } },

      // ✅ Accès User uniquement
      { path: 'chatbots/:chatbotId/ask', component: ChatbotAsk, canActivate: [RoleGuard], data: { expectedRoles: ['user'] } },
      { path: 'history', component: History, canActivate: [RoleGuard], data: { expectedRoles: ['user'] } },
      

      // ✅ Accès tous les connectés (user + admin)
      { path: 'chatbots', component: ChatbotList },
      { path: 'profile', component: Profile },
      { path: 'help', component: Help }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
