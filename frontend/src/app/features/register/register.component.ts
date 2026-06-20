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
  maxDate = '';

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
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.maxDate = `${yyyy}-${mm}-${dd}`;

    this.initForm();
  }

  futureDateValidator = (control: any) => {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate > today ? { futureDate: true } : null;
  };

  initForm() {
    const mobilePattern = /^[6-9]\d{9}$/;
    const imeiPattern = /^\d{15}$/;

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      mobile_number: ['', [Validators.required, Validators.pattern(mobilePattern)]],
      alternative_mobile_number: ['', [Validators.pattern(mobilePattern)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      instagram_id: ['', [Validators.required]],
      imei_1: ['', [Validators.required, Validators.pattern(imeiPattern)]],
      imei_2: ['', [Validators.pattern(imeiPattern)]],
      mobile_brand: ['', [Validators.required]],
      missing_date: ['', [Validators.required, this.futureDateValidator]],
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
