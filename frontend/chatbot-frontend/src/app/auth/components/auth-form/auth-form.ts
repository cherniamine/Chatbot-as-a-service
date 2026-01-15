import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-form',
   standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-form.html',
  styleUrl: './auth-form.scss'
})
export class AuthForm {
  @Input() form!: FormGroup;
  @Input() title: string = '';
  @Input() buttonText: string = '';
  
   @Output() submitForm = new EventEmitter<void>();

   onSubmit() {
    this.submitForm.emit();
  }
}
