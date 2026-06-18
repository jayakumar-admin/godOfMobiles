import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit() {
    // Direct path to dashboard if credentials are active
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
    this.initForm();
  }

  initForm() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.adminService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Authentication failed. Please verify credentials.';
        console.error('Admin login error:', err);
      }
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
