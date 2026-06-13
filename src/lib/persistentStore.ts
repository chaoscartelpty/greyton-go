/**
 * Persistent Store - Advanced caching with sync capabilities
 * Prevents data loss by automatically persisting changes and syncing with server
 */

interface PersistentStoreItem<T> {
  value: T;
  timestamp: number;
  serverId?: string;
  synced: boolean;
  version: number;
}

interface SyncConflict<T> {
  localVersion: T;
  serverVersion: T;
  localTimestamp: number;
  serverTimestamp: number;
}

class PersistentStore {
  private prefix = 'gg_persist_';
  private syncQueue: Map<string, any> = new Map();
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private conflictHandlers: Map<string, Function> = new Map();

  constructor() {
    this.initializeSyncWorker();
    this.registerServiceWorker();
  }

  /**
   * Set a value that will be automatically synced to the server
   */
  set<T>(key: string, value: T, options: { ttl?: number; sync?: boolean; serverId?: string } = {}): void {
    const { ttl = 7 * 24 * 60 * 60 * 1000, sync = true, serverId } = options;

    const existingItem = this.getItemRaw<T>(key);
    const version = existingItem ? existingItem.version + 1 : 1;

    const item: PersistentStoreItem<T> = {
      value,
      timestamp: Date.now(),
      serverId,
      synced: false,
      version
    };

    try {
      const data = JSON.stringify(item);
      localStorage.setItem(`${this.prefix}${key}`, data);
      localStorage.setItem(`${this.prefix}${key}_ttl`, (Date.now() + ttl).toString());

      // Add to sync queue if not already synced
      if (sync) {
        this.syncQueue.set(key, item);
        this.notifyListeners(key, value);
        this.triggerSync();
      }
    } catch (e) {
      console.error('PersistentStore set error:', e);
      this.handleStorageError(key, value);
    }
  }

  /**
   * Get a value from the store
   */
  get<T>(key: string): T | null {
    const item = this.getItemRaw<T>(key);
    if (!item) return null;

    // Check if expired
    const ttl = localStorage.getItem(`${this.prefix}${key}_ttl`);
    if (ttl && Date.now() > parseInt(ttl)) {
      this.remove(key);
      return null;
    }

    return item.value;
  }

  /**
   * Get metadata about a stored item
   */
  getMetadata(key: string): { synced: boolean; version: number; timestamp: number } | null {
    const item = this.getItemRaw(key);
    if (!item) return null;

    return {
      synced: item.synced,
      version: item.version,
      timestamp: item.timestamp
    };
  }

  /**
   * Remove an item from the store
   */
  remove(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`);
    localStorage.removeItem(`${this.prefix}${key}_ttl`);
    this.syncQueue.delete(key);
  }

  /**
   * Clear all persistent store items
   */
  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
    this.syncQueue.clear();
  }

  /**
   * Watch for changes to a key
   */
  subscribe<T>(key: string, callback: (value: T) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Register a conflict resolution handler
   */
  onConflict<T>(key: string, handler: (conflict: SyncConflict<T>) => T): void {
    this.conflictHandlers.set(key, handler);
  }

  /**
   * Manually sync all pending changes to server
   */
  async syncToServer(apiBaseUrl: string): Promise<void> {
    if (this.isSyncing || this.syncQueue.size === 0) return;

    this.isSyncing = true;
    const items = Array.from(this.syncQueue.entries());

    for (const [key, item] of items) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            data: item,
            timestamp: item.timestamp,
            version: item.version
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Check for conflicts
          if (result.conflict) {
            this.handleConflict(key, item.value, result.serverValue);
          } else {
            // Mark as synced
            item.synced = true;
            item.serverId = result.id;
            this.updateItemMetadata(key, item);
            this.syncQueue.delete(key);
          }
        } else if (response.status === 409) {
          // Conflict detected
          const result = await response.json();
          this.handleConflict(key, item.value, result.serverValue);
        }
      } catch (error) {
        console.error(`Sync failed for key: ${key}`, error);
        // Keep in queue for retry
      }
    }

    this.isSyncing = false;
  }

  /**
   * Get all unsynced items
   */
  getUnsyncedItems(): Array<{ key: string; data: any; version: number }> {
    return Array.from(this.syncQueue.entries()).map(([key, item]) => ({
      key,
      data: item.value,
      version: item.version
    }));
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isSyncing: boolean; pendingCount: number } {
    return {
      isSyncing: this.isSyncing,
      pendingCount: this.syncQueue.size
    };
  }

  // Private methods

  private getItemRaw<T>(key: string): PersistentStoreItem<T> | null {
    try {
      const data = localStorage.getItem(`${this.prefix}${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('PersistentStore get error:', e);
      return null;
    }
  }

  private updateItemMetadata(key: string, item: PersistentStoreItem<any>): void {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
    } catch (e) {
      console.error('Failed to update metadata:', e);
    }
  }

  private notifyListeners<T>(key: string, value: T): void {
    this.listeners.get(key)?.forEach(callback => {
      try {
        callback(value);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  private handleConflict<T>(key: string, localValue: T, serverValue: T): void {
    const handler = this.conflictHandlers.get(key);
    
    if (handler) {
      const resolvedValue = handler({
        localVersion: localValue,
        serverVersion: serverValue,
        localTimestamp: Date.now(),
        serverTimestamp: Date.now()
      });
      this.set(key, resolvedValue, { sync: true });
    } else {
      // Default: server version wins
      this.set(key, serverValue, { sync: false });
    }
  }

  private triggerSync(): void {
    // Sync after a short delay to batch changes
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
    }
    this.syncInterval = setTimeout(() => {
      const apiUrl = (window as any).__VITE_API_BASE_URL__ || '';
      if (apiUrl) {
        this.syncToServer(apiUrl);
      }
    }, 1000);
  }

  private initializeSyncWorker(): void {
    // Periodic sync check every 30 seconds
    setInterval(() => {
      const apiUrl = (window as any).__VITE_API_BASE_URL__ || '';
      if (apiUrl && this.syncQueue.size > 0 && !this.isSyncing) {
        this.syncToServer(apiUrl);
      }
    }, 30000);

    // Sync on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.syncQueue.size > 0) {
        const apiUrl = (window as any).__VITE_API_BASE_URL__ || '';
        if (apiUrl) {
          this.syncToServer(apiUrl);
        }
      }
    });

    // Sync before page unload
    window.addEventListener('beforeunload', () => {
      if (this.syncQueue.size > 0) {
        // Use sync API for critical data
        const data = Array.from(this.syncQueue.entries());
        navigator.sendBeacon('/api/sync-backup', JSON.stringify(data));
      }
    });
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
    }
  }

  private handleStorageError(key: string, value: any): void {
    // Try to free up space by removing old items
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .sort((a, b) => {
        const aTime = parseInt(localStorage.getItem(`${a}_ttl`) || '0');
        const bTime = parseInt(localStorage.getItem(`${b}_ttl`) || '0');
        return aTime - bTime;
      });

    // Remove oldest 10% of items
    const removeCount = Math.ceil(keys.length * 0.1);
    for (let i = 0; i < removeCount; i++) {
      const keyToRemove = keys[i].replace(this.prefix, '');
      this.remove(keyToRemove);
    }

    // Retry
    try {
      const item: PersistentStoreItem<any> = {
        value,
        timestamp: Date.now(),
        synced: false,
        version: 1
      };
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
    } catch (e) {
      console.error('Storage still full after cleanup:', e);
    }
  }
}

export const persistentStore = new PersistentStore();
