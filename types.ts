
export type InventoryCategory = 'mobiliario' | 'manteleria';

export interface Reservation {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  eventAddress: string;
  pickupDate: string;
  returnDate: string;
  needsTransport: boolean;
}

export interface InventoryItemData {
  id: string;
  name: string;
  category: InventoryCategory;
  totalQuantity: number;
  availableQuantity?: number; // Stock disponible para un rango de fechas
  price: number;
  imageUrl: string;
  unit: string;
}

export interface Cart {
  [itemId: string]: number;
}

export interface CompletedReservation {
  id: string;
  customer: Reservation;
  cart: Cart;
  total: number;
  status: 'pending' | 'validated' | 'rejected';
}

export interface AdminUser {
  id: string;
  email: string;
  password: string;
}