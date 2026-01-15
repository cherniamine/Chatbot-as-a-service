import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { DashboardModule } from './dashboard/dashboard-module';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,FormsModule,DashboardModule,HttpClientModule,CoreModule,LucideAngularModule,TranslateModule ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})  
export class App {
  protected title = 'chatbot-frontend';
  constructor(private translate: TranslateService) {
    const lang = localStorage.getItem('preferredLanguage') || 'fr';
    this.translate.setDefaultLang('fr');
    this.translate.use(lang);
  }
}
