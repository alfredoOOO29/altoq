import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService, PublicStore } from '../../services/store.service';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './marcas.html',
  styleUrls: ['./marcas.css']
})
export class MarcasComponent implements OnInit {
  stores: PublicStore[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private storeService: StoreService) {}

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.storeService.getPublicStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching stores:', err);
        this.errorMessage = 'No se pudieron cargar las marcas y tiendas en este momento.';
        this.isLoading = false;
      }
    });
  }

  getThemeGradient(theme?: string): string {
    const gradients: Record<string, string> = {
      bakery: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      fashion: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      home: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      food: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      tech: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      default: 'linear-gradient(135deg, #0050d2 0%, #002f85 100%)',
    };
    return gradients[theme ?? 'default'] ?? gradients['default'];
  }
}
