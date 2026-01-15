import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameModal } from './rename-modal';

describe('RenameModal', () => {
  let component: RenameModal;
  let fixture: ComponentFixture<RenameModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenameModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RenameModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
