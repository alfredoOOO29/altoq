export interface Order {
  id?: number;
  user_id: number;
  products: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  shipping_address: string;
  contact_phone: string;
  delivery_code?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
}