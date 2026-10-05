import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = `${environment.apiUrl}/admin`;
  token = signal<string | null>(localStorage.getItem('admin_token'));

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, credentials).pipe(
      tap(res => {
        if (res && res.success && res.token) {
          localStorage.setItem('admin_token', res.token);
          this.token.set(res.token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    this.token.set(null);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  getRegistrations(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/registrations`, { params });
  }

  getRegistrationById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/registrations/${id}`);
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/registrations/${id}`, { status });
  }

  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-stats`);
  }

  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings`);
  }

  updateSetting(key: string, value: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings`, { key, value });
  }

  exportExcel(filters: any = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/export/excel`, {
      params,
      responseType: 'blob'
    });
  }

  exportCSV(filters: any = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/export/csv`, {
      params,
      responseType: 'blob'
    });
  }

  // --- DATABASE BACKUP & DISASTER RECOVERY METHODS ---
  getBackups(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.type && filters.type !== 'ALL') params = params.set('type', filters.type);
    return this.http.get(`${this.baseUrl}/backups`, { params });
  }

  createBackupNow(): Observable<any> {
    return this.http.post(`${this.baseUrl}/backups/now`, {});
  }

  uploadBackupZip(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('backup_zip', file, file.name);
    return this.http.post(`${this.baseUrl}/backups/upload`, formData);
  }

  restoreBackup(id: string, password?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/backups/${id}/restore`, { password });
  }

  downloadBackup(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/backups/${id}/download`, { responseType: 'blob' });
  }

  deleteBackup(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/backups/${id}`);
  }

  getBackupHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/backups/health`);
  }
}

