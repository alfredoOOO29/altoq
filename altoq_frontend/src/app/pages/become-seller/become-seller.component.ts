import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { StoreAssistantComponent } from '../../components/store-assistant/store-assistant.component';
import { 
  ShoppingBag, 
  TrendingUp, 
  Headphones, 
  Store, 
  Mail, 
  Phone, 
  User, 
  FileText,
  X,
  Check
} from 'lucide-angular';

@Component({
  selector: 'app-become-seller',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreAssistantComponent, ShoppingBag, TrendingUp, Headphones, Store, Mail, Phone, User, FileText, X, Check],
  templateUrl: './become-seller.component.html',
  styleUrls: ['./become-seller.component.css']
})
export class BecomeSellerComponent {
  useChatMode: boolean = false;
  storeData = {
    name: '',
    email: '',
    owner_name: '',
    phone: '',
    description: '',
    ruc: ''
  };
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private sellerService: SellerService,
    private router: Router,
    private authService: AuthService
  ) {}

  toggleMode(): void {
    this.useChatMode = !this.useChatMode;
  }

  onSubmit(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.sellerService.becomeSeller(this.storeData).subscribe({
      next: (response) => {
        this.successMessage = '¡Tienda creada exitosamente! Ahora eres vendedor.';
        this.isLoading = false;
        
        // Refresh current user from backend to get updated role
        this.authService.refreshCurrentUser().subscribe({
          next: (updatedUser) => {
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 2000);
          },
          error: () => {
            // Fallback: update user role locally if refresh fails
            const currentUser = this.authService.userValue;
            if (currentUser) {
              const updatedUser = { ...currentUser, role: 'BOTH' as const };
              this.authService.updateUser(updatedUser);
            }
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 2000);
          }
        });
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Error al crear la tienda. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/profile']);
  }
}
