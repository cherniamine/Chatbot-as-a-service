import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotCreate } from './chatbot-create';

describe('ChatbotCreate', () => {
  let component: ChatbotCreate;
  let fixture: ComponentFixture<ChatbotCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
