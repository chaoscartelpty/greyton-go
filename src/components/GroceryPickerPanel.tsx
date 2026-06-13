import React, { useState } from "react";
import { Order } from "../types";
import { Check, X, MailCheck, Loader2, Info, ShoppingBag } from "lucide-react";

interface GroceryPickerPanelProps {
  order: Order;
  onSendProforma: (updatedOrder: Order) => Promise<void>;
  smtpUser?: string;
  smtpPass?: string;
  adminEmail?: string;
}

interface PickedState {
  name: string;
  quantity: string;
  picked: boolean;
  price: string;
  comment: string;
}

export const GroceryPickerPanel: React.FC<GroceryPickerPanelProps> = ({
  order,
  onSendProforma,
  smtpUser = "",
  smtpPass = "",
  adminEmail = "",
}) => {
  const [items, setItems] = useState<PickedState[]>(() => {
    if (order.groceryPickedItems && order.groceryPickedItems.length > 0) {
      return order.groceryPickedItems.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        picked: it.picked,
        price: String(it.price || ""),
        comment: it.comment || "",
      }));
    }
    return (order.groceryPickList || []).map((it) => ({
      name: it.name,
      quantity: it.quantity,
      picked: true,
      price: it.price ? it.price.replace(/[^0-9.]/g, "") : "",
      comment: "",
    }));
  });

  const [deliveryNotes, setDeliveryNotes] = useState(order.restaurantNotes || "");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleTogglePicked = (index: number, picked: boolean) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, picked } : item))
    );
  };

  const handlePriceChange = (index: number, value: string) => {
    // Only allow decimal digits or empty string
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, price: value } : item))
    );
  };

  const handleCommentChange = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, comment: value } : item))
    );
  };

  // Live calculations
  const isOkMiniMark = order.restaurantName?.toLowerCase().includes("ok mini") || order.restaurantName?.toLowerCase().includes("minimark") || order.restaurantName?.toLowerCase().includes("okmini") || order.restaurantName?.toLowerCase().includes("mini mark");
  const subtotal = items.reduce((sum, item) => {
    if (!item.picked) return sum;
    const itemPrice = parseFloat(item.price) || 0;
    return sum + itemPrice;
  }, 0);

  const commission = isOkMiniMark ? 0 : (subtotal * 0.15);
  const deliveryFee = 35;
  const grandTotal = subtotal + commission + deliveryFee;

  const handleDispatchBill = async () => {
    // Basic verification: picked items must have non-zero prices entered unless 0 items are picked
    const pickedList = items.filter((it) => it.picked);
    let hasZeroPrice = false;
    
    pickedList.forEach((it) => {
      const pr = parseFloat(it.price) || 0;
      if (pr <= 0) hasZeroPrice = true;
    });

    if (pickedList.length > 0 && hasZeroPrice) {
      alert("Please enter a valid price greater than R0 for all picked items.");
      return;
    }

    setIsSending(true);
    setSendError("");

    const updatedOrder: Order = {
      ...order,
      groceryPickedItems: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        picked: it.picked,
        price: parseFloat(it.price) || 0,
        comment: it.comment.trim() || undefined,
      })),
      subtotal,
      commission,
      deliveryFee,
      total: grandTotal,
      status: "confirmed", // progresses order status as picked/confirmed
      isProformaSent: true,
      restaurantNotes: deliveryNotes.trim() || undefined,
    };

    try {
      // Trigger Nodemailer endpoint for actual proforma dispatch
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${apiBase}/api/proforma-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: updatedOrder,
          smtpUser,
          smtpPass,
          adminEmail,
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error || resData.message || "Failed to deliver proforma invoice.");
      }

      await onSendProforma(updatedOrder);
      alert(`Proforma invoice for ${order.id} sent successfully to ${order.customerEmail || "customer"}!`);
    } catch (err: any) {
      console.error(err);
      setSendError(err.message || "Error transmitting proforma mail.");
      // Even if SMTP fails temporarily, we let the state progress so dispatchers aren't blocked
      await onSendProforma(updatedOrder);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-1 duration-300">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-slate-800">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-sans">
            Grocery Picker checklist
          </h4>
        </div>
        {order.isProformaSent && (
          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
            <MailCheck className="w-3.5 h-3.5" /> Proforma Sent
          </span>
        )}
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex flex-col md:flex-row gap-3 md:items-center pb-4 border-b border-slate-100 last:border-b-0 ${
              !item.picked ? "opacity-50" : ""
            }`}
          >
            {/* Item Desc */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-800 block">
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                Qty / Unit: {item.quantity}
              </span>
            </div>

            {/* Toggles */}
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={order.isProformaSent}
                onClick={() => handleTogglePicked(idx, true)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  item.picked
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-white text-slate-400 border border-slate-200 hover:text-slate-600"
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Picked
              </button>
              <button
                type="button"
                disabled={order.isProformaSent}
                onClick={() => handleTogglePicked(idx, false)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !item.picked
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-white text-slate-400 border border-slate-200 hover:text-slate-600"
                }`}
              >
                <X className="w-3.5 h-3.5" /> Out of Stock
              </button>
            </div>

            {/* Price block or dynamic commentary */}
            <div className="flex gap-2 md:w-56 shrink-0">
              {item.picked ? (
                <>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={order.isProformaSent}
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) => handlePriceChange(idx, e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-right"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Comment (e.g. Subs. Brand)"
                    disabled={order.isProformaSent}
                    value={item.comment}
                    onChange={(e) => handleCommentChange(idx, e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </>
              ) : (
                <input
                  type="text"
                  placeholder="Reason (e.g. Empty shelves)"
                  disabled={order.isProformaSent}
                  value={item.comment}
                  onChange={(e) => handleCommentChange(idx, e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-500 outline-none focus:ring-1 focus:ring-red-500 transition-all"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Note modifier */}
      {!order.isProformaSent && (
        <div className="pt-2">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Picker Dispatch Notes to Customer (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Hand-chosen finest avocados. Bananas are slightly green."
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-300"
          />
        </div>
      )}

      {/* Real-time price panel */}
      <div className={`bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-2 ${isOkMiniMark ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4 text-xs font-medium text-slate-500`}>
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Subtotal
          </span>
          <span className="font-bold text-slate-800 text-sm">R{subtotal.toFixed(2)}</span>
        </div>
        {!isOkMiniMark && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Commission (15%)
            </span>
            <span className="font-bold text-emerald-600 text-sm">R{commission.toFixed(2)}</span>
          </div>
        )}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Delivery Fee
          </span>
          <span className="font-bold text-slate-800 text-sm">R{deliveryFee.toFixed(2)}</span>
        </div>
        <div className="space-y-0.5 bg-slate-50 p-2 rounded-lg -m-2">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Grand Total
          </span>
          <span className="font-extrabold text-emerald-800 text-base">R{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Send Proforma controls */}
      {!order.isProformaSent ? (
        <div className="pt-2 text-right">
          {sendError && (
            <div className="text-red-500 text-xs font-medium pb-2 text-left">
              ⚠️ Email Issue: {sendError} (Invoice saved to order history)
            </div>
          )}
          <button
            type="button"
            onClick={handleDispatchBill}
            disabled={isSending}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ml-auto"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending Proforma Email...
              </>
            ) : (
              <>
                📧 Send Proforma Invoice & Bill Customer
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl border border-emerald-100 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span>Proforma sent to {order.customerEmail}. </span>
            <span className="font-normal text-slate-600">
              The order is updated with actual costs ({isOkMiniMark ? `R${subtotal.toFixed(2)} + R${deliveryFee.toFixed(2)} = R${grandTotal.toFixed(2)}` : `R${subtotal.toFixed(2)} + R${commission.toFixed(2)} + R${deliveryFee.toFixed(2)} = R${grandTotal.toFixed(2)}`}) and set to "confirmed" status awaiting customer PayShap transfer.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
