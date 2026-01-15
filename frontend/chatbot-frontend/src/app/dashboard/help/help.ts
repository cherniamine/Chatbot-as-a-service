import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-help',
  imports: [TranslateModule,LucideAngularModule],
  templateUrl: './help.html',
  styleUrl: './help.scss'
})
export class Help {

}
