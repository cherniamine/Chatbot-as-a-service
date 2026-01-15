import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss'],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
})
export class Toast implements OnInit {
  @Input() message = '';
  @Input() duration = 4000;
  @Output() animationDone = new EventEmitter<void>();

  isVisible = true;
  private timeoutId: any;

  ngOnInit() {
    this.timeoutId = setTimeout(() => this.close(), this.duration);
  }

  close() {
    clearTimeout(this.timeoutId);
    this.isVisible = false;  // déclenche la transition ':leave'
  }

  onAnimationDone(event: any) {
    if (event.toState === 'void') {
      // L'animation de sortie est terminée, on émet pour que le parent supprime le toast
      this.animationDone.emit();
    }
  }
}
