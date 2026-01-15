import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotList } from './chatbot-list';

describe('ChatbotList', () => {
  let component: ChatbotList;
  let fixture: ComponentFixture<ChatbotList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
