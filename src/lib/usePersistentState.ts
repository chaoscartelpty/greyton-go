import { useEffect, useState, useCallback } from 'react';
import { persistentStore } from './persistentStore';

/**
 * Hook for managing persistent cached data
 * Automatically syncs with server and prevents data loss
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: {
    sync?: boolean;
    ttl?: number;
    onConflict?: (local: T, server: T) => T;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, { synced: boolean; version: number }] {
  const { sync = true, ttl = 24 * 60 * 60 * 1000, onConflict } = options;

  // Get cached value or use initial
  const [value, setValue] = useState<T>(() => {
    const cached = persistentStore.get<T>(key);
    return cached !== null ? cached : initialValue;
  });

  const [metadata, setMetadata] = useState(() => {
    const meta = persistentStore.getMetadata(key);
    return meta || { synced: false, version: 0, timestamp: Date.now() };
  });

  // Set up conflict handler if provided
  useEffect(() => {
    if (onConflict) {
      persistentStore.onConflict(key, (conflict) => {
        const resolved = onConflict(conflict.localVersion, conflict.serverVersion);
        return resolved;
      });
    }
  }, [key, onConflict]);

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = persistentStore.subscribe<T>(key, (newValue) => {
      setValue(newValue);
      setMetadata(persistentStore.getMetadata(key) || {
        synced: false,
        version: 0,
        timestamp: Date.now()
      });
    });

    return unsubscribe;
  }, [key]);

  // Handle value updates
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
    
    persistentStore.set(key, resolved, {
      ttl,
      sync
    });
    
    setValue(resolved);
    setMetadata(persistentStore.getMetadata(key) || {
      synced: false,
      version: 0,
      timestamp: Date.now()
    });
  }, [value, key, ttl, sync]);

  return [value, updateValue, { synced: metadata.synced, version: metadata.version }];
}

/**
 * Hook to track sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState(() => persistentStore.getSyncStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(persistentStore.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Hook to get all unsynced items
 */
export function useUnsyncedItems() {
  const [items, setItems] = useState(() => persistentStore.getUnsyncedItems());

  useEffect(() => {
    const interval = setInterval(() => {
      setItems(persistentStore.getUnsyncedItems());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return items;
}

/**
 * Hook for cache cart items with auto-sync
 */
export function useCachedCart() {
  const [cart, setCart, cartStatus] = usePersistentState('cart', [], {
    sync: true,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    onConflict: (local, server) => {
      // Merge carts: keep all items, prefer server quantities for matching items
      const serverMap = new Map(server.map((item: any) => [item.id, item]));
      return local.map((item: any) => serverMap.get(item.id) || item);
    }
  });

  const addToCart = useCallback((item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, id: item.id || Date.now().toString() }];
    });
  }, [setCart]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev: any[]) => prev.filter((i) => i.id !== itemId));
  }, [setCart]);

  const updateCartItem = useCallback((itemId: string, updates: any) => {
    setCart((prev: any[]) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  }, [setCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, [setCart]);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    ...cartStatus
  };
}

/**
 * Hook for cache customer details with auto-sync
 */
export function useCachedCustomerDetails() {
  const [details, setDetails, status] = usePersistentState('customerDetails', {
    name: '',
    email: '',
    phone: '',
    address: ''
  }, {
    sync: true,
    ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return { details, setDetails, ...status };
}
