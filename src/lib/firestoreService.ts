import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, where, Timestamp } from 'firebase/firestore';
import { restaurants as seedData } from '../data';
import type { Restaurant, Order, Driver, Shift } from '../types';

const RESTAURANTS_DOC = 'app_data/restaurants';
const ORDERS_COL = 'orders';
const DRIVERS_DOC = 'app_data/drivers';
const SHIFTS_COL = 'shifts';
const FINANCIALS_COL = 'financials';
const CASHUPS_COL = 'cashups';

// ─── Restaurants ───────────────────────────────────────────

export async function loadRestaurants(): Promise<Restaurant[] | null> {
  try {
    const snap = await getDoc(doc(db, RESTAURANTS_DOC));
    if (snap.exists()) {
      return snap.data().list as Restaurant[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRestaurants(restaurants: Restaurant[]): Promise<void> {
  await setDoc(doc(db, RESTAURANTS_DOC), { list: restaurants });
}

export async function seedIfEmpty(): Promise<Restaurant[]> {
  const existing = await loadRestaurants();
  if (existing && existing.length > 0) {
    return existing;
  }
  await saveRestaurants(seedData);
  return seedData;
}

export function subscribeRestaurants(
  onData: (restaurants: Restaurant[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    doc(db, RESTAURANTS_DOC),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data().list as Restaurant[]);
      }
    },
    (err) => onError?.(err)
  );
}

// ─── Orders ───────────────────────────────────────────────

export async function loadOrders(): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Order));
  } catch {
    return [];
  }
}

export async function saveOrder(order: Order): Promise<string> {
  if (order.id && order.id.length > 0) {
    await setDoc(doc(db, ORDERS_COL, order.id), order);
    return order.id;
  }
  const ref = await addDoc(collection(db, ORDERS_COL), order);
  return ref.id;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  await updateDoc(doc(db, ORDERS_COL, id), data);
}

export function subscribeOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Order));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

// ─── Drivers ──────────────────────────────────────────────

export async function loadDrivers(): Promise<Driver[]> {
  try {
    const snap = await getDoc(doc(db, DRIVERS_DOC));
    if (snap.exists()) {
      return snap.data().list as Driver[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveDrivers(drivers: Driver[]): Promise<void> {
  await setDoc(doc(db, DRIVERS_DOC), { list: drivers });
}

export function subscribeDrivers(
  onData: (drivers: Driver[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(doc(db, DRIVERS_DOC),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data().list as Driver[]);
      }
    },
    (err) => onError?.(err)
  );
}

// ─── Shifts ───────────────────────────────────────────────

export async function loadShifts(): Promise<Shift[]> {
  try {
    const q = query(collection(db, SHIFTS_COL), orderBy('clockIn', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Shift);
  } catch {
    return [];
  }
}

export async function saveShift(shift: Shift): Promise<void> {
  await addDoc(collection(db, SHIFTS_COL), shift);
}

export async function updateShift(id: string, data: Partial<Shift>): Promise<void> {
  await updateDoc(doc(db, SHIFTS_COL, id), data);
}

// ─── Stock Pricing (per-category pricing snapshots) ────────

export const DEFAULT_PRICING_CATEGORIES = [
  { label: 'Vegetables', margin: 25 },
  { label: 'Fruit', margin: 25 },
  { label: 'Dairy', margin: 20 },
  { label: 'Meat & Fish', margin: 30 },
  { label: 'Deli', margin: 35 },
  { label: 'Bakery', margin: 30 },
  { label: 'Pantry', margin: 25 },
  { label: 'Beverages', margin: 25 },
  { label: 'Frozen', margin: 25 },
  { label: 'Alcohol', margin: 30 },
  { label: 'Household', margin: 30 },
  { label: 'Health & Beauty', margin: 35 },
  { label: 'Baby', margin: 25 },
  { label: 'Pet', margin: 25 },
  { label: 'Other', margin: 30 },
];

export async function loadPricingCategories(): Promise<typeof DEFAULT_PRICING_CATEGORIES> {
  try {
    const snap = await getDoc(doc(db, 'app_data', 'pricing'));
    if (snap.exists()) {
      return snap.data().categories as typeof DEFAULT_PRICING_CATEGORIES;
    }
    return DEFAULT_PRICING_CATEGORIES;
  } catch {
    return DEFAULT_PRICING_CATEGORIES;
  }
}

export async function savePricingCategories(categories: typeof DEFAULT_PRICING_CATEGORIES): Promise<void> {
  await setDoc(doc(db, 'app_data', 'pricing'), { categories });
}

// ─── Cashup / Financials ──────────────────────────────────

export interface DriverPayslip {
  driverId: string;
  driverName: string;
  deliveries: number;
  deliveryFeesTotal: number;
  hoursWorked: number;
  hourlyEarnings: number;
  tips: number;
  totalPayable: number;
}

export interface DailyCashup {
  id?: string;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalDeliveryFees: number;
  totalCommissions: number;
  totalDriverPayouts: number;
  cashOrders: number;
  cashTotal: number;
  payShapOrders: number;
  payShapTotal: number;
  driverPayslips: DriverPayslip[];
  netProfit: number;
  createdAt: string;
}

export interface MonthToDate {
  yearMonth: string;
  totalRevenue: number;
  totalDeliveryFees: number;
  totalCommissions: number;
  totalDriverPayouts: number;
  netProfit: number;
  lastUpdated: string;
}

export async function loadCashups(): Promise<DailyCashup[]> {
  try {
    const q = query(collection(db, CASHUPS_COL), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyCashup));
  } catch {
    return [];
  }
}

export async function saveCashup(cashup: DailyCashup): Promise<string> {
  const ref = await addDoc(collection(db, CASHUPS_COL), cashup);
  return ref.id;
}

export async function loadMonthToDate(): Promise<MonthToDate | null> {
  try {
    const snap = await getDoc(doc(db, 'app_data', 'monthToDate'));
    if (snap.exists()) {
      return snap.data() as MonthToDate;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveMonthToDate(mtd: MonthToDate): Promise<void> {
  await setDoc(doc(db, 'app_data', 'monthToDate'), mtd);
}

// ─── Helper: compute daily cashup from orders ─────────────

export function computeDailyCashup(orders: Order[], drivers: Driver[], shifts: Shift[], date: string): DailyCashup {
  const dayOrders = orders.filter(o => o.createdAt?.startsWith(date));
  const delivered = dayOrders.filter(o => o.status === 'delivered');
  const cashOrders = delivered.filter(o => o.paymentMethod === 'Cash');
  const payShapOrders = delivered.filter(o => o.paymentMethod === 'PayShap');

  const totalRevenue = delivered.reduce((s, o) => s + (o.total || 0), 0);
  const totalDeliveryFees = delivered.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const totalCommissions = delivered.reduce((s, o) => s + (o.commission || 0), 0);

  const driverPayslips: DriverPayslip[] = drivers.map(driver => {
    const driverOrders = delivered.filter(o => o.driverId === driver.id);
    const driverShift = shifts.find(s => s.driverId === driver.id && s.clockIn?.startsWith(date));
    const hoursWorked = driverShift?.totalHours || 0;
    const hourlyEarnings = hoursWorked * 25;
    const deliveries = driverOrders.length;
    const deliveryFeesTotal = driverOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
    const tips = 0;
    return {
      driverId: driver.id,
      driverName: driver.name,
      deliveries,
      deliveryFeesTotal,
      hoursWorked,
      hourlyEarnings,
      tips,
      totalPayable: hourlyEarnings,
    };
  });

  const totalDriverPayouts = driverPayslips.reduce((s, p) => s + p.totalPayable, 0);

  return {
    date,
    totalOrders: delivered.length,
    totalRevenue,
    totalDeliveryFees,
    totalCommissions,
    totalDriverPayouts,
    cashOrders: cashOrders.length,
    cashTotal: cashOrders.reduce((s, o) => s + (o.total || 0), 0),
    payShapOrders: payShapOrders.length,
    payShapTotal: payShapOrders.reduce((s, o) => s + (o.total || 0), 0),
    driverPayslips,
    netProfit: totalRevenue - totalDeliveryFees - totalDriverPayouts,
    createdAt: new Date().toISOString(),
  };
}
