# Cache System - Quick Start Guide

## What Was Added

A complete data caching system to prevent data loss on your live website:

1. ✅ **Persistent Store** - Saves all changes locally
2. ✅ **React Hooks** - Easy integration with your app
3. ✅ **Service Worker** - Offline support and background sync
4. ✅ **Backend Sync** - Server endpoints for syncing data
5. ✅ **UI Components** - Ready-to-use status indicators

## Files Created

```
src/
  lib/
    persistentStore.ts          # Core caching engine
    usePersistentState.ts       # React hooks
    initializeCache.ts          # Initialization
  components/
    CacheIndicators.tsx         # UI indicators
  sw.js                         # Service worker

server.js (updated)             # Added sync endpoints
CACHE_SYSTEM.md                 # Full documentation
```

## Integration Steps

### Step 1: Initialize Cache System

Add to `src/index.tsx` or `src/App.tsx`:

```typescript
import { initializeCacheSystem } from './lib/initializeCache';

// Call once on app startup
initializeCacheSystem();

function App() {
  // ... your app
}
```

### Step 2: Use Cached Cart

Replace your cart state with:

```typescript
import { useCachedCart } from '@/lib/usePersistentState';

function ShoppingCart() {
  const { 
    cart,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    synced
  } = useCachedCart();

  return (
    <>
      <div>Items: {cart.length}</div>
      <p>{synced ? '✓ Saved' : '⏳ Saving...'}</p>
      {/* Use cart, addToCart, etc. as before */}
    </>
  );
}
```

### Step 3: Use Cached Customer Details

```typescript
import { useCachedCustomerDetails } from '@/lib/usePersistentState';

function CheckoutForm() {
  const { details, setDetails, synced } = useCachedCustomerDetails();

  return (
    <form>
      <input 
        value={details.name}
        onChange={(e) => setDetails({...details, name: e.target.value})}
      />
      {synced && <p>✓ Auto-saved</p>}
    </form>
  );
}
```

### Step 4: Add Status Indicators

Add these to your app (header/footer):

```typescript
import { 
  SyncStatusIndicator,
  OfflineIndicator 
} from '@/components/CacheIndicators';

function App() {
  return (
    <>
      <header>
        <SyncStatusIndicator />
      </header>
      <OfflineIndicator />
      {/* ... rest of app ... */}
    </>
  );
}
```

### Step 5: Test It

1. **Normal use**: Fill out form, refresh page → data is still there ✓
2. **Offline**: Disconnect internet, make changes → changes saved ✓
3. **Reconnect**: Come back online → changes sync to server ✓
4. **Multiple tabs**: Change data in one tab → reflects in other tabs ✓

## What Gets Cached

By default:
- 🛒 Shopping cart (7 days)
- 👤 Customer details (30 days)
- 📝 Any other data you add with `usePersistentState()`

## Configuration

### Cache Duration

```typescript
// Keep data for 1 hour
usePersistentState('key', initial, { ttl: 60 * 60 * 1000 })

// Keep data for 30 days
usePersistentState('key', initial, { ttl: 30 * 24 * 60 * 60 * 1000 })
```

### Disable Sync

```typescript
// Local only, don't sync to server
usePersistentState('key', initial, { sync: false })
```

### Conflict Resolution

```typescript
usePersistentState('cart', [], {
  onConflict: (local, server) => {
    // Local version wins
    return local;
  }
})
```

## Monitoring

### Check What's Cached

```typescript
// In browser console
Object.keys(localStorage)
  .filter(k => k.startsWith('gg_persist_'))
  .forEach(k => {
    console.log(k, JSON.parse(localStorage.getItem(k)));
  });
```

### Check Sync Status

```typescript
import { persistentStore } from '@/lib/persistentStore';

// Get all unsynced items
console.log(persistentStore.getUnsyncedItems());

// Get sync status
console.log(persistentStore.getSyncStatus());
```

### Clear Cache

```typescript
import { persistentStore } from '@/lib/persistentStore';

// Clear everything
persistentStore.clear();

// Clear specific item
persistentStore.remove('cartKey');
```

## Troubleshooting

### "Service Worker not loading"
- Check browser console for errors
- Ensure `/sw.js` is accessible
- Try incognito mode (some browsers disable SW there)

### "Data not persisting"
- Check localStorage is not disabled
- Try accessing different URL (storage is per-origin)
- Check browser storage limits not exceeded

### "Sync not working"
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend `/api/sync` endpoint is working
- Look at network tab in DevTools for failed requests

### "Conflicts keep happening"
- Implement `onConflict` handler for that data
- Consider changing sync strategy
- Check backend version tracking

## Performance Tips

1. **Use specific cache keys** for different data types
2. **Set appropriate TTLs** to clean up old data
3. **Monitor storage usage** in DevTools
4. **Test on slow networks** to validate offline behavior
5. **Use Chrome DevTools** → Application tab → Cache Storage to debug

## Production Checklist

- [ ] Initialize cache system in app startup
- [ ] Replace cart state with `useCachedCart()`
- [ ] Replace customer form state with `useCachedCustomerDetails()`
- [ ] Add sync indicators to UI
- [ ] Add offline indicator
- [ ] Test offline → online workflow
- [ ] Test data recovery after refresh
- [ ] Test with multiple browser tabs
- [ ] Verify backend sync endpoints working
- [ ] Monitor storage usage for a week
