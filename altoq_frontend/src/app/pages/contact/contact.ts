import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { StoreService, PublicStore } from '../../services/store.service';
import { InquiryService } from '../../services/inquiry.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.css'],
})
export class ContactComponent implements OnInit {
  name: string = '';
  email: string = '';
  phone: string = '';
  message: string = '';
  selectedStoreId: number | null = null;
  stores: PublicStore[] = [];
  isSubmitting = false;

  constructor(
    private toastService: ToastService,
    private storeService: StoreService,
    private inquiryService: InquiryService
  ) {}

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.storeService.getPublicStores().subscribe({
      next: (stores) => (this.stores = stores),
      error: (err) => console.error('Error loading stores:', err),
    });
  }

  onSubmit(): void {
    if (!this.name || !this.email || !this.message || !this.selectedStoreId) {
      this.toastService.show(
        'Por favor, completa todos los campos requeridos.',
        'error'
      );
      return;
    }

    this.isSubmitting = true;

    this.inquiryService
      .submitInquiry({
        store_id: Number(this.selectedStoreId),
        name: this.name,
        email: this.email,
        phone: this.phone || undefined,
        message: this.message,
      })
      .subscribe({
        next: () => {
          this.toastService.show(
            '✅ ¡Consulta enviada! El vendedor la verá en su panel de Mensajes / Consultas.',
            'success'
          );
          this.name = '';
          this.email = '';
          this.phone = '';
          this.message = '';
          this.selectedStoreId = null;
          this.isSubmitting = false;
        },
        error: (err) => {
          console.error('Error sending inquiry:', err);
          this.toastService.show(
            'No se pudo enviar la consulta. Intenta de nuevo.',
            'error'
          );
          this.isSubmitting = false;
        },
      });
  }
}
