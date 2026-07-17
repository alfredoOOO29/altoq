import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar';
import { ToastComponent } from './components/toast/toast';
import { CartAddedModalComponent } from './components/cart-added-modal/cart-added-modal.component';
import { Footer } from './components/footer/footer';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterOutlet, 
    NavbarComponent, 
    ToastComponent, 
    CartAddedModalComponent, 
    Footer
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('altoq_frontend');
  protected readonly showNavbar = signal(true);

  // Global Chat Widget Signals (Ciclo 9)
  protected readonly isChatWidgetOpen = signal(false);
  protected readonly chats = signal<any[]>([]);
  protected readonly selectedChatId = signal<number | null>(null);
  protected readonly activeChatMessages = signal<any[]>([]);
  protected readonly messagesLoading = signal(false);
  protected readonly unreadChatsCount = signal(0);
  
  protected newDrawerMessage = '';
  private pollSubscription?: Subscription;

  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  constructor() {
    // Escuchar eventos de navegación para saber si ocultar la barra de usuario
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.showNavbar.set(!url.startsWith('/admin'));
    });
  }

  ngOnInit(): void {
    // Poll chats every 15 seconds if authenticated
    this.pollChats();
    this.pollSubscription = new Subscription();
    const interval = setInterval(() => {
      this.pollChats();
    }, 15000);
    this.pollSubscription.add(() => clearInterval(interval));
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  toggleChatWidget(): void {
    const isNowOpen = !this.isChatWidgetOpen();
    this.isChatWidgetOpen.set(isNowOpen);
    if (isNowOpen) {
      this.pollChats();
    } else {
      this.selectedChatId.set(null);
    }
  }

  pollChats(): void {
    if (!this.authService.isAuthenticated()) {
      this.unreadChatsCount.set(0);
      this.chats.set([]);
      return;
    }

    this.chatService.getMyChats().subscribe({
      next: (myChats) => {
        // En el widget del comprador, mostramos solo los chats donde somos el comprador
        // (y ocultamos los del vendedor que ya se ven en el Seller Area)
        const currentUser = this.authService.userValue;
        if (!currentUser) return;

        const buyerChats = myChats.filter(c => c.buyer_id === currentUser.id);
        this.chats.set(buyerChats);

        // Contar chats con mensajes no leídos del otro usuario
        let unreadCount = 0;
        buyerChats.forEach(chat => {
          this.chatService.getChatMessages(chat.id).subscribe({
            next: (messages) => {
              const hasUnread = messages.some(m => !m.is_read && m.sender_id !== currentUser.id);
              chat.hasUnread = hasUnread;
              if (hasUnread) {
                unreadCount++;
                this.unreadChatsCount.set(unreadCount);
              }
            }
          });
        });
        if (buyerChats.length === 0 || unreadCount === 0) {
          this.unreadChatsCount.set(0);
        }
      },
      error: (err) => {
        console.error('Error polling chats:', err);
      }
    });
  }

  selectChat(chatId: number): void {
    this.selectedChatId.set(chatId);
    this.loadActiveChatMessages(chatId);
  }

  deselectChat(): void {
    this.selectedChatId.set(null);
    this.activeChatMessages.set([]);
    this.pollChats(); // Actualizar contador al cerrar chat individual
  }

  loadActiveChatMessages(chatId: number): void {
    this.messagesLoading.set(true);
    this.chatService.getChatMessages(chatId).subscribe({
      next: (messages) => {
        this.activeChatMessages.set(messages);
        this.messagesLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error loading drawer messages:', err);
        this.messagesLoading.set(false);
      }
    });
  }

  sendDrawerMessage(): void {
    const chatId = this.selectedChatId();
    if (!chatId || !this.newDrawerMessage.trim()) return;

    const content = this.newDrawerMessage;
    this.newDrawerMessage = '';

    // Optimistic addition
    const currentUser = this.authService.userValue;
    if (!currentUser) return;

    const optimisticMsg = {
      id: Date.now(),
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content,
      is_read: false,
      created_at: new Date()
    };
    this.activeChatMessages.update(msgs => [...msgs, optimisticMsg]);
    this.scrollToBottom();

    this.chatService.sendMessage(chatId, content).subscribe({
      next: (msg) => {
        // Reemplazar mensaje optimista con el real
        this.activeChatMessages.update(msgs => msgs.map(m => m.id === optimisticMsg.id ? msg : m));
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error sending message:', err);
        // Quitar mensaje optimista
        this.activeChatMessages.update(msgs => msgs.filter(m => m.id !== optimisticMsg.id));
        const errMsg = err.error?.detail || 'No se pudo enviar el mensaje.';
        this.toastService.show(errMsg, 'error');
      }
    });
  }

  isMyMessage(msg: any): boolean {
    return msg.sender_id === this.authService.userValue?.id;
  }

  hasUnreadMessages(chat: any): boolean {
    return !!chat.hasUnread;
  }

  getActiveChatSellerName(): string {
    const chat = this.chats().find(c => c.id === this.selectedChatId());
    return chat ? (chat.seller_name || 'Tienda') : 'Chat';
  }

  formatTime(dateString: any): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.getElementById('drawerChatMessages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}
