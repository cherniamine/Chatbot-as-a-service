import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-rename-modal',
 standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,TranslateModule],
  templateUrl: './rename-modal.html',
  styleUrl: './rename-modal.scss'
})
export class RenameModal {

 @Input() currentName = '';
  @Output() renamed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  newName = '';

  ngOnInit() {
    this.newName = this.currentName;
  }

  confirmRename() {
    if (this.newName.trim()) {
      this.renamed.emit(this.newName.trim());
    }
  }

  cancel() {
    this.cancelled.emit();
  }
}
