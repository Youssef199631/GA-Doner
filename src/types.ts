export type Category = 
  | "Entrées" 
  | "Plats" 
  | "Grillades" 
  | "Kebab" 
  | "Bowl" 
  | "Americain" 
  | "Pidé" 
  | "Boissons" 
  | "Bières" 
  | "Apéritifs" 
  | "Boissons chaudes" 
  | "Vin" 
  | "Desserts" 
  | "Menu enfant";

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: Category;
  image?: string;
  options?: string[];
}

export interface UserProfile {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  loyaltyPoints: number;
  role: 'customer' | 'owner';
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  comment?: string;
}

export type OrderStatus = 'pending' | 'validated' | 'ready' | 'completed' | 'cancelled';

export type PaymentMethod = 'counter' | 'paypal' | 'wero' | 'revolut';

export type PickupTime = 'now' | '20min' | '1h';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  pickupTime: PickupTime;
  createdAt: any; // Firestore Timestamp
  pointsEarned: number;
  customerName?: string;
  customerEmail?: string;
}
