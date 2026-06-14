
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  deliveryTime: string;
  email?: string;
  phone?: string;
  responsiblePerson?: string;
  menu: MenuSection[];
  /** Toggle for visibility on the main page. Defaults to true if undefined. */
  isVisible?: boolean;
  /** Toggle if the restaurant is a Retail Grocery Store with picker/list orders */
  isGroceryStore?: boolean;
  popularGroceryItems?: MenuItem[];
}

export interface MenuItem {
  name: string;
  description?: string;
  price: string;
  variants?: { label: string; price: string }[];
  extras?: { label: string; price: string }[];
  note?: string;
  /** Admin-only reference code */
  code?: string;
  /** Toggle for delivery availability. Defaults to true if undefined. */
  availableForDelivery?: boolean;
  /** Keys for smart modifiers (e.g. "Temperature", "Egg Style") defined in global state */
  modifiers?: string[];
  /** Optional restaurant info for collection mode */
  restaurantId?: string;
  restaurantName?: string;
}

export interface SubSection {
  title?: string;
  description?: string;
  items: MenuItem[];
}

export interface MenuSection {
  id: string;
  title: string;
  subtitle?: string;
  note?: string;
  content: SubSection[];
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  commission: number; // 15% of subtotal
  tip?: number;
  status: 'pending' | 'confirmed' | 'allocated' | 'delivered' | 'cancelled';
  driverId?: string;
  paymentMethod?: 'cash' | 'payshap';
  estimatedCollectionTime?: string;
  driverEta?: string;
  restaurantNotes?: string;
  createdAt: string;
  // Grocery Store pick list options
  isGrocery?: boolean;
  groceryPickList?: { name: string; quantity: string; price?: string; description?: string }[];
  groceryPickedItems?: { name: string; quantity: string; picked: boolean; price: number; comment?: string }[];
  isProformaSent?: boolean;
  customerEmail?: string;
  isProformaPaid?: boolean;
  isPayShapReceived?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  pin?: string;
  isClockedIn: boolean;
  currentShiftId?: string;
}

export interface Shift {
  id: string;
  driverId: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  earnings?: number; // R25 per hour
}
