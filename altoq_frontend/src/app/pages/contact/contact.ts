import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

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
  subject: string = '';
  message: string = '';
  isSubmitting = false;
  isLoggedIn = false;

  constructor(
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.name = user.name || '';
        this.email = user.email || '';
        this.isLoggedIn = true;
      } else {
        this.isLoggedIn = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.name || !this.email || !this.subject || !this.message) {
      this.toastService.show('Por favor, completa todos los campos requeridos.', 'error');
      return;
    }

    this.isSubmitting = true;

    // Simulate sending (replace with real API call if needed)
    setTimeout(() => {
      this.toastService.show('¡Mensaje enviado! Te responderemos a la brevedad.', 'success');
      
      // Re-populate from auth service after clearing
      const user = this.authService.userValue;
      this.name = user ? (user.name || '') : '';
      this.email = user ? (user.email || '') : '';
      this.subject = '';
      this.message = '';
      this.isSubmitting = false;
    }, 1000);
  }
}

