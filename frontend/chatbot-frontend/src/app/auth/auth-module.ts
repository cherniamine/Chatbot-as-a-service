import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { VerifyEmail } from './pages/verification/verify-email/verify-email';
import { ResetPasswordComponent } from './pages/reset-password/reset-password';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AuthRoutingModule,
       FormsModule,
    ReactiveFormsModule,
     Login,
    Register,
    VerifyEmail,
    ResetPasswordComponent,
    ForgotPasswordComponent

  ]
})
export class AuthModule { }
