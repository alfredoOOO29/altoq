import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order';
import { ChatService } from '../../services/chat.service';
import { ToastService } from '../../services/toast.service';
import { User } from '../../models/auth';
import { Order } from '../../models/order';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent implements OnInit {
  user: User | null = null;
  orders: Order[] = [];

  ordersLoading = false;
  ordersError = '';

  // Order filtering and pagination
  ordersFilter: 'all' | 'pending' | 'completed' | 'canceled' = 'all';
  ordersPage = 1;
  ordersPageSize = 5;

  // Support Chat logic
  openChatOrderId: number | null = null;
  chatMessages: any[] = [];
  chatId: number | null = null;
  newChatMessage: string = '';
  chatLoading = false;
  chatError = '';

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private chatService: ChatService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.user = user;
      }
    });
    this.loadOrders();
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.ordersError = '';
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.ordersLoading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.ordersError = 'No se pudieron cargar tus pedidos. Intenta de nuevo.';
        this.ordersLoading = false;
      }
    });
  }

  // ===== FILTERING & PAGINATION =====

  getFilteredOrders(): Order[] {
    if (this.ordersFilter === 'all') {
      return this.orders;
    } else if (this.ordersFilter === 'pending') {
      return this.orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    } else if (this.ordersFilter === 'completed') {
      return this.orders.filter(o => o.status === 'completed');
    } else if (this.ordersFilter === 'canceled') {
      return this.orders.filter(o => o.status === 'canceled');
    }
    return this.orders;
  }

  getPaginatedOrders(): Order[] {
    const filtered = this.getFilteredOrders();
    const startIndex = (this.ordersPage - 1) * this.ordersPageSize;
    return filtered.slice(startIndex, startIndex + this.ordersPageSize);
  }

  getOrdersTotalPages(): number {
    const count = this.getFilteredOrders().length;
    return Math.ceil(count / this.ordersPageSize) || 1;
  }

  setOrdersFilter(filter: 'all' | 'pending' | 'completed' | 'canceled'): void {
    this.ordersFilter = filter;
    this.ordersPage = 1;
    this.openChatOrderId = null; // Close open chats when switching tabs
  }

  nextOrdersPage(): void {
    if (this.ordersPage < this.getOrdersTotalPages()) {
      this.ordersPage++;
    }
  }

  prevOrdersPage(): void {
    if (this.ordersPage > 1) {
      this.ordersPage--;
    }
  }

  getOrderCountByStatus(status: 'pending' | 'completed' | 'canceled'): number {
    if (status === 'pending') {
      return this.orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    }
    return this.orders.filter(o => o.status === status).length;
  }

  // ===== UTILS =====

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmado',
      'completed': 'Completado',
      'canceled': 'Cancelado'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'canceled': 'bg-red-100 text-red-800'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  getProductCount(order: Order): number {
    return (order.products || []).reduce((sum, p: any) => sum + (p.quantity || 1), 0);
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    this.toastService.show('Código copiado al portapapeles', 'success');
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ===== SUPPORT CHAT =====

  openOrderChat(order: Order): void {
    if (this.openChatOrderId === order.id) {
      this.openChatOrderId = null;
      return;
    }

    const products: any[] = order.products || [];
    if (!products.length) return;

    const firstProduct = products[0];
    const productId = firstProduct.productId;

    this.openChatOrderId = order.id!;
    this.chatLoading = true;
    this.chatError = '';
    this.chatMessages = [];
    this.chatId = null;

    this.chatService.startChatForOrder(order.id!, productId).subscribe({
      next: (chat: any) => {
        this.chatId = chat.id;
        this.loadChatMessages(chat.id);
      },
      error: (err: any) => {
        console.error('Error starting order chat:', err);
        this.chatError = 'No se pudo iniciar el chat. El vendedor debe tener una tienda activa.';
        this.chatLoading = false;
      }
    });
  }

  loadChatMessages(chatId: number): void {
    this.chatService.getChatMessages(chatId).subscribe({
      next: (messages) => {
        this.chatMessages = messages;
        this.chatLoading = false;
        // Auto scroll chat to bottom
        setTimeout(() => {
          const chatEl = document.getElementById('orderChatMessages');
          if (chatEl) {
            chatEl.scrollTop = chatEl.scrollHeight;
          }
        }, 100);
      },
      error: (err) => {
        console.error('Error loading chat messages:', err);
        this.chatLoading = false;
      }
    });
  }

  sendChatMessage(): void {
    if (!this.newChatMessage.trim() || !this.chatId) return;

    const content = this.newChatMessage;
    this.newChatMessage = '';

    this.chatService.sendMessage(this.chatId, content).subscribe({
      next: (msg) => {
        this.chatMessages.push(msg);
        setTimeout(() => {
          const chatEl = document.getElementById('orderChatMessages');
          if (chatEl) {
            chatEl.scrollTop = chatEl.scrollHeight;
          }
        }, 50);
      },
      error: (err) => {
        console.error('Error sending chat message:', err);
        this.newChatMessage = content; // restore if failed
      }
    });
  }

  isMyMessage(message: any): boolean {
    return Number(message.sender_id) === Number(this.user?.id);
  }
}
