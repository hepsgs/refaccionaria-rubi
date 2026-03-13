import { create } from 'zustand';

interface CartItem {
  id: string;
  sku: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface UserProfile {
  id: string;
  nombre_completo: string;
  empresa: string;
  email_alternativo?: string;
  estatus: 'pendiente' | 'aprobado';
  es_admin: boolean;
}

interface AppState {
  profile: UserProfile | null;
  config: any | null;
  cart: CartItem[];
  setProfile: (profile: UserProfile | null) => void;
  setConfig: (config: any | null) => void;
  addToCart: (item: Omit<CartItem, 'cantidad'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, cantidad: number) => void;
  clearCart: () => void;
}

export const useStore = create<AppState>((set) => ({
  profile: null,
  config: null,
  cart: [],
  setProfile: (profile) => set({ profile }),
  setConfig: (config) => set({ config }),
  addToCart: (item) => set((state) => {
    const existing = state.cart.find((i) => i.id === item.id);
    if (existing) {
      return {
        cart: state.cart.map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i
        ),
      };
    }
    return { cart: [...state.cart, { ...item, cantidad: 1 }] };
  }),
  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter((i) => i.id !== id),
  })),
  updateQuantity: (id, cantidad) => set((state) => ({
    cart: state.cart.map((i) =>
      i.id === id ? { ...i, cantidad: Math.max(0, cantidad) } : i
    ).filter(i => i.cantidad > 0),
  })),
  clearCart: () => set({ cart: [] }),
}));
