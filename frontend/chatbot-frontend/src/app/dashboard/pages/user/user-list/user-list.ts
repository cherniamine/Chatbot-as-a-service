import { Component, OnInit } from '@angular/core';
import { User, UserService } from '../../../services/user';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../../shared/components/toast/toast';

@Component({
  selector: 'app-user-list',
  imports: [
    TranslateModule,
    CommonModule,
    LucideAngularModule,
    FormsModule,
    Toast,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  users: User[] = [];
  loading = false;
  error: string | null = null;

  showModal = false;
  showDeleteConfirm = false;

  selectedUser: User | null = null;
  userToDelete: User | null = null;

  form: any = {
    name: '',
    email: '',
    password: '',
    role: 'user',
  };
  showToast: any;
  toastMessage: any;
  toastDuration: any;
  type: any;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getSupervisedUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading users';
        this.loading = false;
      },
    });
  }

  openAddModal() {
    this.form = { name: '', email: '', password: '', role: 'user' };
    this.selectedUser = null;
    this.showModal = true;
  }

  openEditModal(user: User) {
    this.form = { name: user.name, email: user.email, role: user.role };
    this.selectedUser = user;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  submitForm() {
    if (this.selectedUser) {
      this.userService
        .updateUser(this.selectedUser.id, this.form)
        .subscribe(() => {
          this.type = 'success';
          this.toastDuration = 5000;
          this.toastMessage = 'User updated successfully';
          this.showToast = true;
          this.loadUsers();
          this.closeModal();
        });
    } else {
      const adminId = this.authService.getUserId();
      this.userService
        .createUser({ ...this.form, admin_id: adminId })
        .subscribe(() => {
          this.type = 'success';
          this.toastDuration = 5000;
          this.toastMessage = 'User added successfully';
          this.showToast = true;
          this.loadUsers();
          this.closeModal();
        });
    }
  }

  confirmDelete(user: User) {
    this.userToDelete = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.userToDelete = null;
    this.showDeleteConfirm = false;
  }

  deleteUser() {
    if (this.userToDelete) {
      this.userService.deleteUser(this.userToDelete.id).subscribe(() => {
        this.loadUsers();
        this.type = 'success';
        this.toastDuration = 5000;
        this.toastMessage = 'User deleted successfully';
        this.showToast = true;
        this.showDeleteConfirm = false;
      });
    }
  }
}