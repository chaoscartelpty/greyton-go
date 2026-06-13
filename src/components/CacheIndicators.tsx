import React from 'react';
import { useSyncStatus, useCachedCart, useCachedCustomerDetails } from '../lib/usePersistentState';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * SyncStatusIndicator - Shows real-time cache sync status
 * Place this in your header/footer to keep users informed
 */
export function SyncStatusIndicator() {
  const { isSyncing, pendingCount } = useSyncStatus();

  if (!isSyncing && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle2 size={16} />
        <span>All changes saved</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-blue-600 text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-amber-600 text-sm">
      <AlertCircle size={16} />
      <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending</span>
    </div>
  );
}

/**
 * CachedCartPreview - Shows cart with sync status
 */
export function CachedCartPreview() {
  const { cart, removeFromCart, synced } = useCachedCart();
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Cart Items: {itemCount}</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          synced 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {synced ? '✓ Saved' : '⏳ Saving'}
        </span>
      </div>

      {cart.length === 0 ? (
        <p className="text-gray-500 text-sm">Cart is empty</p>
      ) : (
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span>{item.name} x {item.quantity}</span>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CachedCustomerForm - Customer details with auto-save
 */
export function CachedCustomerForm() {
  const { details, setDetails, synced } = useCachedCustomerDetails();

  return (
    <form className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Delivery Details</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          synced 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {synced ? '✓ Saved' : '⏳ Saving'}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={details.name}
          onChange={(e) => setDetails({ ...details, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={details.email}
          onChange={(e) => setDetails({ ...details, email: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          type="tel"
          value={details.phone}
          onChange={(e) => setDetails({ ...details, phone: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="27..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Delivery Address</label>
        <textarea
          value={details.address}
          onChange={(e) => setDetails({ ...details, address: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Street address..."
          rows={3}
        />
      </div>

      <p className="text-xs text-gray-500">
        💾 Your information is saved automatically and will be recovered if your browser closes unexpectedly.
      </p>
    </form>
  );
}

/**
 * OfflineIndicator - Shows when user is offline
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
      <AlertCircle size={18} />
      <span>
        You're offline. Your changes are being saved locally and will sync when you're back online.
      </span>
    </div>
  );
}
