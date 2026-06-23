import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { Cart } from '../../models/cart';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent implements OnInit {
  cart: Cart = { items: [], totalPrice: 0 };

  // Step control: 1=shipping, 2=payment, 3=success
  step: number = 1;

  // ── Step 1: Shipping data ──────────────────────────
  recipientName: string = '';
  recipientEmail: string = '';
  recipientPhone: string = '';
  department: string = '';
  province: string = '';
  district: string = '';
  streetAddress: string = '';
  reference: string = '';
  onlyOwnerAccepted: boolean = false;

  // ── Step 2: Payment simulation ─────────────────────
  cardNumber: string = '';
  cardholderName: string = '';
  expiryDate: string = '';
  cvv: string = '';
  isCardFlipped: boolean = false;
  cardType: 'visa' | 'mastercard' | 'amex' | 'generic' = 'generic';
  rememberCard: boolean = false;
  hasSavedCard: boolean = false;

  // ── Processing states ──────────────────────────────
  processing: boolean = false;
  paymentPhase: string = '';
  paymentError: string = '';

  // ── Order result ───────────────────────────────────
  deliveryCode: string = '';
  orderId: number | null = null;
  totalPaid: number = 0;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private userService: UserService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
    });
  }

  ngOnInit(): void {
    // Pre-fill from logged-in user (reuses AuthService pattern from profile.ts)
    this.authService.user$.subscribe(user => {
      if (user) {
        this.recipientName = user.name || '';
        this.recipientEmail = user.email || '';
        this.recipientPhone = user.phone || '';
        
        // Load default address
        this.userService.getAddresses().subscribe({
          next: (addresses) => {
            if (addresses && addresses.length > 0) {
              const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
              this.department = defaultAddress.state || '';
              this.province = defaultAddress.state || '';
              this.district = defaultAddress.city || '';
              this.streetAddress = defaultAddress.street || '';
              this.reference = defaultAddress.name !== 'Dirección de envío' ? (defaultAddress.name || '') : '';
              if (defaultAddress.phone) {
                this.recipientPhone = defaultAddress.phone;
              }
            }
          },
          error: () => {} // Silently fail if no addresses
        });
      }
    });

    // Check for saved card in localStorage
    const savedCardRaw = localStorage.getItem('saved_card');
    if (savedCardRaw) {
      try {
        const savedCard = JSON.parse(savedCardRaw);
        if (savedCard && savedCard.number) {
          this.cardNumber = savedCard.number;
          this.cardholderName = savedCard.holder || '';
          this.expiryDate = savedCard.expiry || '';
          this.cvv = savedCard.cvv || '';
          this.rememberCard = true;
          this.hasSavedCard = true;
          
          // Detect card type
          const rawNum = this.cardNumber.replace(/\D/g, '');
          this.detectCardType(rawNum);
        }
      } catch (e) {
        console.error('Error loading saved card', e);
      }
    }
  }

  // ── Card formatting helpers ────────────────────────

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '').substring(0, 16);
    this.cardNumber = value.replace(/(.{4})/g, '$1 ').trim();
    input.value = this.cardNumber;
    this.detectCardType(value);
  }

  detectCardType(num: string): void {
    if (/^4/.test(num)) {
      this.cardType = 'visa';
    } else if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) {
      this.cardType = 'mastercard';
    } else if (/^3[47]/.test(num)) {
      this.cardType = 'amex';
    } else {
      this.cardType = 'generic';
    }
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '').substring(0, 4);
    if (value.length >= 3) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    this.expiryDate = value;
    input.value = value;
  }

  get cardNumberDisplay(): string {
    const raw = this.cardNumber.replace(/\s/g, '');
    if (!raw) return '•••• •••• •••• ••••';
    const padded = raw.padEnd(16, '•');
    return padded.replace(/(.{4})/g, '$1 ').trim();
  }

  get expiryDisplay(): string {
    return this.expiryDate || 'MM/YY';
  }

  get cardholderDisplay(): string {
    return this.cardholderName.toUpperCase() || 'NOMBRE DEL TITULAR';
  }

  // ── Navigation ─────────────────────────────────────

  goToPayment(): void {
    if (!this.recipientName || !this.recipientEmail || !this.recipientPhone) {
      this.paymentError = 'Por favor completa nombre, correo y teléfono.';
      return;
    }
    if (!this.department || !this.province || !this.district || !this.streetAddress) {
      this.paymentError = 'Por favor completa todos los campos de ubicación.';
      return;
    }
    if (!this.onlyOwnerAccepted) {
      this.paymentError = 'Debes aceptar que solo el titular puede recibir el pedido.';
      return;
    }
    this.paymentError = '';
    this.step = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToShipping(): void {
    this.step = 1;
    this.paymentError = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Payment simulation ─────────────────────────────

  simulatePay(): void {
    if (!this.cardholderName || !this.cardNumber || !this.expiryDate || !this.cvv) {
      this.paymentError = 'Por favor completa todos los datos de la tarjeta.';
      return;
    }

    if (this.cart.items.length === 0) {
      this.paymentError = 'Tu carrito está vacío.';
      return;
    }

    this.paymentError = '';
    this.processing = true;
    this.paymentPhase = 'Verificando datos de la tarjeta...';

    const user = this.authService.userValue;
    const shippingAddress = `${this.streetAddress}, ${this.district}, ${this.province}, ${this.department}${this.reference ? ' — Ref: ' + this.reference : ''}`;

    // Simulate payment phases with delays
    setTimeout(() => {
      this.paymentPhase = 'Procesando pago...';
      setTimeout(() => {
        this.paymentPhase = 'Confirmando con el banco...';
        setTimeout(() => {
          this.paymentPhase = '¡Pago aprobado!';

          // Save address if it's new
          if (user) {
            this.userService.getAddresses().subscribe({
              next: (addresses) => {
                const exists = addresses.find(a => a.street === this.streetAddress && a.city === this.district);
                if (!exists) {
                  this.userService.createAddress({
                    name: this.reference || 'Dirección de envío',
                    street: this.streetAddress,
                    city: this.district,
                    state: this.department,
                    country: 'Peru',
                    phone: this.recipientPhone,
                    is_default: addresses.length === 0 // Make default if it's the first one
                  }).subscribe();
                }
              }
            });
          }

          const order = {
            user_id: user?.id ?? 1,
            products: this.cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            })),
            total_amount: this.cart.totalPrice,
            status: 'pending' as const,
            shipping_address: shippingAddress,
            contact_phone: this.recipientPhone
          };

          this.orderService.createOrder(order).subscribe({
            next: (createdOrder) => {
              // Persist or clear card details based on user preference
              if (this.rememberCard) {
                localStorage.setItem('saved_card', JSON.stringify({
                  number: this.cardNumber,
                  holder: this.cardholderName,
                  expiry: this.expiryDate,
                  cvv: this.cvv
                }));
                this.hasSavedCard = true;
              } else {
                localStorage.removeItem('saved_card');
                this.hasSavedCard = false;
              }

              this.totalPaid = this.cart.totalPrice;
              this.cartService.clearCart();
              this.processing = false;
              this.deliveryCode = createdOrder.delivery_code ?? '';
              this.orderId = createdOrder.id ?? null;
              this.step = 3;
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            error: (err) => {
              console.error('Error al crear orden:', err);
              this.paymentError = 'Error al registrar la orden. El pago fue simulado pero intenta de nuevo.';
              this.processing = false;
              this.paymentPhase = '';
            }
          });
        }, 1500);
      }, 1500);
    }, 1500);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToOrders(): void {
    this.router.navigate(['/my-orders']);
  }

  copyCode(): void {
    if (this.deliveryCode) {
      navigator.clipboard.writeText(this.deliveryCode);
    }
  }

  clearSavedCard(): void {
    localStorage.removeItem('saved_card');
    this.cardNumber = '';
    this.cardholderName = '';
    this.expiryDate = '';
    this.cvv = '';
    this.rememberCard = false;
    this.hasSavedCard = false;
    this.cardType = 'generic';
    this.toastService.show('Tarjeta guardada eliminada correctamente.', 'success');
  }
}

