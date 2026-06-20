import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://api-ymcsyccz5a-uc.a.run.app/api';
  // private baseUrl = 'http://localhost:3000/api';



  constructor(private http: HttpClient) { }

  createRegistration(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/registrations`, formData);
  }

  getInstagramFeed(): Observable<any> {
    return this.http.get(`${this.baseUrl}/instagram-feed`);
  }
}
