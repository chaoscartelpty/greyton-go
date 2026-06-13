import React, { useState } from "react";
import { Restaurant, Order, MenuItem } from "../types";
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, ShoppingBag, ClipboardList, Download, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GroceryPickListBuilderProps {
  restaurant: Restaurant;
  onBack: () => void;
  onSubmitOrder: (order: Order) => void;
}

interface ListItem {
  id: string;
  name: string;
  quantity: string;
  price?: string;
  description?: string;
}

const DEFAULT_POPULAR_GROCERY_ITEMS: MenuItem[] = [
  { name: "Fresh Bananas 1kg", description: "Ripe local sweet bananas", price: "R24.90" },
  { name: "Full Cream Milk 2L", description: "Freshly pasteurized creamy dairy milk", price: "R32.00" },
  { name: "White Sliced Bread 700g", description: "Freshly-baked day-to-day sandwich loaf", price: "R18.50" },
  { name: "Extra Large Eggs 18s", description: "Free-range farmhouse brown eggs", price: "R52.00" },
  { name: "Unsalted Butter 500g", description: "Rich churned dairy table butter", price: "R65.00" },
  { name: "White Sugar 2.5kg", description: "Fine select white granulated sugar", price: "R48.00" },
  { name: "Ceylon Black Tea 100s", description: "Rich tagless morning tea bags", price: "R42.90" },
  { name: "Instant Coffee Granules 200g", description: "Rich roast premium coffee blend", price: "R115.00" },
  { name: "Sunflower Cooking Oil 2L", description: "Pure sunflower cooking oil", price: "R75.00" },
  { name: "Fresh Potatoes 2kg pocket", description: "Locally sourced rustic cooking potatoes", price: "R39.95" },
  { name: "Spaghetti Pasta 500g", description: "Traditional durum wheat semolina pasta", price: "R17.50" },
  { name: "Baked Beans in Tomato 410g", description: "Premium canned slow-cooked haricot beans", price: "R14.95" },
  { name: "Cream Crackers 400g", description: "Crispy oven-baked salted crackers", price: "R29.90" },
  { name: "Fresh Apples 1.5kg bag", description: "Crisp red golden delicious apples", price: "R34.00" },
  { name: "Cheddar Cheese 400g", description: "Mild mature white cheddar block", price: "R59.95" }
];

export const GroceryPickListBuilder: React.FC<GroceryPickListBuilderProps> = ({
  restaurant,
  onBack,
  onSubmitOrder,
}) => {
  const isOkMiniMark = restaurant.name.toLowerCase().includes("ok mini") || restaurant.name.toLowerCase().includes("minimark") || restaurant.name.toLowerCase().includes("okmini") || restaurant.name.toLowerCase().includes("mini mark");

  const [items, setItems] = useState<ListItem[]>([
    { id: "1", name: "", quantity: "1" },
    { id: "2", name: "", quantity: "1" },
    { id: "3", name: "", quantity: "1" },
  ]);

  const [builderTab, setBuilderTab] = useState<"list" | "quick">("list");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"payshap" | "cash">("payshap");
  const [restaurantNotes, setRestaurantNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Load popular items from restaurant profile or default static fallback list
  const popularItems = restaurant.popularGroceryItems && restaurant.popularGroceryItems.length > 0 
    ? restaurant.popularGroceryItems 
    : DEFAULT_POPULAR_GROCERY_ITEMS;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString().slice(2, 6), name: "", quantity: "1" },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: "1", name: "", quantity: "1" }]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ListItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddPopularItem = (popularItem: MenuItem) => {
    const existing = items.find(it => it.name.trim().toLowerCase() === popularItem.name.trim().toLowerCase());
    if (existing) {
      const currentQty = parseInt(existing.quantity) || 1;
      handleItemChange(existing.id, "quantity", (currentQty + 1).toString());
    } else {
      const firstEmptyIdx = items.findIndex(it => it.name.trim() === "");
      if (firstEmptyIdx !== -1) {
        setItems(prev => prev.map((it, idx) => idx === firstEmptyIdx ? {
          ...it,
          name: popularItem.name,
          quantity: "1",
          price: popularItem.price,
          description: popularItem.description
        } : it));
      } else {
        setItems(prev => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            name: popularItem.name,
            quantity: "1",
            price: popularItem.price,
            description: popularItem.description
          }
        ]);
      }
    }
  };

  const handleExportCSVTemplate = () => {
    const csvContent = "\uFEFFItem Name,Description,Price\n" +
      "Fresh Bananas 1kg,Ripe local yellow bananas,R24.50\n" +
      "Full Cream Milk 2L,Local pasture-raised farm fresh milk,R32.00\n" +
      "White Sliced Bread,Soft fresh daily-baked sandwich bread,R19.95\n" +
      "Premium Ceylon Black Tea 100s,Tagless teabags rich blend,R45.00\n" +
      "Salted Farm Butter 500g,Creamy churned farm table butter,R65.00\n" +
      "Brown Eggs 18s,Extra large free-range farm eggs,R52.00\n";
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeName = restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `${safeName}_popular_groceries_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live estimated subtotals from known popular item prices
  const activeSelections = items.filter(it => it.name.trim() !== "");
  const estimatedSubtotal = activeSelections.reduce((sum, item) => {
    if (!item.price) return sum;
    const cleanPrice = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
    const qty = parseFloat(item.quantity) || 1;
    return sum + (cleanPrice * qty);
  }, 0);

  const estimatedDeliveryFee = 35;
  const estimatedCommission = isOkMiniMark ? 0 : (estimatedSubtotal * 0.15);
  const estimatedGrandTotal = estimatedSubtotal + estimatedDeliveryFee + estimatedCommission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.name.trim() !== "");
    if (validItems.length === 0) {
      alert("Please add at least one item to your grocery pick list.");
      return;
    }
    if (!customerEmail.trim()) {
      alert("Please provide a valid email address so we can email your proforma invoice.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const orderRef = `GL-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: orderRef,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: [],
        subtotal: estimatedSubtotal,
        deliveryFee: estimatedDeliveryFee,
        total: estimatedGrandTotal,
        commission: estimatedCommission,
        status: "pending",
        paymentMethod,
        restaurantNotes: restaurantNotes.trim() ? `Pick list notes: ${restaurantNotes}` : undefined,
        createdAt: new Date().toISOString(),
        isGrocery: true,
        groceryPickList: validItems.map(it => ({ 
          name: it.name.trim(), 
          quantity: it.quantity.trim(),
          price: it.price,
          description: it.description
        })),
        isProformaSent: false,
        customerEmail: customerEmail.trim(),
      };

      onSubmitOrder(newOrder);
      setSubmittedOrder(newOrder);
      setIsSubmitting(false);
    }, 1200);
  };

  if (submittedOrder) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 my-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-slate-800">List Submitted!</h2>
          <p className="text-slate-500 text-sm">
            Your custom grocery pick list has been generated and queued for our pickers.
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 divide-y divide-slate-200/60">
          <div className="pb-4 text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Order Reference
            </span>
            <span className="text-lg font-mono font-bold text-slate-800">{submittedOrder.id}</span>
          </div>
          <div className="py-4 text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Store Pick Location
            </span>
            <span className="text-sm font-semibold text-slate-800">{submittedOrder.restaurantName}</span>
          </div>
          <div className="pt-4 text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Notification Target
            </span>
            <span className="text-sm font-semibold text-emerald-600">{submittedOrder.customerEmail}</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 text-left space-y-3">
          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> What happens next?
          </h4>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1">
            <li>
              Our local village dispatcher heads into <strong className="text-slate-800">{submittedOrder.restaurantName}</strong>.
            </li>
            <li>
              We carefully hand-select all items on your list, replacing or skipping any unavailable products.
            </li>
            <li>
              We calculate actual shelf costs, compile a <strong>proforma invoice email</strong>, and send it to you.
            </li>
            <li>
              You make a secure digital payment via <strong>PayShap</strong>, and your groceries are delivered immediately!
            </li>
          </ol>
        </div>

        <button
          onClick={onBack}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
        >
          Return to Markets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Stores
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Grocery Tab & Pick List Inputs */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShoppingBag className="w-6 h-6 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase">Retail Grocery Service</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-800">
              {restaurant.name} List
            </h1>
            <p className="text-slate-500 text-sm">
              Use our quick popular items form below to easily select items, or type custom requests!
            </p>
          </div>

          {/* Builder Type Toggle Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setBuilderTab("list")}
              className={`flex-1 py-3 text-center rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                builderTab === "list"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> 📋 Custom list ({activeSelections.length})
            </button>
            <button
              type="button"
              onClick={() => setBuilderTab("quick")}
              className={`flex-1 py-3 text-center rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                builderTab === "quick"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> ⚡ Quick Selection Form
            </button>
          </div>

          {/* Toggle View Body */}
          {builderTab === "list" ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Grocery Item Description
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right pr-12">
                  Qty / Unit
                </span>
              </div>

              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-3 items-center overflow-hidden"
                  >
                    <span className="text-xs font-mono font-bold text-slate-300 w-4">
                      {index + 1}
                    </span>
                    
                    <div className="flex-1 flex gap-2 items-center relative">
                      <input
                        type="text"
                        required={index === 0}
                        placeholder="e.g. 2.5kg White Sugar, Bananas, Ceylon Tea"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm pr-20"
                      />
                      {item.price && (
                        <span className="absolute right-3 top-2.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg shrink-0">
                          {item.price}
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item to List
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60">
                <div>
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Popular Items Catalog</h3>
                  <p className="text-[11px] text-emerald-700/85 mt-0.5">Quickly select from the store's 30 most popular items with pre-filled pricing.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSVTemplate}
                  title="Export popular items CSV template"
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {popularItems.map((prod, idx) => {
                  const alreadySelected = items.find(it => it.name.trim().toLowerCase() === prod.name.trim().toLowerCase());
                  const qtyText = alreadySelected ? ` (${alreadySelected.quantity} selected)` : "";
                  
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleAddPopularItem(prod)}
                      className={`p-3 border rounded-2xl text-left cursor-pointer transition-all duration-200 flex justify-between items-center group ${
                        alreadySelected 
                          ? "border-emerald-500 bg-emerald-50/40 shadow-sm" 
                          : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-sm text-slate-800 leading-snug">{prod.name}</span>
                          {alreadySelected && (
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold">
                              {alreadySelected.quantity}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-1 mt-0.5 group-hover:text-slate-500">{prod.description || "Fresh grocery item"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block font-bold text-xs text-emerald-700">{prod.price}</span>
                        <span className="text-[10px] text-slate-400 font-medium group-hover:text-emerald-600">
                          {alreadySelected ? "+ Add More" : "+ Quick Add"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer fields */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4 font-serif">Delivery & Payment Contacts</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lucy Blue"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 072 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Email Address (For Proforma Invoice)
                </label>
                <input
                  type="email"
                  required
                  placeholder="chef.lucy.blue@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Village Delivery Address
                </label>
                <textarea
                  required
                  placeholder="e.g. 15 Main Road, Greyton"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm h-20 resize-none"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Delivery Notes / Alternatives (Optional)
                </label>
                <textarea
                  placeholder="e.g. If white bread is out of stock, brown bread is fine."
                  value={restaurantNotes}
                  onChange={(e) => setRestaurantNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm h-20 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Pick Order...
                </>
              ) : (
                "Submit Pick List & Request Proforma"
              )}
            </button>
          </div>
        </form>

        {/* Right Info pane */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-slate-800">Estimated Live Cost</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Based on the pre-filled prices of selected popular items, here is an approximation of your bill.
            </p>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium pb-1.5 border-b border-slate-200/60">
                <span>Estimated Subtotal</span>
                <span className="font-semibold text-slate-800">R {estimatedSubtotal.toFixed(2)}</span>
              </div>
              {!isOkMiniMark && (
                <div className="flex justify-between text-slate-600 font-medium pb-1.5 border-b border-slate-200/60">
                  <span>Service Commission (15%)</span>
                  <span className="font-semibold text-emerald-600">R {estimatedCommission.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 font-medium pb-1.5 border-b border-slate-200/60">
                <span>Flat Delivery Fee</span>
                <span className="font-semibold text-slate-800">R {estimatedDeliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold text-sm pt-1">
                <span>Estimated Total Due</span>
                <span className="text-emerald-700">R {estimatedGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed shadow-sm">
              💡 <strong>Instant payment required:</strong> Out of stock items are skipped entirely. You receive a final compiled bill, and pay instantly via PayShap to launch delivery.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
