# Integration Example: From App.tsx

## Before (Current Code)

```typescript
const App = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const addToCart = (item: CartItem) => {
    setCart([...cart, item]);
  };

  // Problem: If page refreshes or crashes, cart is lost!
  // Problem: Form fields are lost if browser crashes
};
```

## After (With Cache System)

```typescript
import { useCachedCart, useCachedCustomerDetails } from './lib/usePersistentState';
import { SyncStatusIndicator, OfflineIndicator } from './components/CacheIndicators';

const App = () => {
  // Replace useState with useCachedCart
  const { cart, addToCart, removeFromCart } = useCachedCart();
  
  // Replace useState with useCachedCustomerDetails
  const { details: customerDetails, setDetails: setCustomerDetails } = useCachedCustomerDetails();

  // Benefits:
  // ✓ Cart automatically saved to localStorage
  // ✓ Cart survives page refresh
  // ✓ Cart works offline
  // ✓ Cart syncs to server when online
  // ✓ Customer details auto-saved too
  // ✓ Conflicts resolved automatically

  return (
    <>
      <OfflineIndicator />
      <header>
        <SyncStatusIndicator />
      </header>
      
      {/* Everything else works the same way */}
      <ShoppingCart 
        items={cart}
        onAddItem={addToCart}
      />
      
      <CheckoutForm 
        details={customerDetails}
        onDetailsChange={setCustomerDetails}
      />
    </>
  );
};
```

## Complete Integration Example

```typescript
// src/App.tsx

import React, { useState, useEffect } from "react";
import { initializeCacheSystem } from "./lib/initializeCache";
import { useCachedCart, useCachedCustomerDetails } from "./lib/usePersistentState";
import { SyncStatusIndicator, OfflineIndicator } from "./components/CacheIndicators";
import RestaurantView from "./components/RestaurantView";
import CheckoutView from "./components/CheckoutView";

type ViewState = "home" | "menu" | "checkout" | "confirmation";

function App() {
  // Initialize cache system on first load
  useEffect(() => {
    initializeCacheSystem();
  }, []);

  // Use cached cart instead of useState
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartItem, 
    clearCart,
    synced: cartSynced 
  } = useCachedCart();

  // Use cached customer details instead of useState
  const { 
    details: customerDetails, 
    setDetails: setCustomerDetails,
    synced: detailsSynced 
  } = useCachedCustomerDetails();

  const [view, setView] = useState<ViewState>("home");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    if (!customerDetails.email) {
      alert("Please enter your email");
      return;
    }

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: customerDetails,
          cart,
          total: calculateTotal()
        })
      });

      if (response.ok) {
        clearCart();
        setView("confirmation");
      }
    } catch (error) {
      console.error("Order failed:", error);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show offline indicator when needed */}
      <OfflineIndicator />

      {/* Show sync status in header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Greyton Go</h1>
          <SyncStatusIndicator />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === "home" && (
          <RestaurantView 
            onSelectRestaurant={(id) => {
              setSelectedRestaurant(id);
              setView("menu");
            }}
          />
        )}

        {view === "menu" && (
          <>
            <button 
              onClick={() => setView("home")}
              className="mb-4 px-4 py-2 bg-gray-200 rounded"
            >
              ← Back
            </button>

            {/* Cart shows sync status */}
            <div className="mb-4 p-4 bg-white rounded shadow">
              <h2 className="text-xl font-bold mb-2">
                Your Cart ({cart.length} items)
                <span className={`ml-2 text-sm ${cartSynced ? 'text-green-600' : 'text-amber-600'}`}>
                  {cartSynced ? '✓' : '⏳'}
                </span>
              </h2>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between p-2 border-b">
                  <span>{item.menuItem.name} x {item.quantity}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Customer details auto-save */}
            <div className="mb-4 p-4 bg-white rounded shadow">
              <h2 className="text-xl font-bold mb-2">
                Delivery Details
                <span className={`ml-2 text-sm ${detailsSynced ? 'text-green-600' : 'text-amber-600'}`}>
                  {detailsSynced ? '✓ Saved' : '⏳ Saving'}
                </span>
              </h2>
              <input
                type="text"
                placeholder="Name"
                value={customerDetails.name}
                onChange={(e) => setCustomerDetails({
                  ...customerDetails,
                  name: e.target.value
                })}
                className="w-full p-2 mb-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={customerDetails.email}
                onChange={(e) => setCustomerDetails({
                  ...customerDetails,
                  email: e.target.value
                })}
                className="w-full p-2 mb-2 border rounded"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={customerDetails.phone}
                onChange={(e) => setCustomerDetails({
                  ...customerDetails,
                  phone: e.target.value
                })}
                className="w-full p-2 mb-2 border rounded"
              />
              <textarea
                placeholder="Delivery address"
                value={customerDetails.address}
                onChange={(e) => setCustomerDetails({
                  ...customerDetails,
                  address: e.target.value
                })}
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={() => setView("checkout")}
              className="px-6 py-3 bg-blue-600 text-white rounded font-bold"
            >
              Proceed to Checkout
            </button>
          </>
        )}

        {view === "checkout" && (
          <CheckoutView
            cart={cart}
            total={calculateTotal()}
            customerDetails={customerDetails}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => setView("menu")}
          />
        )}

        {view === "confirmation" && (
          <div className="text-center p-8 bg-white rounded shadow">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Order Placed Successfully! ✓
            </h2>
            <p className="mb-4">Your order has been placed and your cart has been cleared.</p>
            <button
              onClick={() => {
                setView("home");
                setSelectedRestaurant(null);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded font-bold"
            >
              Back to Restaurants
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

## Key Changes

| Before | After | Benefit |
|--------|-------|---------|
| `useState([]` | `useCachedCart()` | Auto-saves & recovers |
| `useState({...})` | `useCachedCustomerDetails()` | Never loses form data |
| Manual state management | Automatic sync | Less code, more reliable |
| No offline support | Works offline | Better UX |
| Data lost on refresh | Data persists | No more lost orders |

## Testing Checklist

```
✓ Fill cart
✓ Refresh page
✓ Cart is still there

✓ Fill customer form
✓ Close browser tab
✓ Open same URL
✓ Form data is still there

✓ Go offline (DevTools)
✓ Make changes
✓ All changes saved locally
✓ Go online
✓ See "Syncing..." then "✓ Saved"

✓ Open site in 2 tabs
✓ Add item in tab 1
✓ See it appear in tab 2 automatically
```

## Common Questions

**Q: Do I need to change everything?**
A: No! Start with cart and customer form. Add more data types as needed.

**Q: What if I have existing cache logic?**
A: The new system is compatible. It just adds more features to what's there.

**Q: Does this work on mobile?**
A: Yes! iOS Safari has some limitations (no background sync), but localStorage works fine.

**Q: What about data privacy?**
A: All data stored locally. Nothing leaves the device until sent to server. Use HTTPS in production.
