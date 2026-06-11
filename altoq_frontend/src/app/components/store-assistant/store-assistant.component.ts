import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerService } from '../../services/seller.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-store-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './store-assistant.component.html',
  styleUrls: ['./store-assistant.component.css']
})
export class StoreAssistantComponent implements OnInit {
  messages: { sender: string; content: string }[] = [];
  currentQuestion: string = '';
  userInput: string = '';
  storeData: any = {};
  isTyping: boolean = false;
  isCreatingStore: boolean = false;
  storeCreated: boolean = false;

  constructor(
    private sellerService: SellerService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.startConversation();
  }

  startConversation(): void {
    this.addMessage('assistant', '¡Hola! Soy tu Asistente Inteligente ALTOQ 🤖. Estoy aquí para ayudarte a configurar tu nueva tienda. Cuéntame, ¿cómo te gustaría que se llame tu tienda o qué tipo de productos piensas vender?');
  }

  addMessage(sender: string, content: string): void {
    this.messages.push({ sender, content });
  }

  handleUserInput(input: string): void {
    if (!input || input.trim() === '') return;
    
    this.addMessage('user', input);
    this.userInput = ''; // clear input
    this.isTyping = true;

    this.sellerService.chatWithStoreAssistant(this.messages).subscribe({
      next: (response) => {
        this.isTyping = false;
        if (response.response) {
          this.addMessage('assistant', response.response);
        }
        
        // Actualizar datos extraídos
        if (response.name) this.storeData.name = response.name;
        if (response.description) this.storeData.sells = response.description;
        if (response.ruc) this.storeData.ruc = response.ruc;
        if (response.contact) this.storeData.contact = response.contact;
        if (response.email) this.storeData.email = response.email;
        
        if (response.is_complete) {
          this.currentQuestion = 'confirm_creation';
        }
      },
      error: (error) => {
        this.isTyping = false;
        console.error('Error con el asistente IA:', error);
        this.addMessage('assistant', 'Lo siento, hubo un problema de conexión. ¿Podrías intentar decir eso de nuevo?');
      }
    });
  }

  completeConversation(): void {
    this.currentQuestion = 'confirm_creation';
  }

  createStore(): void {
    const token = this.authService.getToken();
    console.log('Token before creating store:', token);
    
    if (!token) {
      this.addMessage('assistant', 'No tienes una sesión activa. Por favor, inicia sesión primero.');
      return;
    }

    this.isCreatingStore = true;
    this.addMessage('assistant', 'Creando tu tienda...');
    
    const storeData = {
      name: this.storeData.name,
      description: this.storeData.sells,
      ruc: this.storeData.ruc,
      contact: this.storeData.contact,
      email: this.storeData.email
    };

    this.sellerService.becomeSeller(storeData).subscribe({
      next: (response) => {
        this.isCreatingStore = false;
        this.storeCreated = true;
        this.addMessage('assistant', '¡Tienda creada exitosamente! Serás redirigido a tu área de vendedor en unos segundos.');
        console.log('Store created:', response);
        
        setTimeout(() => {
          this.router.navigate(['/seller-area']);
        }, 2000);
      },
      error: (error) => {
        this.isCreatingStore = false;
        console.error('Error creating store:', error);
        this.addMessage('assistant', 'Hubo un error al crear la tienda. Por favor, intenta nuevamente.');
      }
    });
  }

  resetConversation(): void {
    this.messages = [];
    this.storeData = {};
    this.currentQuestion = '';
    this.isCreatingStore = false;
    this.storeCreated = false;
    this.startConversation();
  }
}
