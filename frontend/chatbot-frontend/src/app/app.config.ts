import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Activity, AlertCircle, AlertTriangle, ArrowRight, Bell, Bot, Building2, Calendar, Camera, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Cpu, Edit3, Eye, EyeOff, FileText, FolderArchive, Github, Globe, Headphones, HelpCircle, History, Home, Inbox, Info, LayoutDashboard, Link2, List, Loader2, Lock, LogOut, Mail, MessageCircle, MessageSquareText, Mic, Moon, MoreHorizontal, Pencil, Plus, PlusCircle, RefreshCw, RotateCcw, Search, Send, Settings, Shield, Sparkles, Square, Sun, Trash2, UploadCloud, User, UserCheck, UserPlus, Users, Volume2, X } from 'lucide-angular/src/icons';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideLottieOptions } from 'ngx-lottie';
import { ToastModule } from 'primeng/toast';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
     provideLottieOptions({  
      player: () => import('lottie-web'),
    }),
    importProvidersFrom(
      ToastModule,
      LucideAngularModule.pick({ 
        Trash2, Edit3, MessageCircle,List,Link2 ,Bot,Check, LogOut, Settings,Mic,RotateCcw,Volume2,Loader2,User,CheckCircle,Lock,Activity,ArrowRight,Search,AlertTriangle,Headphones,Building2,Home, FileText, History, Send, RefreshCw, Eye,Moon,Globe,Sun,Square,Users,Info,UserCheck,UploadCloud,Mail,Sparkles,PlusCircle,X,Pencil,
        EyeOff, MessageSquareText, FolderArchive,Plus, Cpu, LayoutDashboard,HelpCircle,Bell,UserPlus,Github,Shield,ChevronRight,Camera,AlertCircle,ChevronDown,Calendar,Clock,Inbox,MoreHorizontal
      }),
      TranslateModule.forRoot({
        defaultLanguage: 'fr',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};