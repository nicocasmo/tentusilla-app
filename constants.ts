
import { InventoryItemData, InventoryCategory } from './types';

export const INVENTORY_CATEGORIES: { id: InventoryCategory; name: string }[] = [
    { id: 'mobiliario', name: 'Mobiliario' },
    { id: 'manteleria', name: 'Mantelería' },
];

export const INITIAL_INVENTORY_DATA: InventoryItemData[] = [
  {
    id: 'sillas',
    name: 'Sillas de Evento',
    category: 'mobiliario',
    totalQuantity: 100,
    price: 1,
    unit: 'por evento',
    imageUrl: 'https://picsum.photos/seed/chairs/400/300',
  },
  {
    id: 'mesas',
    name: 'Mesas Rectangulares',
    category: 'mobiliario',
    totalQuantity: 20,
    price: 5,
    unit: 'por evento',
    imageUrl: 'https://picsum.photos/seed/tables/400/300',
  },
];

export const VAT_RATE = 0.21;