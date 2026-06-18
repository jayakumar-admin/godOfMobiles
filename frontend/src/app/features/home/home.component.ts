import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService, Lang } from '../../core/services/translation.service';
import { ApiService } from '../../core/services/api.service';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  instagramPosts: any[] = [];
  instagramUsername = 'godofmobiles';

  // Stats Counters
  registeredCases = signal(0);
  recoveredDevices = signal(0);
  happyCustomers = signal(0);
  successRate = signal(0);

  // Testimonials Carousel
  activeReviewIndex = signal(0);
  reviews = [
    { stars: 5, text: 'Excellent service and support throughout the process. They guided me on every step after losing my phone and successfully helped track my Vivo device within weeks!', author: 'Ramesh K., Chennai / சென்னை' },
    { stars: 5, text: 'அருமையான சேவை! மாற்று எண் மற்றும் விவரங்களை முறையாகப் பெற்று, தொலைந்து போன என் சாம்சங் மொபைலை மிக விரைவில் மீட்டுத் தந்தனர். மிக்க நன்றி!', author: 'Priyanka M., Coimbatore / கோவை' },
    { stars: 5, text: 'They guide you on legal blocklisting (CEIR) and coordinates tracking. High degree of trust and secure information handling. Highly recommended!', author: 'Senthil N., Madurai / மதுரை' }
  ];
  private carouselSub?: Subscription;

  constructor(
    public ts: TranslationService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.fetchInstagramFeed();
    this.animateCounters();
    
    // Auto rotate testimonials every 6 seconds
    this.carouselSub = interval(6000).subscribe(() => {
      this.nextReview();
    });
  }

  ngOnDestroy() {
    this.carouselSub?.unsubscribe();
  }

  fetchInstagramFeed() {
    this.api.getInstagramFeed().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.instagramPosts = res.posts;
          this.instagramUsername = res.username;
        }
      },
      error: (err) => {
        console.error('Error fetching Instagram feed:', err);
      }
    });
  }

  setLanguage(lang: Lang) {
    this.ts.setLanguage(lang);
  }

  nextReview() {
    this.activeReviewIndex.update(idx => (idx + 1) % this.reviews.length);
  }

  prevReview() {
    this.activeReviewIndex.update(idx => (idx - 1 + this.reviews.length) % this.reviews.length);
  }

  animateCounters() {
    const duration = 2500; // 2.5 seconds duration
    const steps = 60;
    const stepTime = duration / steps;
    
    const targets = {
      registered: 18450,
      recovered: 16120,
      happy: 17890,
      rate: 98
    };

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      
      this.registeredCases.set(Math.floor((targets.registered / steps) * currentStep));
      this.recoveredDevices.set(Math.floor((targets.recovered / steps) * currentStep));
      this.happyCustomers.set(Math.floor((targets.happy / steps) * currentStep));
      this.successRate.set(Math.floor((targets.rate / steps) * currentStep));

      if (currentStep >= steps) {
        this.registeredCases.set(targets.registered);
        this.recoveredDevices.set(targets.recovered);
        this.happyCustomers.set(targets.happy);
        this.successRate.set(targets.rate);
        clearInterval(timer);
      }
    }, stepTime);
  }
}
