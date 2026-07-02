import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.html',
  styleUrls: ['./faq.css']
})
export class FaqComponent {
  faqs: FaqItem[] = [
    {
      question: '¿Qué es AltoQ y cómo funciona?',
      answer: 'AltoQ es un marketplace local que permite a compradores adquirir productos de tiendas y emprendedores de su zona. Simplemente buscas lo que necesitas, lo agregas al carrito y el vendedor gestiona el envío directo a tu hogar.',
      isOpen: false
    },
    {
      question: '¿Cuánto tiempo tarda en llegar mi pedido?',
      answer: 'Los envíos suelen completarse en un rango de 24 a 48 horas hábiles después de que el vendedor confirma la compra. Puedes verificar el estado de tus envíos ingresando a "Mis Pedidos".',
      isOpen: false
    },
    {
      question: '¿Qué métodos de pago puedo utilizar?',
      answer: 'Aceptamos pagos online 100% seguros a través de tarjetas de débito/crédito Visa, Mastercard, American Express y transferencias seguras mediante PayPal.',
      isOpen: false
    },
    {
      question: '¿Cómo puedo convertirme en vendedor en AltoQ?',
      answer: 'Es muy sencillo. Solo regístrate como usuario en la plataforma, abre tu menú de perfil en el navbar y haz clic en "Conviértete en Vendedor". Rellena los datos de tu tienda (nombre comercial, logo, descripción, RUC) y estarás listo para subir tus primeros productos.',
      isOpen: false
    },
    {
      question: '¿Cómo me comunico con el vendedor de un producto?',
      answer: 'Una vez realizado un pedido, contarás con un canal de chat directo con el vendedor dentro del detalle del pedido en "Mis Pedidos". Esto te permitirá coordinar detalles del delivery o realizar consultas adicionales.',
      isOpen: false
    },
    {
      question: '¿Qué hago si tengo un problema con mi compra?',
      answer: 'Si tienes inconvenientes con el producto o la entrega, te recomendamos contactar al vendedor por el chat interno. Si no recibes respuesta o necesitas soporte oficial de AltoQ, escríbenos mediante nuestro formulario en la sección de Contacto o a nuestro correo Altoqweb@gmail.com.',
      isOpen: false
    }
  ];

  toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }
}
