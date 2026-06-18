import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './success.component.html',
  styleUrl: './success.component.css'
})
export class SuccessComponent {
  constructor(public ts: TranslationService) {}
}
