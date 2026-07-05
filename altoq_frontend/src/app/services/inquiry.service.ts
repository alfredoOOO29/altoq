import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface StoreInquiry {
  id: number;
  store_id: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  // Virtual fields added on frontend to unify display with chats
  type: 'inquiry';
}

export interface InquiryCreate {
  store_id: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class InquiryService {
  private apiUrl = `${environment.apiUrl}/inquiry`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Public — any visitor can submit a contact inquiry. No auth needed. */
  submitInquiry(data: InquiryCreate): Observable<StoreInquiry> {
    return this.http.post<StoreInquiry>(this.apiUrl, data);
  }

  /** Authenticated seller — get all inquiries for their store. */
  getMyStoreInquiries(): Observable<StoreInquiry[]> {
    return this.http.get<StoreInquiry[]>(`${this.apiUrl}/my-store`, {
      headers: this.getHeaders(),
    });
  }

  /** Mark a single inquiry as read. */
  markRead(inquiryId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${inquiryId}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
