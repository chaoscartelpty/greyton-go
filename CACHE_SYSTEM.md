# Data Caching & Persistence System

## Overview

The caching system automatically saves all user data, cart items, and form inputs to prevent data loss. Changes are synced to the server and recovered if the page crashes or network fails.

## Features

✅ **Automatic Data Persistence** - All changes saved instantly to browser storage  
✅ **Offline Support** - Work without internet, sync when back online  
✅ **Conflict Resolution** - Server/client conflicts handled intelligently  
✅ **Service Worker** - Background syncing and offline caching  
✅ **TTL Management** - Auto-cleanup of old data  
✅ **Recovery** - Lost data recovered on page reload  

## Architecture

### 1. **persistentStore.ts** - Core Cache Engine
- Stores data in localStorage with metadata
- Tracks sync status and versions
- Handles server synchronization
- Automatic TTL and cleanup

### 2. **usePersistentState.ts** - React Hooks
- `usePersistentState()` - General-purpose state hook
- `useCachedCart()` - Pre-configured cart caching
- `useCachedCustomerDetails()` - Customer info caching
- `useSyncStatus()` - Monitor sync progress

### 3. **Service Worker (sw.js)** - Offline Support
- Caches API responses for offline access
- Background sync on reconnection
- Network-first for APIs, cache-first for assets

### 4. **Backend Sync Endpoints**
- `/api/sync` - Sync individual items with conflict detection
- `/api/sync-backup` - Critical data backup before page unload

## Usage Examples

### Basic State with Auto-Sync

```typescript
import { usePersistentState } from '@/lib/usePersistentState';

function MyComponent() {
  const [value, setValue, { synced, version }] = usePersistentState(
    'myKey',
    'initialValue',
    {
      sync: true,          // Auto-sync to server
      ttl: 24 * 60 * 60 * 1000  // 24 hours
    }
  );

  return (
    <div>
      <input 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Changes auto-save..."
      />
      {synced ? '✓ Synced' : '⏳ Syncing...'}
    </div>
  );
}
```

### Cached Shopping Cart

```typescript
import { useCachedCart } from '@/lib/usePersistentState';

function CartView() {
  const { 
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    synced
  } = useCachedCart();

  return (
    <div>
      {cart.map(item => (
        <div key={item.id}>
          {item.name} x {item.quantity}
          <button onClick={() => removeFromCart(item.id)}>Remove</button>
        </div>
      ))}
      <p>{synced ? '✓ Cart saved' : '⏳ Saving...'}</p>
    </div>
  );
}
```

### Customer Details with Conflict Resolution

```typescript
import { usePersistentState } from '@/lib/usePersistentState';

function CustomerForm() {
  const [details, setDetails, status] = usePersistentState(
    'customerDetails',
    { name: '', email: '', phone: '', address: '' },
    {
      onConflict: (local, server) => {
        // Server version wins for email, keep local for address
        return {
          ...local,
          email: server.email
        };
      }
    }
  );

  return (
    <form>
      <input 
        value={details.name}
        onChange={(e) => setDetails({ ...details, name: e.target.value })}
      />
      {/* ... other fields ... */}
    </form>
  );
}
```

### Monitor Sync Status

```typescript
import { useSyncStatus, useUnsyncedItems } from '@/lib/usePersistentState';

function SyncIndicator() {
  const { isSyncing, pendingCount } = useSyncStatus();
  const unsyncedItems = useUnsyncedItems();

  return (
    <div>
      {isSyncing && <p>⏳ Syncing {pendingCount} changes...</p>}
      {unsyncedItems.length > 0 && (
        <p>⚠ {unsyncedItems.length} changes pending sync</p>
      )}
    </div>
  );
}
```

### Manual Cache Operations

```typescript
import { persistentStore } from '@/lib/persistentStore';

// Set value
persistentStore.set('key', { data: 'value' }, {
  ttl: 24 * 60 * 60 * 1000,
  sync: true
});

// Get value
const data = persistentStore.get('key');

// Get metadata
const meta = persistentStore.getMetadata('key');
console.log(meta); // { synced: true, version: 2, timestamp: 1234567890 }

// Subscribe to changes
const unsubscribe = persistentStore.subscribe('key', (newValue) => {
  console.log('Value changed:', newValue);
});

// Manual sync
await persistentStore.syncToServer('https://api.example.com');

// Get all unsynced items
const pending = persistentStore.getUnsyncedItems();
console.log(pending); // [{ key: 'cart', data: {...}, version: 1 }, ...]

// Clear everything
persistentStore.clear();
```

## Initialization

Add this to your app initialization (index.tsx or App.tsx):

```typescript
import { initializeCacheSystem } from '@/lib/initializeCache';

// Call once on app startup
initializeCacheSystem();

function App() {
  // Your app components
}
```

This:
1. Registers the service worker
2. Sets up offline/online listeners
3. Configures background sync
4. Shows user feedback for sync status

## Data Storage Limits

- **localStorage limit**: ~5-10MB per domain
- **Service Worker Cache**: ~50MB per origin
- **Automatic cleanup**: Old items removed by TTL
- **Emergency cleanup**: Oldest 10% removed if storage full

## Offline Behavior

### When Online
- Changes sync immediately (with debouncing)
- Server conflicts resolved per configured handler
- Success notifications shown

### When Offline
- Changes cached locally with "unsynced" flag
- UI shows offline indicator
- All data preserved in browser

### On Reconnection
- Automatic sync of all pending changes
- Conflicts resolved intelligently
- "Back online" notification shown
- Service worker handles in background

## Conflict Resolution

By default, server version wins. Customize with `onConflict`:

```typescript
usePersistentState('key', initial, {
  onConflict: (local, server) => {
    // Merge strategy: combine arrays
    if (Array.isArray(local) && Array.isArray(server)) {
      return [...new Set([...local, ...server])];
    }
    // Otherwise server wins
    return server;
  }
});
```

## Backend Integration

Your server receives sync requests at `/api/sync`:

```typescript
app.post('/api/sync', (req, res) => {
  const { key, data, timestamp, version } = req.body;
  
  // Check for conflicts
  const existing = db.get(key);
  if (existing && existing.version > version) {
    // Conflict!
    return res.status(409).json({
      conflict: true,
      serverValue: existing.data
    });
  }
  
  // Save the data
  db.set(key, { data, version, timestamp });
  res.json({ success: true, id: `${key}_${version}` });
});
```

## Debugging

Enable verbose logging:

```typescript
// Check cache contents
Object.keys(localStorage)
  .filter(k => k.startsWith('gg_persist_'))
  .forEach(k => {
    console.log(k, JSON.parse(localStorage.getItem(k)));
  });

// Monitor sync queue
const unsynced = persistentStore.getUnsyncedItems();
console.log('Pending sync:', unsynced);

// Check sync status
const { isSyncing, pendingCount } = persistentStore.getSyncStatus();
console.log(`Syncing: ${isSyncing}, Pending: ${pendingCount}`);
```

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: localStorage only (no service worker on iOS)
- ✅ Mobile browsers: Full support (Android)

## Performance Tips

1. **Use specific keys** for cache isolation
2. **Set appropriate TTLs** to prevent bloat
3. **Implement conflict handlers** for critical data
4. **Monitor pendingCount** to ensure sync works
5. **Test offline** by throttling network in DevTools
