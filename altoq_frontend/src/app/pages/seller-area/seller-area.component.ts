import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerService } from '../../services/seller.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';
import { ConversationalAssistantComponent } from '../../components/conversational-assistant/conversational-assistant.component';

@Component({
  selector: 'app-seller-area',
  standalone: true,
  imports: [CommonModule, FormsModule, ConversationalAssistantComponent],
  templateUrl: './seller-area.component.html',
  styleUrls: ['./seller-area.component.css']
})
export class SellerAreaComponent implements OnInit {
  store: any = null;
  storeProducts: any[] = [];
  isLoading = false;
  errorMessage = '';
  showAddProductChat: boolean = false;
  storeTheme: string = 'default';
  currentView: 'store' | 'dashboard' = 'store';
  isEditingStore: boolean = false;
  editedStore: any = {};
  isSaving: boolean = false;
  showProductsView: boolean = false;
  showEditProductModal: boolean = false;
  editingProduct: any = {};
  isSavingProduct: boolean = false;

  constructor(
    private sellerService: SellerService,
    private productService: ProductService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('SellerAreaComponent initialized');
    this.loadMyStore();
  }

  loadMyStore(): void {
    console.log('Loading store...');
    this.isLoading = true;
    this.errorMessage = '';

    this.sellerService.getMyStore().subscribe({
      next: (response) => {
        console.log('Store loaded:', response);
        this.store = response;
        this.determineTheme();
        this.loadStoreProducts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading store:', error);
        this.errorMessage = error.error?.detail || 'Error al cargar tu tienda. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  determineTheme(): void {
    if (this.store && this.store.theme) {
      this.storeTheme = this.store.theme;
    } else {
      this.storeTheme = 'default';
    }
  }

  loadStoreProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.storeProducts = products.filter(p => Number(p.store_id) === Number(this.store?.id));
      },
      error: (error) => {
        console.error('Error loading products:', error);
      }
    });
  }

  toggleAddProductChat(): void {
    this.showAddProductChat = !this.showAddProductChat;
  }

  toggleProductsView(): void {
    this.showProductsView = !this.showProductsView;
  }

  editProduct(product: any): void {
    this.editingProduct = { ...product };
    this.showEditProductModal = true;
  }

  closeEditModal(): void {
    this.showEditProductModal = false;
    this.editingProduct = {};
  }

  saveProductChanges(): void {
    if (!this.editingProduct.name || !this.editingProduct.price) {
      this.toastService.show('Por favor, completa el nombre y precio del producto', 'error');
      return;
    }

    this.isSavingProduct = true;

    this.productService.updateProduct(this.editingProduct.id, this.editingProduct).subscribe({
      next: (response) => {
        this.loadStoreProducts();
        this.closeEditModal();
        this.isSavingProduct = false;
        this.toastService.show('Producto actualizado exitosamente', 'success');
      },
      error: (error) => {
        console.error('Error updating product:', error);
        this.isSavingProduct = false;
        this.toastService.show('Error al actualizar el producto. Por favor, intenta nuevamente.', 'error');
      }
    });
  }

  deleteProduct(productId: number): void {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.loadStoreProducts();
        this.toastService.show('Producto eliminado exitosamente', 'success');
      },
      error: (error) => {
        console.error('Error deleting product:', error);
        this.toastService.show('Error al eliminar el producto. Por favor, intenta nuevamente.', 'error');
      }
    });
  }

  onProductCreated(): void {
    this.loadStoreProducts();
  }

  switchView(view: 'store' | 'dashboard'): void {
    this.currentView = view;
  }

  getThemeClass(): string {
    return `theme-${this.storeTheme}`;
  }

  toggleEditStore(): void {
    if (this.isEditingStore) {
      this.isEditingStore = false;
    } else {
      this.editedStore = { ...this.store };
      this.isEditingStore = true;
    }
  }

  saveStoreChanges(): void {
    if (!this.editedStore.name || !this.editedStore.email) {
      this.toastService.show('Por favor, completa el nombre y email de la tienda', 'error');
      return;
    }

    this.isSaving = true;

    this.sellerService.updateStore(this.editedStore).subscribe({
      next: (response) => {
        console.log('Store updated successfully:', response);
        this.store = response;
        this.determineTheme();
        this.isEditingStore = false;
        this.isSaving = false;
        this.toastService.show('Información de la tienda actualizada exitosamente', 'success');
      },
      error: (error) => {
        console.error('Error updating store:', error);
        this.isSaving = false;
        this.toastService.show('Error al actualizar la información de la tienda. Por favor, intenta nuevamente.', 'error');
      }
    });
  }
}
