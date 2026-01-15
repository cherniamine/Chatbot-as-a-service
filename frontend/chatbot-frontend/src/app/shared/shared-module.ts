import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Loader } from './components/loader/loader';
import { Modal } from './components/modal/modal';
import { Toast } from './components/toast/toast';
import { TruncatePipe } from './pipes/truncate-pipe';
import { RenameModal } from './components/rename-modal/rename-modal';
import { DeleteModal } from './components/delete-modal/delete-modal';

@NgModule({
  imports: [
    CommonModule,
    Loader,
    Modal,
    Toast,
    TruncatePipe,
    RenameModal,DeleteModal
    
  ],
  exports: [
    Loader,
    Modal,
    Toast,
    TruncatePipe,RenameModal,DeleteModal
  ]
})
export class SharedModule {}
