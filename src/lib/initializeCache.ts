/**
 * Initialize caching system and service worker
 * Call this in your app initialization (index.tsx)
 */

export async function initializeCacheSystem() {
  // Set global API base URL for sync service
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  (window as any).__VITE_API_BASE_URL__ = apiBaseUrl;

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✓ Service Worker registered successfully');

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('✓ Service Worker updated');
              // Optionally prompt user to reload
              notifyUserOfUpdate();
            }
          });
        }
      });
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }

  // Set up periodic sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-data');
      console.log('✓ Background sync registered');
    } catch (error) {
      console.log('Background sync not available:', error);
    }
  }

  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('✓ Back online - syncing cached data');
    notifyUserOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    console.log('⚠ Offline - changes will be cached');
    notifyUserOnlineStatus(false);
  });

  console.log('✓ Cache system initialized');
}

function notifyUserOfUpdate() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0f172a;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
  `;
  notification.innerHTML = `
    <div style="margin-bottom: 12px;">App update available!</div>
    <button onclick="window.location.reload()" style="
      background: #10b981;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    ">Reload</button>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 10000);
}

function notifyUserOnlineStatus(isOnline: boolean) {
  const existing = document.getElementById('online-status-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'online-status-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px;
    text-align: center;
    background: ${isOnline ? '#10b981' : '#ef4444'};
    color: white;
    font-size: 12px;
    font-weight: 500;
    z-index: 9998;
  `;
  indicator.textContent = isOnline ? '✓ Back online' : '⚠ No connection - working offline';

  document.body.appendChild(indicator);

  if (isOnline) {
    setTimeout(() => indicator.remove(), 3000);
  }
}
