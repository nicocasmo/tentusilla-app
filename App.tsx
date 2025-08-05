
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Reservation, Cart, CompletedReservation, InventoryItemData, AdminUser } from './types';
import { INITIAL_INVENTORY_DATA, VAT_RATE } from './constants';

import ReservationForm from './components/ReservationForm';
import InventoryList from './components/InventoryList';
import OrderSummary from './components/OrderSummary';
import AdminDashboard from './components/admin/AdminDashboard';
import SuccessView from './components/SuccessView';
import AdminLogin from './components/admin/AdminLogin';

const initialReservationState: Reservation = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  eventAddress: '',
  pickupDate: '',
  returnDate: '',
  needsTransport: false,
};

function App() {
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [reservation, setReservation] = useState<Reservation>(initialReservationState);
  const [cart, setCart] = useState<Cart>({});
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // State with localStorage persistence
  const [inventory, setInventory] = useState<InventoryItemData[]>(() => {
    try {
      const stored = localStorage.getItem('inventory');
      return stored ? JSON.parse(stored) : INITIAL_INVENTORY_DATA;
    } catch (e) {
      console.error("Failed to parse inventory from localStorage", e);
      return INITIAL_INVENTORY_DATA;
    }
  });

  const [reservations, setReservations] = useState<CompletedReservation[]>(() => {
    try {
      const stored = localStorage.getItem('reservations');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse reservations from localStorage", e);
      return [];
    }
  });

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const stored = localStorage.getItem('adminUsers');
      return stored ? JSON.parse(stored) : [
        { id: 'user-1', email: 'admin@tentusilla.com', password: 'admin' },
        { id: 'user-2', email: 'nicocasmo@gmail.com', password: '1234' }
      ];
    } catch (e) {
      console.error("Failed to parse admin users from localStorage", e);
      return [
        { id: 'user-1', email: 'admin@tentusilla.com', password: 'admin' },
        { id: 'user-2', email: 'nicocasmo@gmail.com', password: '1234' }
      ];
    }
  });

  const [lastSubmittedReservation, setLastSubmittedReservation] = useState<CompletedReservation | null>(null);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('inventory', JSON.stringify(inventory));
    } catch (e) {
      console.error("Failed to save inventory to localStorage", e);
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem('reservations', JSON.stringify(reservations));
    } catch (e) {
      console.error("Failed to save reservations to localStorage", e);
    }
  }, [reservations]);

  useEffect(() => {
    try {
      localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    } catch (e) {
      console.error("Failed to save admin users to localStorage", e);
    }
  }, [adminUsers]);


  const availableInventory = useMemo(() => {
    const { pickupDate, returnDate } = reservation;

    if (!pickupDate || !returnDate) {
      return inventory.map(item => ({ ...item, availableQuantity: item.totalQuantity }));
    }

    try {
      const newResStart = new Date(pickupDate);
      const newResEnd = new Date(returnDate);

      if (isNaN(newResStart.getTime()) || isNaN(newResEnd.getTime())) {
        return inventory.map(item => ({ ...item, availableQuantity: item.totalQuantity }));
      }

      const validatedReservations = reservations.filter(res => res.status === 'validated');
      const reservedQuantities: { [itemId: string]: number } = {};

      for (const res of validatedReservations) {
        const existingResStart = new Date(res.customer.pickupDate);
        const existingResEnd = new Date(res.customer.returnDate);
        
        if (newResStart <= existingResEnd && newResEnd >= existingResStart) {
          for (const itemId in res.cart) {
            reservedQuantities[itemId] = (reservedQuantities[itemId] || 0) + res.cart[itemId];
          }
        }
      }

      return inventory.map(item => {
        const reserved = reservedQuantities[item.id] || 0;
        const available = Math.max(0, item.totalQuantity - reserved);
        return { ...item, availableQuantity: available };
      });
    } catch (e) {
      return inventory.map(item => ({...item, availableQuantity: item.totalQuantity}));
    }
  }, [inventory, reservations, reservation.pickupDate, reservation.returnDate]);
  
  useEffect(() => {
    // Valida y ajusta el carrito si la disponibilidad cambia por la selección de fechas
    if (!reservation.pickupDate || !reservation.returnDate) return;

    const newCart = { ...cart };
    let cartUpdated = false;

    for (const item of availableInventory) {
      const cartQuantity = newCart[item.id] || 0;
      if (cartQuantity > (item.availableQuantity ?? item.totalQuantity)) {
        newCart[item.id] = Math.max(0, item.availableQuantity ?? 0);
        cartUpdated = true;
      }
    }

    if (cartUpdated) {
      alert('Algunas cantidades del carrito se han ajustado debido a la disponibilidad en las nuevas fechas seleccionadas.');
      setCart(newCart);
    }
  }, [availableInventory]);


  useEffect(() => {
    const newSubtotal = availableInventory.reduce((acc, item) => {
      const quantity = cart[item.id] || 0;
      return acc + quantity * item.price;
    }, 0);
    setSubtotal(newSubtotal);

    const vatAmount = newSubtotal * VAT_RATE;
    const newTotal = newSubtotal + vatAmount;
    setTotal(newTotal);
  }, [cart, availableInventory]);

  const handleReservationChange = useCallback((field: keyof Reservation, value: string | boolean) => {
    setReservation(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCartChange = useCallback((itemId: string, quantity: number) => {
    setCart(prev => ({ ...prev, [itemId]: quantity }));
  }, []);

  const handleUpdateInventory = useCallback((updatedItem: InventoryItemData) => {
    setInventory(prevInventory =>
      prevInventory.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }, []);

  const handleAddItem = useCallback((itemData: Omit<InventoryItemData, 'id' | 'availableQuantity'>) => {
    const newItemId = itemData.name.toLowerCase().replace(/\s+/g, '-');
    
    if (inventory.some(item => item.id === newItemId)) {
      alert('Ya existe un artículo con un nombre similar. Por favor, elija un nombre diferente.');
      return;
    }

    const newItem: InventoryItemData = {
      ...itemData,
      id: newItemId,
    };
    
    setInventory(prevInventory => [...prevInventory, newItem]);
  }, [inventory]);

  const handleDeleteItem = useCallback((itemIdToDelete: string) => {
    setInventory(prevInventory =>
      prevInventory.filter(item => item.id !== itemIdToDelete)
    );
    setCart(prevCart => {
      const newCart = { ...prevCart };
      delete newCart[itemIdToDelete];
      return newCart;
    });
  }, []);
  
  const handleUpdateReservation = useCallback((reservationId: string, updatedData: Partial<Omit<CompletedReservation, 'id'>>) => {
    setReservations(prev =>
      prev.map(res =>
        res.id === reservationId ? { ...res, ...updatedData } : res
      )
    );
  }, []);

  const handleCreateAdminUser = useCallback((email: string, password: string) => {
    if (adminUsers.some(user => user.email.toLowerCase() === email.toLowerCase())) {
      alert('Un usuario con este email ya existe.');
      return;
    }
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      email,
      password,
    };
    setAdminUsers(prev => [...prev, newUser]);
  }, [adminUsers]);

  const handleDeleteAdminUser = useCallback((userId: string) => {
    if (adminUsers.length <= 1) {
      alert('No se puede eliminar el último usuario administrador.');
      return;
    }
    setAdminUsers(prev => prev.filter(user => user.id !== userId));
  }, [adminUsers]);

  const handleUpdateAdminUser = useCallback((userId: string, email: string, password?: string) => {
    if (adminUsers.some(user => user.id !== userId && user.email.toLowerCase() === email.toLowerCase())) {
      alert('Un usuario con este email ya existe.');
      return;
    }
    setAdminUsers(prev => prev.map(user => {
      if (user.id === userId) {
        return { ...user, email, password: password || user.password };
      }
      return user;
    }));
  }, [adminUsers]);

  const handleAdminLogin = useCallback((email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      setLoginError('El email y la contraseña son obligatorios.');
      return;
    }
    const user = adminUsers.find(u => u.email === email && u.password === password);
    if (user) {
      setIsAdminLoggedIn(true);
      setLoginError('');
      setView('admin');
    } else {
      setLoginError('Credenciales incorrectas. Por favor, inténtelo de nuevo.');
    }
  }, [adminUsers]);

  const handleAdminLogout = useCallback(() => {
    setIsAdminLoggedIn(false);
    setView('customer');
  }, []);
  
  const isFormValid = reservation.firstName && reservation.lastName && reservation.phone && reservation.email && reservation.eventAddress && reservation.pickupDate && reservation.returnDate && subtotal > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const newReservation: CompletedReservation = {
      id: `res-${Date.now()}`,
      customer: reservation,
      cart,
      total,
      status: 'pending',
    };
    
    setReservations(prev => [...prev, newReservation]);
    setLastSubmittedReservation(newReservation);
  };

  const handleNewReservation = () => {
    setLastSubmittedReservation(null);
    setReservation(initialReservationState);
    setCart({});
  };

  const handleViewChange = (newView: 'customer' | 'admin') => {
    if (newView === 'admin' && !isAdminLoggedIn) {
      setLoginError('');
    }
    setView(newView);
  };

  const ViewToggle = () => (
    <div className="flex items-center justify-center p-1 rounded-lg bg-gray-200">
      <button 
        onClick={() => handleViewChange('customer')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'customer' || (view === 'admin' && !isAdminLoggedIn) ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
      >
        Vista Cliente
      </button>
      <button 
        onClick={() => handleViewChange('admin')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'admin' && isAdminLoggedIn ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
      >
        Vista Admin
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestor de Reservas</h1>
            <p className="text-gray-600 mt-1">
              {view === 'customer' || !isAdminLoggedIn ? 'Organice el mobiliario para su próximo evento.' : 'Administre inventario y reservas.'}
            </p>
          </div>
          <ViewToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {view === 'customer' || (view === 'admin' && !isAdminLoggedIn) ? (
          view === 'admin' ? (
            <AdminLogin onLogin={handleAdminLogin} error={loginError} />
          ) : lastSubmittedReservation ? (
            <SuccessView 
              reservation={lastSubmittedReservation}
              onNewReservation={handleNewReservation}
              inventory={inventory}
            />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 space-y-4">
                  <ReservationForm reservation={reservation} onReservationChange={handleReservationChange} />
                  <InventoryList cart={cart} onCartChange={handleCartChange} inventory={availableInventory} />
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <div className="sticky top-24">
                    <OrderSummary 
                      cart={cart}
                      inventory={inventory}
                      subtotal={subtotal} 
                      total={total}
                      needsTransport={reservation.needsTransport}
                    />
                    <div className="mt-4">
                      <button 
                        type="submit" 
                        disabled={!isFormValid}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
                      >
                        Confirmar Reserva
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )
        ) : (
          <AdminDashboard 
            reservations={reservations} 
            inventory={inventory} 
            onUpdateInventory={handleUpdateInventory}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onUpdateReservation={handleUpdateReservation}
            adminUsers={adminUsers}
            onCreateAdminUser={handleCreateAdminUser}
            onUpdateAdminUser={handleUpdateAdminUser}
            onDeleteAdminUser={handleDeleteAdminUser}
            onLogout={handleAdminLogout}
          />
        )}
      </main>
    </div>
  );
}

export default App;
