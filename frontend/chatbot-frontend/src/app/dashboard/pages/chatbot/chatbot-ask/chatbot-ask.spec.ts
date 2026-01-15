import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotAsk } from './chatbot-ask';

describe('ChatbotAsk', () => {
  let component: ChatbotAsk;
  let fixture: ComponentFixture<ChatbotAsk>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotAsk]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotAsk);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
