import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { ApiService } from '../../core/services/api.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;
  serverErrors: Record<string, string> = {};
  serverMessage = '';

  // Brand Options
  brands = [
    'Samsung', 'Apple', 'Vivo', 'Oppo', 'Redmi', 
    'Realme', 'Nokia', 'Motorola', 'OnePlus', 
    'Google Pixel', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    public ts: TranslationService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    const mobilePattern = /^[6-9]\d{9}$/;
    const imeiPattern = /^\d{15}$/;

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      mobile_number: ['', [Validators.required, Validators.pattern(mobilePattern)]],
      alternative_mobile_number: ['', [Validators.pattern(mobilePattern)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      imei_1: ['', [Validators.required, Validators.pattern(imeiPattern)]],
      imei_2: ['', [Validators.pattern(imeiPattern)]],
      mobile_brand: ['', [Validators.required]],
      mobile_model: ['', [Validators.required, Validators.maxLength(150)]],
      missing_date: ['', [Validators.required]],
      missing_location: ['', [Validators.required]],
      police_complaint_no: ['', [Validators.maxLength(100)]],
      incident_description: [''],
      consent: [false, [Validators.requiredTrue]]
    });
  }

  onSubmit() {
    this.serverErrors = {};
    this.serverMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    
    // Append standard fields
    Object.keys(this.registerForm.value).forEach(key => {
      if (key !== 'consent') {
        formData.append(key, this.registerForm.value[key]);
      }
    });

    formData.append('consent', 'true');

    this.isSubmitting = true;
    
    this.api.createRegistration(formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.router.navigate(['/success']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Registration failed:', err);
        if (err.error && err.error.errors) {
          this.serverErrors = err.error.errors;
        } else {
          this.serverMessage = err.error?.message || 'Failed to submit registration. Please try again.';
        }
      }
    });
  }

  // Helper getters for validation errors
  isInvalid(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
