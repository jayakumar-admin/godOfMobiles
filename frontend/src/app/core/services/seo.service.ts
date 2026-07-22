import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);

  private readonly baseUrl = 'https://godofmobiles.com';

  private defaultSeo: SeoConfig = {
    title: 'GOD OF MOBIL - Lost Mobile Recovery & Tracking Service',
    description: 'GOD OF MOBIL offers reliable lost phone recovery, IMEI blocklisting guidance via CEIR, and legal tracking support to recover lost or stolen mobile devices.',
    keywords: 'lost mobile recovery, find stolen phone, IMEI tracking, CEIR blocklist, phone recovery service, GOD OF MOBIL',
    ogImage: 'https://godofmobiles.com/images/logo.png',
    ogUrl: 'https://godofmobiles.com/'
  };

  private routeSeoMap: { [key: string]: SeoConfig } = {
    '/': {
      title: 'GOD OF MOBIL - Lost Mobile Recovery & Tracking Service',
      description: 'Recover your lost or stolen smartphone fast with GOD OF MOBIL. Secure IMEI blocklisting, CEIR support, and dedicated recovery guidance.',
      keywords: 'lost phone recovery, stolen mobile tracking, IMEI blocklist, GOD OF MOBIL home',
      ogUrl: 'https://godofmobiles.com/'
    },
    '/register': {
      title: 'Register Lost Mobile Case | GOD OF MOBIL',
      description: 'Submit details of your lost or stolen phone for instant tracking assistance, legal reporting guidance, and mobile recovery support.',
      keywords: 'register lost mobile, report stolen phone, IMEI submission, GOD OF MOBIL register',
      ogUrl: 'https://godofmobiles.com/register'
    },
    '/success': {
      title: 'Case Registration Successful | GOD OF MOBIL',
      description: 'Your lost phone case has been successfully submitted. Our team is working on your tracking and recovery guidance.',
      keywords: 'lost mobile case confirmation, GOD OF MOBIL success',
      ogUrl: 'https://godofmobiles.com/success'
    },
    '/admin/login': {
      title: 'Admin Portal Login | GOD OF MOBIL',
      description: 'Secure admin portal access for GOD OF MOBIL recovery managers.',
      keywords: 'god of mobil admin login',
      ogUrl: 'https://godofmobiles.com/admin/login'
    }
  };

  initSeoListener(): void {
    this.updateSeoForUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateSeoForUrl(event.urlAfterRedirects || event.url);
      });
  }

  updateSeoForUrl(url: string): void {
    const cleanUrl = url.split('?')[0];
    const config = this.routeSeoMap[cleanUrl] || this.defaultSeo;
    this.setSeo(config);
  }

  setSeo(config: Partial<SeoConfig>): void {
    const seo = { ...this.defaultSeo, ...config };

    this.titleService.setTitle(seo.title);

    this.metaService.updateTag({ name: 'description', content: seo.description });
    if (seo.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: seo.keywords });
    }

    this.metaService.updateTag({ property: 'og:title', content: seo.title });
    this.metaService.updateTag({ property: 'og:description', content: seo.description });
    this.metaService.updateTag({ property: 'og:url', content: seo.ogUrl || this.baseUrl });
    if (seo.ogImage) {
      this.metaService.updateTag({ property: 'og:image', content: seo.ogImage });
    }

    this.metaService.updateTag({ name: 'twitter:title', content: seo.title });
    this.metaService.updateTag({ name: 'twitter:description', content: seo.description });
    if (seo.ogImage) {
      this.metaService.updateTag({ name: 'twitter:image', content: seo.ogImage });
    }
  }
}
