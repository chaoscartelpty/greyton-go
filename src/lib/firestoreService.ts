import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { restaurants as seedData } from '../data';
import type { Restaurant } from '../types';

const RESTAURANTS_DOC = 'app_data/restaurants';

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
