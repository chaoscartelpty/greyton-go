import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Utensils,
  ArrowLeft,
  Sun,
  Beer,
  Martini,
  Pizza,
  CakeSlice,
  Wine,
  CheckCircle,
  LogOut,
  Save,
  ShoppingBag,
  CalendarDays,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  Edit3,
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  LayoutGrid,
  Palette,
  MessageSquare,
  User,
  Mail,
  Phone,
  ExternalLink,
  CreditCard,
  FileText,
  ShieldCheck,
  MailCheck,
  UserPlus,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Settings,
  Bike,
  Truck,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { restaurants as initialRestaurants } from "./data.ts";
import { MenuSection, MenuItem, SubSection, Restaurant } from "./types.ts";
import { GroceryPickListBuilder } from "./components/GroceryPickListBuilder.tsx";
import { GroceryPickerPanel } from "./components/GroceryPickerPanel.tsx";
import { cache } from "./lib/cache";
import { seedIfEmpty, saveRestaurants } from "./lib/firestoreService";
import chaosLogo from "./assets/images/chaos_logo_1780832612157.png";

// --- Types & Enums for View State ---
type ViewState =
  | "restaurant-selection"
  | "restaurant-landing"
  | "dashboard"
  | "detail"
  | "full-menu"
  | "collection-menu"
  | "login"
  | "driver-login"
  | "backoffice";

interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: { label: string; price: string };
  selectedExtras: { label: string; price: string }[];
  selectedModifiers: Record<string, string>;
  specialInstructions: string;
  totalPrice: number;
  restaurantId?: string;
  restaurantName?: string;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const INITIAL_MODIFIER_DEFS: Record<string, string[]> = {
  Temperature: [
    "Bleu",
    "Rare",
    "Medium Rare",
    "Medium",
    "Medium Well",
    "Well Done",
  ],
  "Select Sauce": [
    "Pepper",
    "Mushroom",
    "Cheese",
    "Chimichurri",
    "Garlic Butter",
    "Peri-Peri",
    "Garlic Sauce",
  ],
  "Select Patty": ["Beef", "Chicken"],
  "Egg Style": ["Fried", "Scrambled", "Poached"],
  "Egg Doneness": ["Soft", "Medium", "Hard"],
};

const parsePrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
};

const formatPrice = (amount: number): string => `R${amount}`;

const AdminLogo: React.FC<{ size?: "sm" | "lg" }> = ({ size = "lg" }) => (
  <div className="flex items-center gap-3 select-none">
    <div className="flex flex-col">
      <span
        className={`font-serif font-bold text-slate-800 leading-none ${size === "lg" ? "text-2xl" : "text-xl"}`}
      >
        Greyton Go
      </span>
      <span className="text-[10px] font-extrabold tracking-[0.2em] text-lucy-600 uppercase mt-1">
        Delivery Admin
      </span>
    </div>
  </div>
);

const BackgroundSlideshow: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
    </div>
  );
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const uploadImage = async (file: File): Promise<string> => {
  const base64Data = await fileToDataUrl(file);
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: base64Data }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload image.");
  }

  const data = await response.json();
  return data.url;
};

const ImageUpload: React.FC<{
  onUpload: (url: string) => void;
  currentImage?: string;
  label?: string;
}> = ({ onUpload, currentImage, label }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="flex items-center gap-4">
        <label
          className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading ? "bg-slate-50 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 hover:border-lucy-600 hover:bg-lucy-50"}`}
        >
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
            accept="image/*"
          />
          {isUploading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-bold">Uploading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <Upload className="w-5 h-5" />
              <span className="text-sm font-bold">Upload Photo</span>
            </div>
          )}
        </label>
        {currentImage && (
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <img
              src={currentImage}
              alt="Preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
    </div>
  );
};

const EditItemModal: React.FC<{
  item: MenuItem;
  modifierDefs: Record<string, string[]>;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  onCreateModifierDef: (name: string) => void;
}> = ({ item, modifierDefs, onSave, onCancel, onCreateModifierDef }) => {
  const [formData, setFormData] = useState<MenuItem>({
    ...item,
    extras: item.extras ? [...item.extras] : [],
    modifiers: item.modifiers ? [...item.modifiers] : [],
    variants: item.variants ? [...item.variants] : [],
  });
  const suggestedModifiers = useMemo(
    () => [...Object.keys(modifierDefs), "Burger Extras", "Pizza Toppings"],
    [modifierDefs],
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [newModifier, setNewModifier] = useState("");

  const addModifier = () => {
    const trimmedMod = newModifier.trim();
    if (trimmedMod && !formData.modifiers?.includes(trimmedMod)) {
      if (
        !modifierDefs[trimmedMod] &&
        !["Burger Extras", "Pizza Toppings"].includes(trimmedMod)
      ) {
        onCreateModifierDef(trimmedMod);
      }
      setFormData((prev) => ({
        ...prev,
        modifiers: [...(prev.modifiers || []), trimmedMod],
      }));
      setNewModifier("");
    }
  };

  const removeModifier = (mod: string) =>
    setFormData((prev) => ({
      ...prev,
      modifiers: (prev.modifiers || []).filter((m) => m !== mod),
    }));

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { label: "", price: "" }],
    }));
  };

  const updateVariant = (
    idx: number,
    field: "label" | "price",
    value: string,
  ) => {
    setFormData((prev) => {
      const newVariants = [...(prev.variants || [])];
      newVariants[idx] = { ...newVariants[idx], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const removeVariant = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== idx),
    }));
  };

  const addExtra = () => {
    setFormData((prev) => ({
      ...prev,
      extras: [...(prev.extras || []), { label: "", price: "" }],
    }));
  };

  const updateExtra = (
    idx: number,
    field: "label" | "price",
    value: string,
  ) => {
    setFormData((prev) => {
      const newExtras = [...(prev.extras || [])];
      newExtras[idx] = { ...newExtras[idx], [field]: value };
      return { ...prev, extras: newExtras };
    });
  };

  const removeExtra = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      extras: (prev.extras || []).filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <h2 className="font-serif text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-lucy-700" /> Edit Item
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Item Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-lucy-600 outline-none font-bold text-slate-800 text-base"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-lucy-600 outline-none text-slate-600 text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Base Price
              </label>
              <input
                type="text"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-lucy-600 outline-none font-bold text-emerald-700 text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl bg-stone-50 cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={formData.availableForDelivery !== false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      availableForDelivery: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-lucy-600 rounded"
                />
                <span className="text-sm font-bold text-slate-700">
                  Available for Order
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Admin Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code || ""}
                onChange={handleInputChange}
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-lucy-600 outline-none text-slate-600 text-base"
                placeholder="e.g. B101"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Item Image URL
              </label>
              <div className="space-y-4">
                <input
                  type="text"
                  name="image"
                  value={formData.image || ""}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-lucy-600 outline-none text-slate-600 text-sm"
                  placeholder="https://images.unsplash.com/..."
                />
                <ImageUpload
                  onUpload={(url) =>
                    setFormData((prev) => ({ ...prev, image: url }))
                  }
                  currentImage={formData.image}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-8">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Variants / Sizes
              </label>
              <button
                onClick={addVariant}
                className="text-lucy-700 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            <div className="space-y-3">
              {(formData.variants || []).map((v, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={v.label}
                    onChange={(e) =>
                      updateVariant(idx, "label", e.target.value)
                    }
                    placeholder="Label (e.g. Large)"
                    className="flex-1 p-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={v.price}
                    onChange={(e) =>
                      updateVariant(idx, "price", e.target.value)
                    }
                    placeholder="Price (e.g. R150)"
                    className="w-32 p-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeVariant(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(formData.variants || []).length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  No variants defined.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-stone-100 pt-8">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Extras / Add-ons
              </label>
              <button
                onClick={addExtra}
                className="text-lucy-700 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Extra
              </button>
            </div>
            <div className="space-y-3">
              {(formData.extras || []).map((ex, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={ex.label}
                    onChange={(e) => updateExtra(idx, "label", e.target.value)}
                    placeholder="Label (e.g. Extra Cheese)"
                    className="flex-1 p-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={ex.price}
                    onChange={(e) => updateExtra(idx, "price", e.target.value)}
                    placeholder="Price (e.g. R20)"
                    className="w-32 p-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeExtra(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(formData.extras || []).length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  No extras defined.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-stone-100 pt-8">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Super Modifiers
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                list="mod-list"
                value={newModifier}
                onChange={(e) => setNewModifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addModifier()}
                className="flex-1 p-2 border border-stone-200 rounded-lg text-sm"
                placeholder="Search or create..."
              />
              <datalist id="mod-list">
                {suggestedModifiers.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <button
                onClick={addModifier}
                className="p-2 bg-lucy-800 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {(formData.modifiers || []).map((mod) => (
                <span
                  key={mod}
                  className="bg-lucy-50 text-lucy-800 px-3 py-1 rounded-full text-xs font-bold border border-lucy-100 flex items-center gap-2"
                >
                  {mod}{" "}
                  <button onClick={() => removeModifier(mod)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-slate-500 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-8 py-2 bg-lucy-800 text-white rounded-xl font-bold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const ModifierGroupEditor: React.FC<{
  groupKey: string;
  options: string[];
  onAddOption: (opt: string) => void;
  onRemoveOption: (opt: string) => void;
  onDeleteGroup: () => void;
}> = ({ groupKey, options, onAddOption, onRemoveOption, onDeleteGroup }) => {
  const [newOption, setNewOption] = useState("");
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
        <h4 className="font-bold text-slate-800">{groupKey}</h4>
        <button
          onClick={onDeleteGroup}
          className="text-slate-300 hover:text-red-500 transition-colors p-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <span
              key={opt}
              className="px-2 py-1 bg-stone-100 rounded text-xs font-bold flex items-center gap-2"
            >
              {opt}{" "}
              <button onClick={() => onRemoveOption(opt)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (onAddOption(newOption), setNewOption(""))
            }
            placeholder="Add option..."
            className="flex-1 p-2 border border-stone-200 rounded-lg text-sm"
          />
          <button
            onClick={() => {
              onAddOption(newOption);
              setNewOption("");
            }}
            className="bg-slate-800 text-white px-4 rounded-lg font-bold text-xs"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  onSuccess: (order: Order) => void;
  restaurantName: string;
  restaurantId: string;
}> = ({
  isOpen,
  onClose,
  cart,
  total,
  onSuccess,
  restaurantName,
  restaurantId,
}) => {
  const [details, setDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "payshap">(
    "cash",
  );

  // Reset success state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const useManual = localStorage.getItem("use_manual_smtp") === "true";
      const smtpUser = useManual ? (localStorage.getItem("manual_smtp_user") || "") : "";
      const smtpPass = useManual ? (localStorage.getItem("manual_smtp_pass") || "") : "";
      const adminEmail = localStorage.getItem("admin_notification_email") || "";

      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${apiBase}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details,
          cart,
          subtotal: total,
          deliveryFee: 35,
          total: total + 35,
          paymentMethod,
          restaurantName,
          smtpUser,
          smtpPass,
          adminEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const ref = data.orderId || `GG-${Date.now().toString().slice(-6)}`;
        setOrderRef(ref);

        const subtotal = total;
        const isOkMiniMark = restaurantName?.toLowerCase().includes("ok mini") || restaurantName?.toLowerCase().includes("minimark") || restaurantName?.toLowerCase().includes("okmini") || restaurantName?.toLowerCase().includes("mini mark");
        const commission = isOkMiniMark ? 0 : subtotal * 0.15;
        const deliveryFee = 35; // R35 delivery fee

        const newOrder: Order = {
          id: ref,
          restaurantId,
          restaurantName,
          customerName: details.name,
          customerPhone: details.phone,
          customerAddress: details.address,
          items: cart.map((item) => ({
            name: item.menuItem.name,
            price: item.totalPrice / item.quantity,
            quantity: item.quantity,
          })),
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          commission,
          paymentMethod,
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        setIsSuccess(true);
        onSuccess(newOrder);
      } else {
        throw new Error("Server error");
      }
    } catch (error) {
      console.error("Order error:", error);
      alert(
        "Error sending order to the kitchen. Please try again or call us directly.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-slate-800">
              Order Received!
            </h3>
            <p className="text-slate-500 text-sm">
              Your order{" "}
              <span className="font-mono font-bold text-slate-800">
                {orderRef}
              </span>{" "}
              has been placed successfully.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center gap-3 text-emerald-700">
              <MailCheck className="w-5 h-5" />
              <p className="text-xs font-bold">
                Emails sent to Greyton Go & {restaurantName}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              The restaurant will now review your order. Once they confirm,
              we'll allocate a driver to collect your food.
            </p>
          </div>
          <div className="p-4 bg-lucy-50 rounded-2xl border border-lucy-100 space-y-2 text-left">
            <p className="text-xs font-bold text-lucy-800">
              Payment Method:{" "}
              {paymentMethod === "payshap" ? "PayShap" : "Cash on Delivery"}
            </p>
            {paymentMethod === "payshap" && (
              <div className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-lucy-200 space-y-1">
                <p>
                  <strong>Cell Number:</strong> 072996050
                </p>
                <p>
                  <strong>Registered Alias:</strong> Chaos Catering
                </p>
                <p className="text-[10px] text-lucy-700 font-medium italic">
                  Please make the transfer using these details before delivery.
                </p>
              </div>
            )}
            {paymentMethod === "cash" && (
              <p className="text-[11px] text-slate-500 font-normal italic">
                Please prepare to pay in cash upon delivery.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              onClose();
            }}
            className="w-full bg-lucy-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-lucy-900/20 hover:bg-lucy-800 active:scale-[0.98] transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {!isSuccess ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-slate-800">
                Finalise Order
              </h2>
              <button
                onClick={() => {
                  onClose();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lucy-600 outline-none transition-all text-base"
                    value={details.name}
                    onChange={(e) =>
                      setDetails({ ...details, name: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lucy-600 outline-none transition-all text-base"
                    value={details.email}
                    onChange={(e) =>
                      setDetails({ ...details, email: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lucy-600 outline-none transition-all text-base"
                    value={details.phone}
                    onChange={(e) =>
                      setDetails({ ...details, phone: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Delivery Address"
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lucy-600 outline-none transition-all text-base"
                    value={details.address}
                    onChange={(e) =>
                      setDetails({ ...details, address: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Payment Selector */}
              <div className="space-y-3 pt-2 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Payment Options
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cash Option */}
                  <label
                    className={`p-4 rounded-xl border-2 flex flex-col justify-between items-start cursor-pointer transition-all h-28 relative ${paymentMethod === "cash" ? "border-lucy-800 bg-lucy-50" : "border-stone-200 bg-stone-50/50 hover:bg-stone-50"}`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      className="absolute top-4 right-4 text-lucy-800 focus:ring-lucy-600"
                    />
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-800" />
                      <span className="font-bold text-sm text-slate-800">
                        Cash on Delivery
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-snug">
                      Pay cash upon delivery.
                    </span>
                  </label>

                  {/* PayShap Option */}
                  <label
                    className={`p-4 rounded-xl border-2 flex flex-col justify-between items-start cursor-pointer transition-all h-28 relative ${paymentMethod === "payshap" ? "border-lucy-800 bg-lucy-50" : "border-stone-200 bg-stone-50/50 hover:bg-stone-50"}`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "payshap"}
                      onChange={() => setPaymentMethod("payshap")}
                      className="absolute top-4 right-4 text-lucy-800 focus:ring-lucy-600"
                    />
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-800" />
                      <span className="font-bold text-sm text-slate-800">
                        PayShap
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-snug">
                      Cell: 072996050
                    </span>
                  </label>
                </div>

                {paymentMethod === "payshap" && (
                  <div className="p-3 bg-lucy-50 rounded-xl border border-lucy-100 text-[11px] space-y-1 text-slate-600">
                    <p className="font-bold text-lucy-800">
                      PayShap Beneficiary Details:
                    </p>
                    <p>
                      Cell Number:{" "}
                      <strong className="text-slate-800 font-mono">
                        072996050
                      </strong>
                    </p>
                    <p>
                      Registered Name / Alias:{" "}
                      <strong className="text-slate-800">Chaos Catering</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-lucy-50 p-5 rounded-2xl border border-lucy-100 text-left space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Village Delivery Fee</span>
                  <span>{formatPrice(35)}</span>
                </div>
                <div className="h-px bg-slate-200/50 my-1" />
                <div className="flex justify-between items-center font-bold text-lucy-900">
                  <span>Total Amount Due</span>
                  <span className="text-2xl">{formatPrice(total + 35)}</span>
                </div>
                <p className="text-[10px] text-lucy-600/80 pt-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> A
                  professional receipt will be sent to{" "}
                  {details.email || "your email"}.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-lucy-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-lucy-800/20 hover:bg-lucy-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Send Order to Kitchen <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lucy-800 to-emerald-500"></div>
            <div className="bg-white rounded-2xl shadow-sm border p-8 mt-4 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-50 duration-500">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-800">
                  Order Dispatched
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Ref: {orderRef}
                </p>
              </div>

              <div className="border-t border-dashed pt-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-bold">{details.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Delivery to</span>
                  <span className="font-bold">{details.address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Delivery Fee</span>
                  <span className="font-bold">{formatPrice(35)}</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between text-lg">
                  <span className="font-serif font-bold text-slate-800">
                    Grand Total
                  </span>
                  <span className="font-bold text-lucy-800">
                    {formatPrice(total + 35)}
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl text-xs text-slate-500 leading-relaxed flex items-center gap-3 text-left">
                <MailCheck className="w-8 h-8 text-lucy-800 shrink-0" />
                <span>
                  Greyton Go notified. A professional receipt has been sent to{" "}
                  <strong>{details.email}</strong>.{" "}
                  {paymentMethod === "payshap" ? (
                    <>
                      Please complete your PayShap payment of{" "}
                      <strong>{formatPrice(total + 35)}</strong> to cell{" "}
                      <strong>072996050</strong> (Chaos Catering).
                    </>
                  ) : (
                    <>Please prepare to pay in cash upon delivery.</>
                  )}
                </span>
              </div>

              <div className="space-y-4 pt-2">
                {paymentMethod === "payshap" ? (
                  <div className="w-full bg-lucy-50 text-lucy-900 font-bold py-4 rounded-2xl border border-lucy-200 flex flex-col items-center justify-center p-4">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-lucy-800" />
                      <span>PayShap: 072996050</span>
                    </div>
                    <p className="text-[10px] text-lucy-700 mt-1 font-normal">
                      Alias: Chaos Catering
                    </p>
                  </div>
                ) : (
                  <div className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl border border-slate-200 flex items-center justify-center gap-3">
                    <CreditCard className="w-5 h-5" /> Cash Payment on Delivery
                  </div>
                )}
                <button
                  onClick={onSuccess}
                  className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Menu
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Encrypted & Secure Transaction
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductModal: React.FC<{
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cartItem: CartItem) => void;
  modifierDefs?: Record<string, string[]>;
  pizzaToppings?: { label: string; price: string }[];
  burgerToppings?: { label: string; price: string }[];
}> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
  modifierDefs = INITIAL_MODIFIER_DEFS,
  pizzaToppings = [],
  burgerToppings = [],
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<
    { label: string; price: string } | undefined
  >(undefined);
  const [selectedExtras, setSelectedExtras] = useState<Set<number>>(
    new Set<number>(),
  );
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [modifiers, setModifiers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedVariant(item.variants ? item.variants[0] : undefined);
      setSelectedExtras(new Set());
      setSpecialInstructions("");
      setModifiers({});
      const smartModifierKeys = (item.modifiers || []).filter(
        (m) => !["Pizza Toppings", "Burger Extras"].includes(m),
      );
      if (smartModifierKeys.length > 0) {
        const initialMods: Record<string, string> = {};
        smartModifierKeys.forEach((key) => {
          const options = modifierDefs[key];
          if (options && options.length > 0) initialMods[key] = options[0];
          if (key === "Egg Style")
            initialMods["Egg Doneness"] = (modifierDefs["Egg Doneness"] || [
              "Soft",
            ])[0];
        });
        setModifiers(initialMods);
      }
    }
  }, [isOpen, item, modifierDefs]);

  if (!isOpen) return null;

  const basePrice = selectedVariant
    ? parsePrice(selectedVariant.price)
    : parsePrice(item.price);
  const extrasTotal = (Array.from(selectedExtras) as number[]).reduce(
    (acc, idx) => acc + parsePrice(item.extras![idx].price),
    0,
  );
  const unitPrice = basePrice + extrasTotal;

  const handleConfirm = () => {
    const cartItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      menuItem: item,
      quantity,
      selectedVariant,
      selectedExtras: (Array.from(selectedExtras) as number[]).map(
        (idx) => item.extras![idx],
      ),
      selectedModifiers: modifiers,
      specialInstructions,
      totalPrice: unitPrice * quantity,
      restaurantId: item.restaurantId,
      restaurantName: item.restaurantName,
    };
    onConfirm(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-5 border-b bg-stone-50 rounded-t-2xl flex justify-between items-start">
          <div>
            <h3 className="font-serif text-2xl font-bold">{item.name}</h3>
            <p className="text-emerald-700 font-bold">
              {formatPrice(unitPrice)}
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
            }}
            className="p-2 bg-white rounded-full shadow-sm text-slate-500 active:scale-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <p className="text-slate-600 text-sm leading-relaxed">
            {item.description}
          </p>
          {item.variants && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Select Option
              </h4>
              {item.variants.map((v, idx) => (
                <label
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedVariant?.label === v.label ? "border-lucy-600 bg-lucy-50" : "border-stone-200"}`}
                >
                  <span className="text-slate-700 font-medium">{v.label}</span>
                  <span className="text-slate-500 text-sm">{v.price}</span>
                  <input
                    type="radio"
                    name="variant"
                    className="hidden"
                    checked={selectedVariant?.label === v.label}
                    onChange={() => {
                      setSelectedVariant(v);
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          {item.modifiers
            ?.filter((m) => !["Pizza Toppings", "Burger Extras"].includes(m))
            .map((key) => (
              <div key={key} className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  {key}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(modifierDefs[key] || []).map((opt) => (
                    <label
                      key={opt}
                      className={`p-3 rounded-xl border text-center text-sm cursor-pointer transition-all ${modifiers[key] === opt ? "border-lucy-800 bg-lucy-50 text-lucy-800 font-bold" : "border-stone-200"}`}
                    >
                      {opt}{" "}
                      <input
                        type="radio"
                        name={key}
                        className="hidden"
                        checked={modifiers[key] === opt}
                        onChange={() => {
                          setModifiers((prev) => ({ ...prev, [key]: opt }));
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Instructions
            </h4>
            <textarea
              className="w-full p-3 border border-stone-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-lucy-600"
              placeholder="E.g. No onions..."
              rows={3}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t bg-white flex items-center gap-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center bg-stone-100 rounded-full p-1 border">
            <button
              onClick={() => {
                setQuantity(Math.max(1, quantity - 1));
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-90 transition-transform"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-bold text-lg">
              {quantity}
            </span>
            <button
              onClick={() => {
                setQuantity(quantity + 1);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-lucy-800 text-white shadow-sm active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              handleConfirm();
            }}
            className="flex-1 bg-lucy-800 text-white font-bold py-3.5 rounded-full hover:bg-lucy-900 active:scale-[0.98] transition-all flex justify-between px-6"
          >
            <span>Add</span>
            <span>{formatPrice(unitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const RestaurantSelectionView: React.FC<{
  restaurants: Restaurant[];
  onSelect: (r: Restaurant) => void;
  onLoginRequest: () => void;
  onDriverLoginRequest: () => void;
}> = ({ restaurants, onSelect, onLoginRequest, onDriverLoginRequest }) => (
  <div className="flex-1 flex flex-col h-full overflow-y-auto">
    <div className="container mx-auto px-4 py-12 flex flex-col min-h-full max-w-6xl">
      <div className="text-center mb-16 animate-in fade-in slide-in-from-top-10 duration-700">
        <div className="flex flex-col items-center mb-4">
          <a
            href="https://mark-mikealson.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="relative mb-6 group inline-block hover:opacity-95 transition-opacity duration-300"
          >
            {/* Subtle glow effect behind the logo to make it blend into the dark theme perfectly */}
            <div className="absolute inset-0 bg-[#D4AF37]/15 rounded-full blur-2xl group-hover:bg-[#D4AF37]/25 transition-all duration-700 scale-95" />

            <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full aspect-square bg-slate-900/40 backdrop-blur-sm border-2 border-[#D4AF37]/60 overflow-hidden shadow-2xl flex items-center justify-center p-1 hover:border-[#D4AF37] hover:scale-105 transition-all duration-500">
              <img
                src={chaosLogo}
                alt="Chaos Catering & Consulting Logo"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </a>
          <span className="text-[10px] md:text-xs font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-3 drop-shadow-md">
            A Executive Chef Mark Mikealson Initiative
          </span>
          <h1 className="font-serif text-6xl md:text-8xl text-white tracking-tight drop-shadow-xl leading-none">
            Greyton Go
          </h1>
          <span className="text-[10px] md:text-xs font-bold text-[#D4AF37] uppercase tracking-[0.3em] mt-3 drop-shadow-md">
            A Member Of The Chaos Cartelle
          </span>
        </div>
        <div className="w-24 h-1 bg-white/30 mx-auto mt-8 rounded-full"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8 mb-16">
        {restaurants
          .filter((r) => r.isVisible !== false)
          .map((r, idx) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r);
              }}
              className="group relative overflow-hidden rounded-3xl bg-white shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 text-left flex flex-col"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="h-40 md:h-64 overflow-hidden relative">
                <img
                  src={r.image}
                  alt={r.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/30">
                    {r.category}
                  </span>
                  <h2 className="text-xl md:text-4xl font-serif text-white mt-2">
                    {r.name}
                  </h2>
                </div>
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <span className="text-amber-500 text-xs">★</span>
                  <span className="text-slate-800 font-bold text-xs">
                    {r.rating}
                  </span>
                </div>
              </div>
              <div className="p-4 md:p-8 flex-1 flex flex-col justify-between bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" /> {r.deliveryTime}
                    </span>
                  </div>
                  <span className="text-lucy-800 font-bold text-[10px] md:text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span className="hidden sm:inline">View Menu</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </span>
                </div>
              </div>
            </button>
          ))}
      </div>

      <div className="mt-auto flex flex-col sm:flex-row justify-between items-center pb-8 px-2 gap-4">
        <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">
          © 2026 Greyton Go Delivery
        </div>
        <div className="flex gap-3 justify-center sm:justify-end">
          <button
            onClick={() => {
              onDriverLoginRequest();
            }}
            className="px-5 py-2.5 rounded-full bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 active:scale-95 shadow-lg text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 hover:text-white transition-all duration-350 cursor-pointer flex items-center gap-2"
          >
            <Truck className="w-3.5 h-3.5" /> Driver Log In
          </button>
          <button
            onClick={() => {
              onLoginRequest();
            }}
            className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/90 active:scale-95 shadow-lg text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-lucy-900 transition-all cursor-pointer flex items-center gap-2"
          >
            <AdminLogo /> Admin Log In
          </button>
        </div>
      </div>
    </div>
  </div>
);

const LoginView: React.FC<{
  onSuccess: (user: { role: "admin" | "driver"; id?: string }) => void;
  onCancel: () => void;
  drivers: Driver[];
}> = ({ onSuccess, onCancel, drivers }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminCheckEmail = ["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com";
    if (email === adminCheckEmail && password === "Sony1.com") {
      onSuccess({ role: "admin" });
    } else {
      const driver = drivers.find(
        (d) => d.email === email && d.password === password,
      );
      if (driver) {
        onSuccess({ role: "driver", id: driver.id });
      } else {
        setError(true);
      }
    }
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm fixed inset-0 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <AdminLogo />
        </div>
        <h2 className="text-2xl font-serif font-bold text-center mb-6 text-slate-800">
          Admin Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Email Address
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-lucy-600"
              placeholder={["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com"}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-lucy-600"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs mt-2 px-1">
              Invalid email or password.
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-lucy-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-lucy-800/20 hover:bg-lucy-900 transition-all mt-4"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              onCancel();
            }}
            className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

const DriverLoginView: React.FC<{
  onSuccess: (user: { role: "admin" | "driver"; id?: string }) => void;
  onCancel: () => void;
  drivers: Driver[];
}> = ({ onSuccess, onCancel, drivers }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctDriver = drivers.find((d) => d.pin === pin);
    if (correctDriver) {
      onSuccess({ role: "driver", id: correctDriver.id });
    } else {
      setError(true);
    }
  };

  const handlePinChange = (val: string) => {
    const formatted = val.replace(/\D/g, "").slice(0, 6);
    setPin(formatted);
    setError(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm fixed inset-0 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-center mb-1 text-slate-800">
          Driver Login
        </h2>
        <p className="text-slate-500 text-[11px] text-center mb-6 leading-relaxed">
          Enter your 6-digit driver profile security PIN to log in and accept dispatched deliveries.
        </p>
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">
              6-Digit Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-center text-xl tracking-[0.5em] placeholder:tracking-[normal] placeholder:text-slate-300"
              placeholder="••••••"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs text-center font-semibold">
              Incorrect security PIN. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={pin.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/15 active:scale-[0.98] transition-all"
          >
            Access Dispatch Console
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors pt-2 block text-center"
          >
            Go Back
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{
  menu: MenuSection[];
  onSelect: (id: string) => void;
  onBack: () => void;
  isCollectionMode: boolean;
}> = ({ menu, onSelect, onBack }) => (
  <div className="flex-1 flex flex-col h-full bg-stone-900/50 backdrop-blur-sm overflow-y-auto">
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-full">
      <button
        onClick={() => {
          onBack();
        }}
        className="absolute top-6 left-6 text-white/80 hover:text-white active:scale-95 transition-transform flex items-center gap-2"
      >
        <ArrowLeft className="w-6 h-6" /> Back
      </button>
      <h2 className="text-4xl md:text-5xl font-serif text-white mb-12">
        Browse Menu
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl w-full">
        {menu.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              onSelect(section.id);
            }}
            className="group aspect-square rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/20 active:scale-95 transition-all shadow-xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-lucy-50 transition-colors">
              {section.id === "breakfast" && <Sun className="w-8 h-8" />}
              {section.id === "mains" && <Utensils className="w-8 h-8" />}
              {section.id === "pizza" && <Pizza className="w-8 h-8" />}
              {section.id === "desserts" && <CakeSlice className="w-8 h-8" />}
              {section.id === "drinks" && <Martini className="w-8 h-8" />}
              {section.id === "bar" && <Beer className="w-8 h-8" />}
              {section.id === "wine" && <Wine className="w-8 h-8" />}
            </div>
            <span className="text-xl font-serif text-white">
              {section.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const DetailView: React.FC<{
  section: MenuSection;
  onBack: () => void;
  isCollectionMode: boolean;
}> = ({ section, onBack }) => (
  <div className="flex-1 flex flex-col bg-white h-full relative z-20">
    <div className="bg-lucy-900 text-white p-6 sticky top-0 z-30 shadow-md flex items-center gap-4">
      <button
        onClick={() => {
          onBack();
        }}
        className="p-2 hover:bg-white/10 rounded-full"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h2 className="text-2xl font-serif font-bold">{section.title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
      <div className="max-w-3xl mx-auto space-y-10 pb-20">
        {section.subtitle && (
          <p className="text-center text-lucy-800 font-serif italic text-xl">
            {section.subtitle}
          </p>
        )}
        {section.content.map((sub, sIdx) => (
          <div key={sIdx}>
            {sub.title && (
              <h3 className="font-serif text-xl text-slate-500 mb-6 pb-2 border-b">
                {sub.title}
              </h3>
            )}
            <div className="grid gap-6">
              {sub.items.map((item, iIdx) => (
                <div
                  key={iIdx}
                  className="bg-white p-5 rounded-xl border shadow-sm flex justify-between gap-4"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-slate-800">
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-slate-500 text-sm mt-1">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-3 font-serif font-bold text-lucy-800">
                      {item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FullMenuView: React.FC<{
  menu: MenuSection[];
  onBack: () => void;
  restaurantName?: string;
  modifierDefs: Record<string, string[]>;
  onAddToCart: (item: CartItem) => void;
  cartCount: number;
  onOpenCart: () => void;
  pizzaToppings: { label: string; price: string }[];
  burgerToppings: { label: string; price: string }[];
  restaurant?: Restaurant;
}> = ({
  menu,
  onBack,
  restaurantName,
  modifierDefs,
  onAddToCart,
  cartCount,
  onOpenCart,
  pizzaToppings,
  burgerToppings,
  restaurant,
}) => {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  return (
    <div className="flex-1 flex flex-col bg-stone-50 h-full relative z-20">
      {selectedItem && (
        <ProductModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={onAddToCart}
          modifierDefs={modifierDefs}
          pizzaToppings={pizzaToppings}
          burgerToppings={burgerToppings}
        />
      )}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur shadow-sm border-b px-4 py-3 flex justify-between items-center pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => {
            onBack();
          }}
          className="flex items-center gap-2 text-slate-600 font-medium hover:text-lucy-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">
            Order from another restaurant
          </span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="font-serif font-bold text-slate-800 truncate max-w-[150px] sm:max-w-none">
          {restaurantName || "Menu"}
        </div>
        <button
          onClick={() => {
            onOpenCart();
          }}
          className="relative p-2 text-slate-600 active:scale-90 transition-transform"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-lucy-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl text-slate-800 mb-4">
              {restaurantName || "Our Menu"}
            </h1>
            <div className="w-24 h-1 bg-lucy-500 mx-auto rounded-full"></div>
          </div>
          <div className="space-y-16">
            {menu.map((section) => (
              <div key={section.id}>
                <h2 className="font-serif text-3xl text-lucy-900 mb-8 border-b pb-2">
                  {section.title}
                </h2>
                {section.content.map((sub, sIdx) => (
                  <div key={sIdx} className="mb-8">
                    {sub.title && (
                      <h3 className="text-slate-500 font-serif text-xl mb-6">
                        {sub.title}
                      </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sub.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          onClick={() => {
                            if (item.availableForDelivery !== false)
                              setSelectedItem(item);
                          }}
                          className={`flex justify-between items-start gap-4 p-4 rounded-xl border border-stone-100 bg-white shadow-sm hover:shadow-md hover:border-lucy-200 transition-all cursor-pointer group ${
                            item.availableForDelivery === false
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-base md:text-lg text-slate-800 group-hover:text-lucy-800 transition-colors">
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            {item.availableForDelivery !== false ? (
                              <div className="mt-2 text-left">
                                <span className="text-[10px] font-bold bg-lucy-800 text-white px-2.5 py-1 rounded-md uppercase tracking-wider group-hover:bg-lucy-900 transition-colors">
                                  Add to order
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 text-left">
                                <span className="text-[10px] font-bold bg-stone-200 text-stone-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                  Not Available
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="font-bold text-lucy-800 text-base md:text-lg whitespace-nowrap">
                            {item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CollectionMenuView: React.FC<{
  menu: MenuSection[];
  modifierDefs: Record<string, string[]>;
  onBack: () => void;
  onAddToCart: (item: CartItem) => void;
  cartCount: number;
  onOpenCart: () => void;
  pizzaToppings: { label: string; price: string }[];
  burgerToppings: { label: string; price: string }[];
}> = ({
  menu,
  modifierDefs,
  onBack,
  onAddToCart,
  cartCount,
  onOpenCart,
  pizzaToppings,
  burgerToppings,
}) => {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const scrollTo = (id: string) =>
    document
      .getElementById(`sec-${id}`)
      ?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="flex-1 flex flex-col bg-stone-50 h-full relative z-20">
      {selectedItem && (
        <ProductModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={onAddToCart}
          modifierDefs={modifierDefs}
          pizzaToppings={pizzaToppings}
          burgerToppings={burgerToppings}
        />
      )}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur shadow-sm border-b px-4 py-3 flex justify-between items-center pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => {
            onBack();
          }}
          className="flex items-center gap-2 text-slate-600 font-medium hover:text-lucy-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="hidden sm:inline">
            Order from another restaurant
          </span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="font-serif font-bold text-xl text-slate-800">Menu</div>
        <button
          onClick={() => {
            onOpenCart();
          }}
          className="relative p-2 text-slate-600 active:scale-90 transition-transform"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-lucy-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </header>
      <div className="bg-white border-b sticky top-[60px] z-20 overflow-x-auto no-scrollbar py-3 px-4 flex gap-2">
        {menu.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              scrollTo(s.id);
            }}
            className="px-4 py-2 rounded-full bg-stone-100 text-xs font-bold whitespace-nowrap hover:bg-stone-200 active:scale-95 transition-all"
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-12">
        {menu.map((section) => (
          <div
            key={section.id}
            id={`sec-${section.id}`}
            className="scroll-mt-32"
          >
            <h2 className="font-serif text-3xl font-bold mb-6 text-slate-800">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.content
                .flatMap((sub) =>
                  sub.items.filter((i) => i.availableForDelivery !== false),
                )
                .map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedItem(item);
                    }}
                    className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="font-bold text-slate-800 leading-tight group-hover:text-lucy-800">
                          {item.name}
                        </h4>
                        <span className="font-bold text-lucy-800 text-sm whitespace-nowrap">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-50 flex justify-end">
                      <button className="text-[10px] font-bold bg-lucy-800 text-white px-3 py-1 rounded-lg">
                        ADD
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OnboardingTab: React.FC = () => {
  const template = `# Greyton Go - Restaurant Onboarding Form

Please fill in the following information to get your restaurant listed on Greyton Go.

## 1. Restaurant Information
- **Restaurant Name:** 
- **Category:** (e.g., Bistro, Cafe, Grill, Pizza)
- **Short Description:** (1-2 sentences about your vibe and food)
- **Estimated Delivery/Prep Time:** (e.g., 30-45 min)
- **Operating Hours for Delivery:** 
- **Contact Phone (for orders):** 
- **Contact Email (for receipts):** 

## 2. Menu Structure
Please list your menu sections (e.g., Breakfast, Starters, Mains, Pizzas, Desserts).
For each item, provide:
- **Item Name:**
- **Description:**
- **Price:** (in Rands, e.g., R120)
- **Options/Modifiers:** (e.g., Rare, Medium, Well Done)
- **Extras:** (e.g., Add Cheese +R15, Add Bacon +R20)

## 3. Photos
Please provide:
- **Main Cover Photo:** (High-resolution, landscape format preferred)
- **Logo:** (If available, transparent PNG preferred)
- **Item Photos:** (Optional, but highly recommended for top-selling items)

---
Please email this completed form along with your photos to: delivery@chaos-consulting.co.za`;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-800">
              Restaurant Onboarding
            </h2>
            <p className="text-slate-500 mt-1">
              Copy this template and email it to new restaurant partners.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${copied ? "bg-emerald-500 text-white" : "bg-lucy-800 text-white hover:bg-lucy-900 shadow-lucy-900/20"}`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" /> Copied!
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" /> Copy Template
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap overflow-x-auto">
          {template}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Step 1
            </h4>
            <p className="text-blue-700 text-xs">
              Copy the template above and paste it into an email to the
              restaurant owner.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-purple-800 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Step 2
            </h4>
            <p className="text-purple-700 text-xs">
              Once they reply with their data, use the "Menu Items" tab to
              upload their menu.
            </p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Step 3
            </h4>
            <p className="text-emerald-700 text-xs">
              Add their restaurant information and photos to the system to go
              live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountingTab: React.FC<{ orders: Order[] }> = ({ orders }) => {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | "all"
  >("all");

  const filteredOrders =
    selectedRestaurantId === "all"
      ? orders
      : orders.filter((o) => o.restaurantId === selectedRestaurantId);

  const totalSubtotal = filteredOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const totalCommission = filteredOrders.reduce(
    (acc, o) => acc + o.commission,
    0,
  );
  const totalDeliveryFees = filteredOrders.reduce(
    (acc, o) => acc + o.deliveryFee,
    0,
  );
  const totalRevenue = totalCommission + totalDeliveryFees;

  // Group by restaurant for the blocks
  const restaurantStats = useMemo(() => {
    const stats: Record<
      string,
      { name: string; subtotal: number; commission: number; count: number }
    > = {};
    orders.forEach((o) => {
      if (!stats[o.restaurantId]) {
        stats[o.restaurantId] = {
          name: o.restaurantName,
          subtotal: 0,
          commission: 0,
          count: 0,
        };
      }
      stats[o.restaurantId].subtotal += o.subtotal;
      stats[o.restaurantId].commission += o.commission;
      stats[o.restaurantId].count += 1;
    });
    return stats;
  }, [orders]);

  // Daily Summary (Day End)
  const dailySummary = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
    return {
      count: todayOrders.length,
      subtotal: todayOrders.reduce((acc, o) => acc + o.subtotal, 0),
      commission: todayOrders.reduce((acc, o) => acc + o.commission, 0),
      delivery: todayOrders.reduce((acc, o) => acc + o.deliveryFee, 0),
    };
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Day End Summary Section */}
      <div className="bg-lucy-50 border border-lucy-100 rounded-3xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-serif font-bold text-lucy-900">
              Daily Day End Summary
            </h3>
            <p className="text-lucy-700 text-sm">
              Summary for {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-lucy-200 text-lucy-800 font-bold text-sm">
            {dailySummary.count} Orders Today
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/60 backdrop-blur p-4 rounded-2xl border border-lucy-200">
            <p className="text-lucy-600 text-[10px] font-bold uppercase tracking-widest mb-1">
              Today's Sales
            </p>
            <p className="text-2xl font-serif font-bold text-slate-800">
              {formatPrice(dailySummary.subtotal)}
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur p-4 rounded-2xl border border-lucy-200">
            <p className="text-lucy-600 text-[10px] font-bold uppercase tracking-widest mb-1">
              Today's Commission
            </p>
            <p className="text-2xl font-serif font-bold text-emerald-600">
              {formatPrice(Math.round(dailySummary.commission))}
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur p-4 rounded-2xl border border-lucy-200">
            <p className="text-lucy-600 text-[10px] font-bold uppercase tracking-widest mb-1">
              Today's Delivery
            </p>
            <p className="text-2xl font-serif font-bold text-blue-600">
              {formatPrice(dailySummary.delivery)}
            </p>
          </div>
          <div className="bg-lucy-800 p-4 rounded-2xl text-white shadow-lg shadow-lucy-800/20">
            <p className="text-lucy-300 text-[10px] font-bold uppercase tracking-widest mb-1">
              Today's Revenue
            </p>
            <p className="text-2xl font-serif font-bold">
              {formatPrice(
                Math.round(dailySummary.commission + dailySummary.delivery),
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Restaurant Selection Blocks */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold text-slate-800 px-2">
          Restaurant Revenue Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setSelectedRestaurantId("all")}
            className={`p-6 rounded-3xl border transition-all text-left group ${selectedRestaurantId === "all" ? "bg-lucy-800 border-lucy-800 text-white shadow-xl" : "bg-white border-slate-200 hover:border-lucy-400"}`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedRestaurantId === "all" ? "text-lucy-300" : "text-slate-400"}`}
            >
              Overview
            </p>
            <h4 className="text-xl font-serif font-bold mb-4">
              All Restaurants
            </h4>
            <div className="flex justify-between items-end">
              <span
                className={`text-sm font-bold ${selectedRestaurantId === "all" ? "text-white" : "text-lucy-800"}`}
              >
                {orders.length} Orders
              </span>
              <ArrowLeft
                className={`w-5 h-5 rotate-180 transition-transform group-hover:translate-x-1 ${selectedRestaurantId === "all" ? "text-white" : "text-slate-300"}`}
              />
            </div>
          </button>
          {Object.entries(restaurantStats).map(([id, stats]) => (
            <button
              key={id}
              onClick={() => setSelectedRestaurantId(id)}
              className={`p-6 rounded-3xl border transition-all text-left group ${selectedRestaurantId === id ? "bg-lucy-800 border-lucy-800 text-white shadow-xl" : "bg-white border-slate-200 hover:border-lucy-400"}`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedRestaurantId === id ? "text-lucy-300" : "text-slate-400"}`}
              >
                Restaurant
              </p>
              <h4 className="text-xl font-serif font-bold mb-4 truncate">
                {stats.name}
              </h4>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold ${selectedRestaurantId === id ? "text-lucy-200" : "text-slate-400"}`}
                  >
                    Sales: {formatPrice(stats.subtotal)}
                  </span>
                  <span
                    className={`text-sm font-bold ${selectedRestaurantId === id ? "text-white" : "text-lucy-800"}`}
                  >
                    {stats.count} Orders
                  </span>
                </div>
                <ArrowLeft
                  className={`w-5 h-5 rotate-180 transition-transform group-hover:translate-x-1 ${selectedRestaurantId === id ? "text-white" : "text-slate-300"}`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Stats for Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
            Selected Sales
          </p>
          <p className="text-3xl font-serif font-bold text-slate-800">
            {formatPrice(totalSubtotal)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
            Commission (15%)
          </p>
          <p className="text-3xl font-serif font-bold text-emerald-600">
            {formatPrice(Math.round(totalCommission))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
            Delivery Fees
          </p>
          <p className="text-3xl font-serif font-bold text-blue-600">
            {formatPrice(totalDeliveryFees)}
          </p>
        </div>
        <div className="bg-lucy-900 p-6 rounded-3xl shadow-lg shadow-lucy-900/20 text-white">
          <p className="text-lucy-300 text-xs font-bold uppercase tracking-widest mb-2">
            Total Revenue
          </p>
          <p className="text-3xl font-serif font-bold">
            {formatPrice(Math.round(totalRevenue))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-serif font-bold text-slate-800">
            {selectedRestaurantId === "all"
              ? "All Order Accounting"
              : `${restaurantStats[selectedRestaurantId]?.name} Accounting`}
          </h3>
          <button className="text-lucy-800 font-bold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">Commission</th>
                <th className="px-6 py-4">Delivery</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">
                    {order.restaurantName}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatPrice(order.subtotal)}
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">
                    {formatPrice(Math.round(order.commission))}
                  </td>
                  <td className="px-6 py-4 text-blue-600 font-bold">
                    {formatPrice(order.deliveryFee)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400 italic"
                  >
                    No orders recorded for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const OrdersTab: React.FC<{
  orders: Order[];
  drivers: Driver[];
  onUpdateOrders: (o: Order[]) => void;
  loggedInUser: { role: "admin" | "driver"; id?: string } | null;
}> = ({ orders, drivers, onUpdateOrders, loggedInUser }) => {
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(
    null,
  );
  const [confirmationData, setConfirmationData] = useState({
    time: "",
    notes: "",
  });
  const [driverEtaOrderId, setDriverEtaOrderId] = useState<string | null>(null);
  const [driverEta, setDriverEta] = useState("");

  const allocateDriver = (orderId: string, driverId: string) => {
    onUpdateOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, driverId, status: "allocated" } : o,
      ),
    );
  };

  const handleDriverAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverEtaOrderId || !loggedInUser?.id) return;

    onUpdateOrders(
      orders.map((o) =>
        o.id === driverEtaOrderId
          ? {
              ...o,
              driverId: loggedInUser.id,
              status: "allocated",
              driverEta: driverEta,
            }
          : o,
      ),
    );

    setDriverEtaOrderId(null);
    setDriverEta("");
  };

  const updateStatus = (orderId: string, status: Order["status"]) => {
    onUpdateOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingOrderId) return;

    onUpdateOrders(
      orders.map((o) =>
        o.id === confirmingOrderId
          ? {
              ...o,
              status: "confirmed",
              estimatedCollectionTime: confirmationData.time,
              restaurantNotes: confirmationData.notes,
            }
          : o,
      ),
    );

    setConfirmingOrderId(null);
    setConfirmationData({ time: "", notes: "" });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-serif font-bold text-slate-800">
          Order Management
        </h2>
        <div className="flex gap-4">
          <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div> Pending
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Confirmed
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Allocated
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
            Delivered
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {order.id}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    order.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : order.status === "confirmed"
                        ? "bg-indigo-100 text-indigo-700"
                        : order.status === "allocated"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {order.status}
                </span>
                {order.isProformaPaid && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Proforma Paid
                  </span>
                )}
                {order.isPayShapReceived && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-teal-100 text-teal-750 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-505 bg-teal-500"></span> PayShap Recv
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-800">
                {order.restaurantName}
              </h3>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> {order.customerName} •{" "}
                <Phone className="w-4 h-4" /> {order.customerPhone} •{" "}
                <MapPin className="w-4 h-4" /> {order.customerAddress}
              </p>
              {order.isGrocery ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100/60 text-slate-800">
                    <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                      🛒 CUSTOMER GROCERY PICK LIST ({order.groceryPickList?.length || 0} ITEMS)
                    </p>
                    <ul className="text-xs font-semibold list-disc list-inside space-y-1">
                      {order.groceryPickList?.map((i, idx) => (
                        <li key={idx} className="text-slate-700">
                          {i.quantity}x <span className="font-bold text-slate-800">{i.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <GroceryPickerPanel
                    order={order}
                    smtpUser={localStorage.getItem("manual_smtp_user") || ""}
                    smtpPass={localStorage.getItem("manual_smtp_pass") || ""}
                    adminEmail={localStorage.getItem("manual_admin_email") || ""}
                    onSendProforma={async (updatedOrder) => {
                      onUpdateOrders(
                        orders.map((o) => (o.id === order.id ? updatedOrder : o))
                      );
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Items
                    </p>
                    <p className="text-slate-600 text-xs font-medium">
                      {order.items
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ")}
                    </p>
                  </div>
                  {order.restaurantNotes && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">
                        Restaurant Notes
                      </p>
                      <p className="text-amber-800 text-xs italic">
                        "{order.restaurantNotes}"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="w-full md:w-72 space-y-4">
              {loggedInUser?.role === "admin" ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-350">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                    <span>👑 Admin Control Panel</span>
                    <span className="text-[9px] bg-lucy-100 text-lucy-700 px-1.5 py-0.5 rounded font-bold uppercase">Manual Check</span>
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Order Management Status
                    </p>
                    
                    <div className="space-y-1.5">
                      {/* Pending */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={order.status === "pending"}
                          onChange={() => updateStatus(order.id, "pending")}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className={order.status === "pending" ? "font-bold text-amber-700" : "text-slate-600"}>Pending</span>
                      </label>

                      {/* Confirmed */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={order.status === "confirmed"}
                          onChange={() => updateStatus(order.id, "confirmed")}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={order.status === "confirmed" ? "font-bold text-indigo-700" : "text-slate-600"}>Confirmed</span>
                      </label>

                      {/* Allocated */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={order.status === "allocated"}
                          onChange={() => updateStatus(order.id, "allocated")}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={order.status === "allocated" ? "font-bold text-blue-700" : "text-slate-600"}>Allocated</span>
                      </label>

                      {/* Delivered */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={order.status === "delivered"}
                          onChange={() => updateStatus(order.id, "delivered")}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={order.status === "delivered" ? "font-bold text-emerald-700" : "text-slate-600"}>Delivered</span>
                      </label>

                      {/* Proforma Accepted and paid */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 hover:border-teal-200 hover:bg-teal-50/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={!!order.isProformaPaid}
                          onChange={(e) => {
                            onUpdateOrders(
                              orders.map((o) =>
                                o.id === order.id ? { ...o, isProformaPaid: e.target.checked } : o
                              )
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className={order.isProformaPaid ? "font-bold text-teal-700" : "text-slate-600"}>Proforma Accepted and paid</span>
                      </label>
                    </div>
                  </div>

                  {/* PayShap payment received indication */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold bg-emerald-50/60 hover:bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-slate-700 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={!!order.isPayShapReceived}
                        onChange={(e) => {
                          onUpdateOrders(
                            orders.map((o) =>
                              o.id === order.id ? { ...o, isPayShapReceived: e.target.checked } : o
                            )
                          );
                        }}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className={order.isPayShapReceived ? "font-bold text-emerald-800" : "text-slate-700"}>
                          PayShap Payment Received
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                          Check to indicate bank confirmation received
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Override driver allocation / swap */}
                  <div className="pt-3 border-t border-slate-200/60 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Driver Assignment (Swops)</span>
                      {order.driverId && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                          allocated
                        </span>
                      )}
                    </label>
                    <select
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-lucy-600"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "none") {
                          onUpdateOrders(
                            orders.map((o) =>
                              o.id === order.id ? { ...o, driverId: undefined, status: o.status === "allocated" ? "confirmed" : o.status } : o
                            )
                          );
                        } else {
                          allocateDriver(order.id, val);
                        }
                      }}
                      value={order.driverId || "none"}
                    >
                      <option value="none">Unassigned / No Driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.isClockedIn ? "• Duty" : "(Off)"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  {order.isGrocery && order.status === "pending" ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-slate-700 space-y-2">
                      <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Drafting Checklist
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        Once you mark the products picked and enter their respective prices, click the <strong className="text-emerald-700">Send Proforma Invoice</strong> button on the left to request instant payment and dispatch drivers.
                      </p>
                    </div>
                  ) : order.status === "pending" ? (
                    <div className="space-y-3">
                      {confirmingOrderId === order.id ? (
                        <form
                          onSubmit={handleConfirmOrder}
                          className="space-y-3 animate-in slide-in-from-top-2 duration-300"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Collection Time
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 20 mins"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-base"
                              value={confirmationData.time}
                              onChange={(e) =>
                                setConfirmationData({
                                  ...confirmationData,
                                  time: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Restaurant Notes
                            </label>
                            <textarea
                              placeholder="Any issues? (e.g. No stock of...)"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-base h-20"
                              value={confirmationData.notes}
                              onChange={(e) =>
                                setConfirmationData({
                                  ...confirmationData,
                                  notes: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs active:scale-95 transition-transform"
                            >
                              Confirm Acceptance
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingOrderId(null);
                              }}
                              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs active:scale-95 transition-transform"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-700 font-medium">
                            Waiting for restaurant email response...
                          </div>
                          <button
                            onClick={() => {
                              setConfirmingOrderId(order.id);
                            }}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                          >
                            <MailCheck className="w-4 h-4" /> Process Confirmation
                          </button>
                        </div>
                      )}
                    </div>
                  ) : order.status === "confirmed" ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                          Ready for Driver
                        </p>
                        <p className="text-indigo-800 text-xs font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Collect in:{" "}
                          {order.estimatedCollectionTime}
                        </p>
                      </div>

                      {loggedInUser?.role === "driver" ? (
                        <div className="space-y-3">
                          {driverEtaOrderId === order.id ? (
                            <form
                              onSubmit={handleDriverAccept}
                              className="space-y-3 animate-in slide-in-from-top-2 duration-300"
                            >
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Your ETA to Restaurant
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 10 mins"
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-base"
                                  value={driverEta}
                                  onChange={(e) => setDriverEta(e.target.value)}
                                  required
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-xs active:scale-95 transition-transform"
                                >
                                  Confirm & Set ETA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDriverEtaOrderId(null);
                                  }}
                                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs active:scale-95 transition-transform"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => {
                                setDriverEtaOrderId(order.id);
                              }}
                              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                              <MailCheck className="w-4 h-4" /> Confirm Receipt via
                              Email
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Allocate Driver
                          </p>
                          <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lucy-600"
                            onChange={(e) =>
                              allocateDriver(order.id, e.target.value)
                            }
                            value=""
                          >
                            <option value="" disabled>
                              Select Driver...
                            </option>
                            {drivers
                              .filter((d) => d.isClockedIn)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : order.status === "allocated" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-sm bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <Clock className="w-4 h-4" /> Driver:{" "}
                        {drivers.find((d) => d.id === order.driverId)?.name}
                      </div>
                      <button
                        onClick={() => updateStatus(order.id, "delivered")}
                        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Delivered
                      </button>
                      {order.driverEta && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mt-2">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                            Driver ETA
                          </p>
                          <p className="text-blue-800 text-xs font-bold flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Arriving in:{" "}
                            {order.driverEta}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                     <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5" /> Order Completed
                     </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center space-y-4">
            <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-serif italic text-xl">
              No orders to manage yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AddDriverModal: React.FC<{
  onSave: (driver: Omit<Driver, "id" | "isClockedIn">) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    pin: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.phone && formData.email) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <h2 className="font-serif text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-lucy-700" /> Add New Driver
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              placeholder="082 123 4567"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              6-Digit Login PIN
            </label>
            <input
              type="text"
              required
              pattern="\d{6}"
              maxLength={6}
              value={formData.pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, pin: val });
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-mono"
              placeholder="123456"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Password (Backup Method)
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 text-slate-500 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-lucy-800 text-white rounded-xl font-bold shadow-lg shadow-lucy-900/20 hover:bg-lucy-900 transition-all"
            >
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditDriverModal: React.FC<{
  driver: Driver;
  onSave: (driver: Driver) => void;
  onCancel: () => void;
}> = ({ driver, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Driver>({ ...driver });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.phone && formData.email) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <h2 className="font-serif text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-lucy-700" /> Edit Driver
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              6-Digit Login PIN
            </label>
            <input
              type="text"
              required
              pattern="\d{6}"
              maxLength={6}
              value={formData.pin || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, pin: val });
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-mono"
              placeholder="123456"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 text-slate-500 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-lucy-800 text-white rounded-xl font-bold shadow-lg shadow-lucy-900/20 hover:bg-lucy-900 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DriversTab: React.FC<{
  drivers: Driver[];
  shifts: Shift[];
  onUpdateDrivers: (d: Driver[]) => void;
  onUpdateShifts: (s: Shift[]) => void;
}> = ({ drivers, shifts, onUpdateDrivers, onUpdateShifts }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);

  const handleAddDriver = (
    newDriverData: Omit<Driver, "id" | "isClockedIn">,
  ) => {
    const newDriver: Driver = {
      ...newDriverData,
      id: `DRV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      isClockedIn: false,
    };
    onUpdateDrivers([...drivers, newDriver]);
    setIsAddModalOpen(false);
  };

  const handleEditDriver = (updatedDriver: Driver) => {
    onUpdateDrivers(
      drivers.map((d) => (d.id === updatedDriver.id ? updatedDriver : d)),
    );
    setEditingDriver(null);
  };

  const handleDeleteDriver = (id: string) => {
    onUpdateDrivers(drivers.filter((d) => d.id !== id));
    setDeletingDriverId(null);
  };
  const clockIn = (driverId: string) => {
    const shiftId = Math.random().toString(36).substr(2, 9);
    const newShift: Shift = {
      id: shiftId,
      driverId,
      clockIn: new Date().toISOString(),
    };
    onUpdateShifts([...shifts, newShift]);
    onUpdateDrivers(
      drivers.map((d) =>
        d.id === driverId
          ? { ...d, isClockedIn: true, currentShiftId: shiftId }
          : d,
      ),
    );
  };

  const clockOut = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver || !driver.currentShiftId) return;

    const clockOutTime = new Date();
    onUpdateShifts(
      shifts.map((s) => {
        if (s.id === driver.currentShiftId) {
          const clockInTime = new Date(s.clockIn);
          const hours =
            (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          return {
            ...s,
            clockOut: clockOutTime.toISOString(),
            totalHours: hours,
            earnings: Math.round(hours * 25), // R25 per hour
          };
        }
        return s;
      }),
    );
    onUpdateDrivers(
      drivers.map((d) =>
        d.id === driverId
          ? { ...d, isClockedIn: false, currentShiftId: undefined }
          : d,
      ),
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {isAddModalOpen && (
        <AddDriverModal
          onSave={handleAddDriver}
          onCancel={() => setIsAddModalOpen(false)}
        />
      )}
      {editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          onSave={handleEditDriver}
          onCancel={() => setEditingDriver(null)}
        />
      )}

      {deletingDriverId && (
        <div className="fixed inset-0 z-[110] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">
              Delete Driver?
            </h3>
            <p className="text-slate-500 text-sm mb-8">
              Are you sure you want to remove{" "}
              <span className="font-bold text-slate-800">
                {drivers.find((d) => d.id === deletingDriverId)?.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingDriverId(null)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-stone-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDriver(deletingDriverId)}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-serif font-bold text-slate-800">
          Driver Management
        </h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-lucy-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-lucy-900/20 hover:bg-lucy-900 active:scale-95 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" /> Add New Driver
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-2xl font-serif font-bold text-slate-800">
            Active Drivers
          </h3>
          <div className="grid gap-4">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center group relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{driver.name}</h4>
                    <p className="text-slate-500 text-xs">{driver.phone}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100/60 font-mono text-[11px] font-bold">
                        PIN: {driver.pin || "None"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${driver.isClockedIn ? "bg-emerald-500" : "bg-slate-300"}`}
                        ></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {driver.isClockedIn ? "On Duty" : "Off Duty"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingDriver(driver)}
                    className="p-2 text-slate-300 hover:text-lucy-600 hover:bg-lucy-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Edit Driver"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeletingDriverId(driver.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Driver"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      driver.isClockedIn
                        ? clockOut(driver.id)
                        : clockIn(driver.id)
                    }
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      driver.isClockedIn
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    }`}
                  >
                    {driver.isClockedIn ? "Clock Out" : "Clock In"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-serif font-bold text-slate-800">
            Recent Shifts
          </h3>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">Driver</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">Earnings</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts
                    .slice()
                    .reverse()
                    .map((shift) => (
                      <tr key={shift.id} className="text-sm">
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {drivers.find((d) => d.id === shift.driverId)?.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {shift.totalHours
                            ? shift.totalHours.toFixed(2)
                            : "--"}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">
                          {shift.earnings ? formatPrice(shift.earnings) : "--"}
                        </td>
                        <td className="px-6 py-4">
                          {shift.clockOut ? (
                            <span className="text-slate-400 text-xs">
                              Completed
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-bold animate-pulse">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-400 italic"
                      >
                        No shifts recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Media Bucket removed per user request

const SystemTab: React.FC = () => {
  const [testSent, setTestSent] = useState(false);
  const [preview, setPreview] = useState<
    "none" | "admin" | "restaurant" | "driver"
  >("none");
  const [testStatus, setTestStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dynamic system SMTP states
  const [smtpUser, setSmtpUser] = useState(() => localStorage.getItem("manual_smtp_user") || ["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com");
  const [smtpPass, setSmtpPass] = useState(() => localStorage.getItem("manual_smtp_pass") || "Sony1.com");
  const [useManualSmtp, setUseManualSmtp] = useState(() => localStorage.getItem("use_manual_smtp") === "true");
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem("admin_notification_email") || ["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com");
  const [driverEmail, setDriverEmail] = useState(() => localStorage.getItem("driver_notification_email") || "drivers@greytondelivery.co.za");
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showPassKey, setShowPassKey] = useState(false);

  const handleSaveSettings = () => {
    localStorage.setItem("manual_smtp_user", smtpUser);
    localStorage.setItem("manual_smtp_pass", smtpPass);
    localStorage.setItem("use_manual_smtp", useManualSmtp ? "true" : "false");
    localStorage.setItem("admin_notification_email", adminEmail);
    localStorage.setItem("driver_notification_email", driverEmail);
    
    setSaveStatus("Global notification & SMTP settings successfully saved!");
    setTimeout(() => {
      setSaveStatus(null);
    }, 4000);
  };

  const [testOrderData, setTestOrderData] = useState(() => {
    const cached = cache.get<any>("test_order_data");
    return (
      cached || {
        restaurantName: "The Post House",
        restaurantEmail: "orders@theposthouse.co.za",
        customerName: "Lucy Blue",
        customerPhone: "082 123 4567",
        customerEmail: ["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com",
        customerAddress: "123 Main St, Greyton",
        driverEmail: "drivers@greytondelivery.co.za",
      }
    );
  });

  useEffect(() => {
    cache.set("test_order_data", testOrderData);
  }, [testOrderData]);

  const sendConnectionTest = async () => {
    setTestStatus(null);
    const apiBase = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const res = await fetch(`${apiBase}/api/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpUser: useManualSmtp ? smtpUser : "",
          smtpPass: useManualSmtp ? smtpPass : "",
          adminEmail: adminEmail,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus({
          type: "success",
          message: "Connection test email sent!",
        });
      } else {
        setTestStatus({
          type: "error",
          message: `Failed: ${data.error || "Unknown error"}`,
        });
      }
    } catch (err) {
      setTestStatus({
        type: "error",
        message: "Network error connecting to server.",
      });
    }
  };

  const sendTest = async () => {
    setTestSent(true);
    setTestStatus(null);
    const apiBase = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const res = await fetch(`${apiBase}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: testOrderData.restaurantName,
          restaurantEmail: testOrderData.restaurantEmail,
          driverEmail: testOrderData.driverEmail,
          smtpUser: useManualSmtp ? smtpUser : "",
          smtpPass: useManualSmtp ? smtpPass : "",
          adminEmail: adminEmail,
          details: {
            name: testOrderData.customerName,
            phone: testOrderData.customerPhone,
            email: testOrderData.customerEmail,
            address: testOrderData.customerAddress,
          },
          cart: [
            {
              id: "test-1",
              menuItem: { name: "Classic Burger", price: "R125.00" },
              quantity: 2,
              selectedModifiers: {
                Doneness: "Medium",
                Exclusions: "No Onions",
              },
              selectedExtras: [],
              specialInstructions: "Please pack the sauce separately.",
              totalPrice: 250,
            },
            {
              id: "test-2",
              menuItem: { name: "Large Fries", price: "R20.00" },
              quantity: 1,
              selectedModifiers: {},
              selectedExtras: [],
              specialInstructions: "",
              totalPrice: 20,
            },
          ],
          subtotal: 270,
          deliveryFee: 35,
          total: 305,
          paymentMethod: "payshap",
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setTestStatus({
          type: "success",
          message: "Test order emails dispatched!",
        });
      } else {
        setTestStatus({
          type: "error",
          message: data.message || "Failed to dispatch test order.",
        });
      }
    } catch (error) {
      console.error("Test email failed:", error);
      setTestStatus({
        type: "error",
        message: "Failed to dispatch test order.",
      });
    }
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-serif font-bold text-slate-800">
        System & Notifications
      </h2>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-lucy-100 rounded-xl text-lucy-700">
            <Settings className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-serif font-bold text-slate-800">
            Global Notification Settings
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Admin Notification Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-medium text-slate-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Driver Notification Email
            </label>
            <input
              type="email"
              value={driverEmail}
              onChange={(e) => setDriverEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Manual SMTP Overrides Subpanel */}
        <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
          <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-800 block">Manual System SMTP Overrides</span>
              <span className="text-xs text-slate-400">Enable this to manually configure SMTP mail server credentials direct from browser.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={useManualSmtp} 
                onChange={(e) => setUseManualSmtp(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-lucy-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lucy-600"></div>
            </label>
          </div>

          {useManualSmtp && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-amber-50/30 rounded-2xl border border-amber-100/50 space-y-3 md:space-y-0 animate-in slide-in-from-top-3 duration-300">
              <div className="space-y-2 col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SMTP Sender User Address (Gmail Email)
                </label>
                <input
                  type="email"
                  placeholder="e.g. your-email@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-medium text-slate-700"
                />
              </div>
              <div className="space-y-2 col-span-1 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SMTP App Passkey (16-character googlepass)
                </label>
                <div className="relative">
                  <input
                    type={showPassKey ? "text" : "password"}
                    placeholder="Enter App Password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all font-mono font-medium text-slate-700 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassKey(!showPassKey)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">{showPassKey ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
              <div className="col-span-full pt-2">
                <p className="text-[11px] text-slate-400 leading-normal">
                  💡 <strong>Gmail SMTP setup details:</strong> App password must be entered without any spaces. Generate a designated 16-character App Password inside your <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-lucy-700 underline font-medium">Google App Passwords account panel</a>.
                </p>
              </div>
            </div>
          )}
        </div>

        {saveStatus && (
          <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-sm font-medium animate-in fade-in duration-300">
            {saveStatus}
          </div>
        )}

        <button 
          onClick={handleSaveSettings}
          className="bg-lucy-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-lucy-900/20 hover:bg-lucy-900 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">
              Email Integration Test
            </h3>
            <p className="text-slate-500 text-sm">
              Verify the automated email templates sent to Greyton Go and
              Partner Restaurants.
            </p>
          </div>
          <button
            onClick={sendConnectionTest}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Debug Connection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-lucy-800 uppercase tracking-widest">
              Test Order Details
            </h4>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Restaurant Name
              </label>
              <input
                value={testOrderData.restaurantName}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    restaurantName: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Customer Name
              </label>
              <input
                value={testOrderData.customerName}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    customerName: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Customer Phone
              </label>
              <input
                value={testOrderData.customerPhone}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    customerPhone: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Delivery Address
              </label>
              <input
                value={testOrderData.customerAddress}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    customerAddress: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-lucy-800 uppercase tracking-widest">
              Test Destinations
            </h4>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Admin Email (Fixed)
              </label>
              <input
                value={["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com"}
                disabled
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Test Customer Email
              </label>
              <input
                value={testOrderData.customerEmail}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    customerEmail: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Test Restaurant Email
              </label>
              <input
                value={testOrderData.restaurantEmail}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    restaurantEmail: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Test Driver Email
              </label>
              <input
                value={testOrderData.driverEmail}
                onChange={(e) =>
                  setTestOrderData({
                    ...testOrderData,
                    driverEmail: e.target.value,
                  })
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {testStatus && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${testStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}
          >
            {testStatus.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{testStatus.message}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setPreview("admin")}
            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${preview === "admin" ? "border-lucy-600 bg-lucy-50" : "border-slate-200 hover:border-lucy-400"}`}
          >
            <Mail className="w-6 h-6 text-lucy-800 mb-3" />
            <p className="font-bold text-slate-800 text-sm">
              Greyton Go Admin Email
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Full order details, customer info, and financial breakdown.
            </p>
          </button>
          <button
            onClick={() => setPreview("restaurant")}
            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${preview === "restaurant" ? "border-lucy-600 bg-lucy-50" : "border-slate-200 hover:border-lucy-400"}`}
          >
            <Utensils className="w-6 h-6 text-lucy-800 mb-3" />
            <p className="font-bold text-slate-800 text-sm">
              Restaurant Kitchen Email
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Food items, modifiers, and special instructions only.
            </p>
          </button>
          <button
            onClick={() => setPreview("driver")}
            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${preview === "driver" ? "border-lucy-600 bg-lucy-50" : "border-slate-200 hover:border-lucy-400"}`}
          >
            <Bike className="w-6 h-6 text-lucy-800 mb-3" />
            <p className="font-bold text-slate-800 text-sm">
              Driver Dispatch Email
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Collection point, delivery address, and customer contact.
            </p>
          </button>
        </div>

        {preview !== "none" && (
          <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 font-mono text-xs space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-lucy-400 font-bold uppercase tracking-widest">
                Email Preview:{" "}
                {preview === "admin"
                  ? "Greyton Go"
                  : preview === "restaurant"
                    ? "Restaurant"
                    : "Driver"}
              </span>
              <button
                onClick={() => setPreview("none")}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {preview === "admin" ? (
              <div className="space-y-2">
                <p>
                  <span className="text-white">Subject:</span> New Order
                  Received - GG-123456
                </p>
                <p>
                  <span className="text-white">To:</span>{" "}
                  {["chaos", "cartel", "pty"].join(".") + "@" + "zohomail.com"}
                </p>
                <div className="h-px bg-slate-800 my-4"></div>
                <p>
                  New order from{" "}
                  <span className="text-white">
                    {testOrderData.restaurantName}
                  </span>
                </p>
                <p>
                  Customer:{" "}
                  <span className="text-white">
                    {testOrderData.customerName}
                  </span>{" "}
                  ({testOrderData.customerPhone})
                </p>
                <p>
                  Address:{" "}
                  <span className="text-white">
                    {testOrderData.customerAddress}
                  </span>
                </p>
                <div className="my-4">
                  <p className="text-lucy-400 font-bold">ITEMS:</p>
                  <p>2x Classic Burger (Medium, No Onions)</p>
                  <p>1x Large Fries</p>
                </div>
                <div className="my-4 font-mono">
                  <p className="text-lucy-400 font-bold">FINANCIALS:</p>
                  <p>Subtotal: R270.00</p>
                  <p>Delivery: R35.00</p>
                  <p>Total: R305.00</p>
                  <p>Commission (15%): R40.50</p>
                  <p className="mt-2 text-slate-400">
                    Payment: PayShap (Cell: 072996050, Alias: Chaos Catering)
                  </p>
                </div>
              </div>
            ) : preview === "restaurant" ? (
              <div className="space-y-2">
                <p>
                  <span className="text-white">Subject:</span> NEW ORDER -
                  Greyton Go Delivery (GG-123456)
                </p>
                <p>
                  <span className="text-white">To:</span>{" "}
                  {testOrderData.restaurantEmail}
                </p>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-xl text-white font-serif">KITCHEN ORDER</p>
                <div className="my-4 space-y-1">
                  <p className="text-white font-bold">2x Classic Burger</p>
                  <p className="pl-4 text-slate-400">- Medium</p>
                  <p className="pl-4 text-slate-400">- No Onions</p>
                  <p className="mt-2 text-white font-bold">1x Large Fries</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg mt-4">
                  <p className="text-lucy-400 font-bold text-[10px] uppercase tracking-widest">
                    Special Instructions:
                  </p>
                  <p className="text-white italic">
                    "Please pack the sauce separately."
                  </p>
                </div>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-[10px] text-slate-500">
                  Please reply to this email to confirm acceptance and provide
                  an estimated collection time.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  <span className="text-white">Subject:</span> DISPATCH: New
                  Collection at {testOrderData.restaurantName} (GG-123456)
                </p>
                <p>
                  <span className="text-white">To:</span>{" "}
                  {testOrderData.driverEmail}
                </p>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-xl text-white font-serif tracking-tight">
                  DISPATCH NOTICE
                </p>
                <div className="my-4 space-y-2">
                  <div>
                    <p className="text-lucy-400 font-bold text-[10px] uppercase tracking-widest">
                      Collection From:
                    </p>
                    <p className="text-white font-bold">
                      {testOrderData.restaurantName}
                    </p>
                    <p className="text-slate-400">Main Road, Greyton</p>
                  </div>
                  <div>
                    <p className="text-lucy-400 font-bold text-[10px] uppercase tracking-widest">
                      Deliver To:
                    </p>
                    <p className="text-white font-bold">
                      {testOrderData.customerName}
                    </p>
                    <p className="text-slate-400">
                      {testOrderData.customerAddress}
                    </p>
                    <p className="text-slate-400">
                      Phone: {testOrderData.customerPhone}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-[10px] text-slate-500 italic">
                  Please confirm collection in the Driver App once items are
                  received.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={sendTest}
          disabled={testSent}
          className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${
            testSent
              ? "bg-emerald-100 text-emerald-700"
              : "bg-lucy-900 text-white hover:bg-lucy-800 shadow-lg shadow-lucy-900/20"
          }`}
        >
          {testSent ? (
            <>
              <CheckCircle2 className="w-5 h-5" /> Test Emails Dispatched
              Successfully
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" /> Send Live Test Order Emails
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const CSVPreviewModal: React.FC<{
  filename: string;
  rows: any[];
  onCancel: () => void;
  onConfirm: (mode: "merge" | "replace") => void;
}> = ({ filename, rows, onCancel, onConfirm }) => {
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-lucy-600 uppercase tracking-widest block mb-1">
              Verify Menu Data
            </span>
            <h3 className="text-2xl font-serif font-bold text-slate-800">
              CSV Import: {filename}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Detected <span className="font-bold text-slate-800">{rows.length}</span> menu items ready to import.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Choose Import Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setImportMode("merge")}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  importMode === "merge"
                    ? "border-lucy-600 bg-lucy-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={importMode === "merge"}
                    onChange={() => {}}
                    className="text-lucy-600 focus:ring-lucy-500"
                  />
                  <span className="font-bold text-slate-800 text-sm">Merge & Update Prices</span>
                </div>
                <p className="text-xs text-slate-500 pl-5">
                  Updates matching item prices/descriptions and appends any brand-new items.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  importMode === "replace"
                    ? "border-amber-600 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={importMode === "replace"}
                    onChange={() => {}}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-800 text-sm">Replace Whole Menu</span>
                </div>
                <p className="text-xs text-slate-500 pl-5">
                  Wipes out current menu sections entirely and replaces them with CSV contents.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Menu Items Preview (First 5 Rows)
            </label>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.section}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.name}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{row.description || "-"}</td>
                      <td className="px-4 py-3 text-lucy-700 font-bold">{row.price}</td>
                      <td className="px-4 py-3 font-mono">{row.code || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.availableForDelivery ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {row.availableForDelivery ? "YES" : "NO"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl font-bold text-slate-500 hover:text-slate-700 transition-all active:scale-95 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(importMode)}
            className="flex-1 py-4 rounded-2xl font-bold bg-lucy-900 hover:bg-lucy-800 text-white shadow-lg shadow-lucy-900/20 transition-all active:scale-95 text-sm"
          >
            Commit Import
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AddRestaurantModal: React.FC<{
  onSave: (r: Restaurant) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Restaurant");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(
    "https://picsum.photos/seed/restaurant/800/600",
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("30-45 min");
  const [rating, setRating] = useState(4.5);
  const [isGroceryStore, setIsGroceryStore] = useState(false);

  const handleSave = () => {
    if (!name) return;
    const newRestaurant: Restaurant = {
      id: Date.now().toString(),
      name,
      category: isGroceryStore ? "Retail Grocery Store" : category,
      description: description || (isGroceryStore ? "Onward we go! Drop a custom pick list of any groceries you need and our professional picker will collect them for you." : ""),
      image: isGroceryStore && image.includes("seed/restaurant") ? "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" : image,
      rating,
      deliveryTime,
      email,
      phone,
      responsiblePerson,
      menu: [],
      isGroceryStore,
    };
    onSave(newRestaurant);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-800">
              Add New Restaurant
            </h3>
            <p className="text-slate-500 text-sm">
              Onboard a new partner to Greyton Go
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Restaurant Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Blue Hippo"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Category
              </label>
              <select
                value={category}
                disabled={isGroceryStore}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all disabled:opacity-50"
              >
                <option>Restaurant</option>
                <option>Cafe</option>
                <option>Bakery</option>
                <option>Pub & Grill</option>
                <option>Pizzeria</option>
                <option>Retail Grocery Store</option>
              </select>
            </div>
          </div>

          {/* Grocery Store Option Checkbox */}
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
            <input
              type="checkbox"
              id="isGroceryStoreCheckbox"
              checked={isGroceryStore}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsGroceryStore(checked);
                if (checked) {
                  setCategory("Retail Grocery Store");
                } else {
                  setCategory("Restaurant");
                }
              }}
              className="mt-1 w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="isGroceryStoreCheckbox" className="select-none cursor-pointer">
              <span className="block text-sm font-bold text-slate-800">Set as a Retail Grocery Store</span>
              <span className="block text-slate-500 text-xs mt-0.5">
                Enabling this lets customers type in a custom grocery pick list instead of browsing a standard food menu. Once picked, are invoiced under proforma invoice emails.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the restaurant..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Delivery Time
              </label>
              <input
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="e.g. 30-45 min"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Initial Rating
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              />
            </div>
          </div>

          <ImageUpload
            label="Cover Image"
            onUpload={setImage}
            currentImage={image}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Responsible Person
            </label>
            <input
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 rounded-2xl font-bold bg-lucy-900 text-white hover:bg-lucy-800 shadow-lg shadow-lucy-900/20 transition-all"
          >
            Onboard Restaurant
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/** Direct Download & Export Helplers for Restaurant Menu and Media **/
export const exportCSVForRestaurant = (res: Restaurant) => {
  let csvContent = "\uFEFFSection,Item Name,Description,Price,Code,Available For Delivery\n";
  res.menu.forEach((sec) => {
    const secTitle = sec.title || "";
    sec.content.forEach((sub) => {
      sub.items.forEach((item) => {
        const sectionEscaped = `"${secTitle.replace(/"/g, '""')}"`;
        const nameEscaped = `"${(item.name || "").replace(/"/g, '""')}"`;
        const descEscaped = `"${(item.description || "").replace(/"/g, '""')}"`;
        const priceEscaped = `"${(item.price || "").replace(/"/g, '""')}"`;
        const codeEscaped = `"${(item.code || "").replace(/"/g, '""')}"`;
        const deliveryEscaped = item.availableForDelivery !== false ? "true" : "false";
        csvContent += `${sectionEscaped},${nameEscaped},${descEscaped},${priceEscaped},${codeEscaped},${deliveryEscaped}\n`;
      });
    });
  });
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${res.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_menu.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTXTForRestaurant = (res: Restaurant) => {
  let txtContent = `=========================================\n`;
  txtContent += `       ${res.name.toUpperCase()} MENU\n`;
  txtContent += `=========================================\n`;
  txtContent += `${res.description || ""}\n\n`;
  
  res.menu.forEach((sec) => {
    txtContent += `--- ${sec.title.toUpperCase()} ---\n`;
    sec.content.forEach((sub) => {
      if (sub.title) {
        txtContent += `>> ${sub.title}\n`;
      }
      if (sub.description) {
        txtContent += `   (${sub.description})\n`;
      }
      sub.items.forEach((item) => {
        const dlv = item.availableForDelivery !== false ? "" : " (No Delivery)";
        txtContent += `* ${item.name.padEnd(35)} ${item.price}${dlv}\n`;
        if (item.description) {
          txtContent += `  ${item.description}\n`;
        }
        if (item.code) {
          txtContent += `  Code: ${item.code}\n`;
        }
        txtContent += `\n`;
      });
    });
    txtContent += `\n`;
  });
  txtContent += `-----------------------------------------\n`;
  txtContent += `Generated at ${new Date().toLocaleDateString()} - Greyton Go Delivery\n`;
  
  const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${res.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_menu.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportJSONForRestaurant = (res: Restaurant) => {
  const jsonContent = JSON.stringify(res.menu, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${res.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_menu.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadImageDirect = async (imgUrl: string, fileName: string) => {
  try {
    const response = await fetch(imgUrl, { referrerPolicy: "no-referrer" });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    window.open(imgUrl, "_blank");
  }
};

const BackOfficeView: React.FC<{
  restaurants: Restaurant[];
  onUpdateRestaurants: (r: Restaurant[]) => void;
  menu: MenuSection[];
  modifierDefs: Record<string, string[]>;
  onUpdate: (m: MenuSection[]) => void;
  onUpdateModifierDefs: (d: Record<string, string[]>) => void;
  onLogout: () => void;
  orders: Order[];
  drivers: Driver[];
  shifts: Shift[];
  onUpdateOrders: (o: Order[]) => void;
  onUpdateDrivers: (d: Driver[]) => void;
  onUpdateShifts: (s: Shift[]) => void;
  loggedInUser: { role: "admin" | "driver"; id?: string } | null;
}> = ({
  restaurants,
  onUpdateRestaurants,
  menu,
  modifierDefs,
  onUpdate,
  onUpdateModifierDefs,
  onLogout,
  orders,
  drivers,
  shifts,
  onUpdateOrders,
  onUpdateDrivers,
  onUpdateShifts,
  loggedInUser,
}) => {
  const [activeTab, setActiveTab] = useState(
    loggedInUser?.role === "driver" ? "orders" : "orders",
  );
  // Tab State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  // BackOffice State
  const [restaurantTab, setRestaurantTab] = useState<
    "menu" | "accounting" | "setup"
  >("menu");
  const [editItem, setEditItem] = useState<{
    s: number;
    sub: number;
    i: number;
    item: MenuItem;
  } | null>(null);
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  const [newGroupKey, setNewGroupKey] = useState("");

  const [isStorageUploading, setIsStorageUploading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [uploadedStorageUrl, setUploadedStorageUrl] = useState<string | null>(null);
  const storageInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleStorageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsStorageUploading(true);
    setStorageError(null);
    setUploadedStorageUrl(null);

    try {
      const url = await uploadImage(file);
      setUploadedStorageUrl(url);
      if (selectedRes) {
        handleRestaurantUpdate({ image: url });
      }
    } catch (err: any) {
      setStorageError(err.message || "Failed to upload image.");
    } finally {
      setIsStorageUploading(false);
    }
  };

  const selectedRes = restaurants.find((r) => r.id === selectedRestaurantId);

  const handleRestaurantUpdate = (updatedFields: Partial<Restaurant>) => {
    if (!selectedRestaurantId) return;
    const newRestaurants = restaurants.map((r) =>
      r.id === selectedRestaurantId ? { ...r, ...updatedFields } : r,
    );
    onUpdateRestaurants(newRestaurants);
  };

  const deleteRestaurant = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this restaurant? This will remove all its menu data.",
      )
    ) {
      onUpdateRestaurants(restaurants.filter((r) => r.id !== id));
    }
  };

  const [pendingCSV, setPendingCSV] = useState<{ filename: string; rows: any[] } | null>(null);

  const parseCSV = (text: string) => {
    const lines: string[][] = [];
    let row: string[] = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
       const char = text[i];
       const nextChar = text[i + 1];
       
       if (char === '"') {
         if (insideQuote && nextChar === '"') {
           row[row.length - 1] += '"';
           i++;
         } else {
           insideQuote = !insideQuote;
         }
       } else if (char === ',' && !insideQuote) {
         row.push("");
       } else if ((char === '\r' || char === '\n') && !insideQuote) {
         if (char === '\r' && nextChar === '\n') {
           i++;
         }
         lines.push(row);
         row = [""];
       } else {
         row[row.length - 1] += char;
       }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleExportCSV = () => {
    if (!selectedRes) return;
    
    let csvContent = "\uFEFFSection,Item Name,Description,Price,Code,Available For Delivery\n";
    
    selectedRes.menu.forEach((sec) => {
      const secTitle = sec.title || "";
      sec.content.forEach((sub) => {
        sub.items.forEach((item) => {
          const sectionEscaped = `"${(secTitle).replace(/"/g, '""')}"`;
          const nameEscaped = `"${(item.name || "").replace(/"/g, '""')}"`;
          const descEscaped = `"${(item.description || "").replace(/"/g, '""')}"`;
          const priceEscaped = `"${(item.price || "").replace(/"/g, '""')}"`;
          const codeEscaped = `"${(item.code || "").replace(/"/g, '""')}"`;
          const deliveryEscaped = item.availableForDelivery !== false ? "true" : "false";
          
          csvContent += `${sectionEscaped},${nameEscaped},${descEscaped},${priceEscaped},${codeEscaped},${deliveryEscaped}\n`;
        });
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedRes.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_menu_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const parsedLines = parseCSV(text);
      if (parsedLines.length <= 1) {
        alert("The selected CSV file is empty or invalid. Make sure it contains a header row.");
        return;
      }
      
      const headers = parsedLines[0].map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
      const sectionIdx = headers.indexOf("section");
      const nameIdx = headers.indexOf("item name");
      const descIdx = headers.indexOf("description");
      const priceIdx = headers.indexOf("price");
      const codeIdx = headers.indexOf("code");
      const deliveryIdx = headers.indexOf("available for delivery");
      
      if (nameIdx === -1 || priceIdx === -1) {
        alert("Invalid CSV structure! The CSV must contain at least 'Item Name' and 'Price' columns.");
        e.target.value = "";
        return;
      }
      
      const rows: any[] = [];
      for (let i = 1; i < parsedLines.length; i++) {
        const rowData = parsedLines[i];
        if (rowData.length < Math.max(nameIdx, priceIdx) + 1) continue;
        
        const itemName = rowData[nameIdx]?.trim();
        if (!itemName) continue;
        
        const price = rowData[priceIdx]?.trim() || "R0";
        const section = sectionIdx !== -1 ? rowData[sectionIdx]?.trim() : "General";
        const description = descIdx !== -1 ? rowData[descIdx]?.trim() : "";
        const code = codeIdx !== -1 ? rowData[codeIdx]?.trim() : "";
        
        let availableForDelivery = true;
        if (deliveryIdx !== -1) {
          const val = rowData[deliveryIdx]?.trim().toLowerCase();
          if (val === "false" || val === "no" || val === "0") {
            availableForDelivery = false;
          }
        }
        
        rows.push({
          section,
          name: itemName,
          description,
          price,
          code,
          availableForDelivery
        });
      }
      
      if (rows.length === 0) {
        alert("No valid menu item rows were found in the uploaded file.");
        e.target.value = "";
        return;
      }
      
      setPendingCSV({
        filename: file.name,
        rows
      });
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const applyCSV = (mode: "merge" | "replace") => {
    if (!pendingCSV || !selectedRes) return;
    
    const rows = pendingCSV.rows;
    let newMenu: MenuSection[] = [];
    
    if (mode === "merge") {
      newMenu = JSON.parse(JSON.stringify(selectedRes.menu));
      
      rows.forEach((row) => {
        const secTitle = row.section || "General";
        const itemName = row.name;
        
        let section = newMenu.find(
          (s) => s.title.trim().toLowerCase() === secTitle.trim().toLowerCase()
        );
        if (!section) {
          const cleanId = secTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "new-sec";
          section = {
            id: `${cleanId}-${Math.random().toString(36).substring(2, 6)}`,
            title: secTitle,
            content: [{ items: [] }]
          };
          newMenu.push(section);
        }
        
        if (section.content.length === 0) {
          section.content.push({ items: [] });
        }
        const subSec = section.content[0];
        
        let existingItem = subSec.items.find(
          (item) => item.name.trim().toLowerCase() === itemName.trim().toLowerCase()
        );
        
        if (existingItem) {
          existingItem.price = row.price;
          if (row.description) {
            existingItem.description = row.description;
          }
          if (row.code) {
            existingItem.code = row.code;
          }
          existingItem.availableForDelivery = row.availableForDelivery;
        } else {
          subSec.items.push({
            name: itemName,
            description: row.description,
            price: row.price,
            code: row.code,
            availableForDelivery: row.availableForDelivery,
            extras: [],
            variants: [],
            modifiers: []
          });
        }
      });
    } else {
      const groupedSections: Record<string, MenuItem[]> = {};
      
      rows.forEach((row) => {
        const secTitle = row.section || "General";
        if (!groupedSections[secTitle]) {
          groupedSections[secTitle] = [];
        }
        
        groupedSections[secTitle].push({
          name: row.name,
          description: row.description,
          price: row.price,
          code: row.code,
          availableForDelivery: row.availableForDelivery,
          extras: [],
          variants: [],
          modifiers: []
        });
      });
      
      Object.keys(groupedSections).forEach((secTitle) => {
        const cleanId = secTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "new-sec";
        newMenu.push({
          id: `${cleanId}-${Math.random().toString(36).substring(2, 6)}`,
          title: secTitle,
          content: [{ items: groupedSections[secTitle] }]
        });
      });
    }
    
    const updatedRestaurants = restaurants.map((r) => {
      if (r.id === selectedRestaurantId) {
        return { ...r, menu: newMenu };
      }
      return r;
    });
    
    onUpdateRestaurants(updatedRestaurants);
    setPendingCSV(null);
  };

  const updateItem = (s: number, sub: number, i: number, updated: MenuItem) => {
    if (selectedRestaurantId) {
      const newRestaurants = restaurants.map((r) => {
        if (r.id === selectedRestaurantId) {
          const newMenu = r.menu.map((sec, sIdx) => {
            if (sIdx === s) {
              const newContent = sec.content.map((subSec, subIdx) => {
                if (subIdx === sub) {
                  const newItems = subSec.items.map((item, itemIdx) => {
                    if (itemIdx === i) return updated;
                    return item;
                  });
                  return { ...subSec, items: newItems };
                }
                return subSec;
              });
              return { ...sec, content: newContent };
            }
            return sec;
          });
          return { ...r, menu: newMenu };
        }
        return r;
      });
      onUpdateRestaurants(newRestaurants);
    } else {
      const newMenu = menu.map((sec, sIdx) => {
        if (sIdx === s) {
          const newContent = sec.content.map((subSec, subIdx) => {
            if (subIdx === sub) {
              const newItems = subSec.items.map((item, itemIdx) => {
                if (itemIdx === i) return updated;
                return item;
              });
              return { ...subSec, items: newItems };
            }
            return subSec;
          });
          return { ...sec, content: newContent };
        }
        return sec;
      });
      onUpdate(newMenu);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 h-full overflow-hidden print:overflow-visible print:bg-white">
      {pendingCSV && (
        <CSVPreviewModal
          filename={pendingCSV.filename}
          rows={pendingCSV.rows}
          onCancel={() => setPendingCSV(null)}
          onConfirm={(mode) => applyCSV(mode)}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem.item}
          modifierDefs={modifierDefs}
          onSave={(ni) => {
            updateItem(editItem.s, editItem.sub, editItem.i, ni);
            setEditItem(null);
          }}
          onCancel={() => setEditItem(null)}
          onCreateModifierDef={(n) =>
            onUpdateModifierDefs({ ...modifierDefs, [n]: [] })
          }
        />
      )}
      {isAddingRestaurant && (
        <AddRestaurantModal
          onSave={(nr) => {
            onUpdateRestaurants([...restaurants, nr]);
            setIsAddingRestaurant(false);
          }}
          onCancel={() => setIsAddingRestaurant(false)}
        />
      )}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-20 print:hidden pt-[calc(1rem+env(safe-area-inset-top))]">
        <AdminLogo size="sm" />
        <button
          onClick={() => {
            onLogout();
          }}
          className="text-sm font-bold flex items-center gap-2 text-slate-400 hover:text-white transition-colors active:opacity-70"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <div className="w-64 bg-white border-r hidden md:flex flex-col print:hidden">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab("orders");
                setSelectedRestaurantId(null);
              }}
              className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "orders" && !selectedRestaurantId ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
            >
              <ShoppingBag className="w-5 h-5" /> Active Orders
            </button>
            {loggedInUser?.role === "admin" && (
              <>
                <button
                  onClick={() => {
                    setActiveTab("restaurants");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "restaurants" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <Utensils className="w-5 h-5" /> Restaurants
                </button>
                <button
                  onClick={() => {
                    setActiveTab("accounting");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "accounting" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <BarChart3 className="w-5 h-5" /> Global Finance
                </button>
                <button
                  onClick={() => {
                    setActiveTab("drivers");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "drivers" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <Users className="w-5 h-5" /> Drivers
                </button>
                <div className="h-px bg-slate-100 my-4"></div>
                <button
                  onClick={() => {
                    setActiveTab("modifiers");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "modifiers" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <LayoutGrid className="w-5 h-5" /> Modifiers
                </button>


                <button
                  onClick={() => {
                    setActiveTab("onboarding");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "onboarding" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <UserPlus className="w-5 h-5" /> Partner
                </button>
                <button
                  onClick={() => {
                    setActiveTab("system");
                    setSelectedRestaurantId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg font-bold flex items-center gap-3 active:scale-95 transition-all ${activeTab === "system" ? "bg-lucy-50 text-lucy-800" : "text-slate-500"}`}
                >
                  <Settings className="w-5 h-5" /> System
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
          {activeTab === "restaurants" ? (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif font-bold text-slate-800">
                  Restaurant Management
                </h2>
                <button
                  onClick={() => setIsAddingRestaurant(true)}
                  className="bg-lucy-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-lucy-900/20 hover:bg-lucy-800 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" /> Add Restaurant
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRestaurantId(r.id);
                      setActiveTab("restaurant-detail");
                    }}
                    className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-lucy-300 hover:shadow-md transition-all text-left flex flex-col gap-4"
                  >
                    <div className="h-32 rounded-2xl overflow-hidden relative">
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-slate-800">
                        {r.name}
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">
                        {r.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-lucy-600 uppercase tracking-widest">
                        Manage Restaurant
                      </span>
                      <ArrowLeft className="w-4 h-4 rotate-180 text-lucy-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "restaurant-detail" && selectedRes ? (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setActiveTab("restaurants");
                      setSelectedRestaurantId(null);
                    }}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-800">
                      {selectedRes.name}
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Maintenance & Accounting
                    </p>
                  </div>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setRestaurantTab("menu")}
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${restaurantTab === "menu" ? "bg-lucy-800 text-white shadow-lg shadow-lucy-900/20" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Menu
                  </button>
                  <button
                    onClick={() => setRestaurantTab("accounting")}
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${restaurantTab === "accounting" ? "bg-lucy-800 text-white shadow-lg shadow-lucy-900/20" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Finance
                  </button>
                  <button
                    onClick={() => setRestaurantTab("setup")}
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${restaurantTab === "setup" ? "bg-lucy-800 text-white shadow-lg shadow-lucy-900/20" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Profile
                  </button>
                </div>
              </div>

              {restaurantTab === "menu" ? (
                selectedRes.isGroceryStore ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-emerald-600" />
                          Grocery Quick Order Form Setup (Max 30 Popular Items)
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 max-w-xl">
                          Upload up to 30 most popular items via a CSV file containing <strong>Item Name</strong>, <strong>Description</strong>, and <strong>Price</strong>. Customers can select from these popular items for a seamless quick order process alongside the picking list.
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <button
                          type="button"
                          onClick={() => {
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
                            const safeName = selectedRes.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            link.setAttribute("download", `${safeName}_popular_groceries_template.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-800 font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                          title="Download Popular Items spreadsheet template"
                        >
                          <Download className="w-3.5 h-3.5" /> Export CSV Template
                        </button>
                        
                        <label className="px-5 py-3 bg-emerald-600 border border-transparent hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-600/10 whitespace-nowrap">
                          <Upload className="w-4 h-4" /> Import CSV
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                if (!text) return;
                                
                                const parsedLines = parseCSV(text);
                                if (parsedLines.length <= 1) {
                                  alert("The selected CSV file is empty or invalid. Make sure it contains a header row.");
                                  return;
                                }
                                
                                const headers = parsedLines[0].map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
                                const nameIdx = headers.indexOf("item name") !== -1 ? headers.indexOf("item name") : headers.indexOf("item");
                                const descIdx = headers.indexOf("description") !== -1 ? headers.indexOf("description") : headers.indexOf("desc");
                                const priceIdx = headers.indexOf("price") !== -1 ? headers.indexOf("price") : headers.indexOf("cost");
                                
                                if (nameIdx === -1 || priceIdx === -1) {
                                  alert("Invalid CSV structure! The CSV must contain at least 'Item Name' and 'Price' columns.");
                                  e.target.value = "";
                                  return;
                                }
                                
                                const items: MenuItem[] = [];
                                for (let i = 1; i < parsedLines.length; i++) {
                                  if (items.length >= 30) break;
                                  
                                  const rowData = parsedLines[i];
                                  if (rowData.length < Math.max(nameIdx, priceIdx) + 1) continue;
                                  
                                  const name = rowData[nameIdx]?.trim();
                                  if (!name) continue;
                                  
                                  const price = rowData[priceIdx]?.trim() || "R0";
                                  const description = descIdx !== -1 ? rowData[descIdx]?.trim() : "";
                                  
                                  items.push({
                                    name,
                                    description,
                                    price,
                                    availableForDelivery: true
                                  });
                                }
                                
                                if (items.length === 0) {
                                  alert("No valid items were found in the uploaded file.");
                                  e.target.value = "";
                                  return;
                                }
                                
                                handleRestaurantUpdate({ popularGroceryItems: items });
                                alert(`Successfully imported ${items.length} popular grocery items for the quick order form!`);
                                e.target.value = "";
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="p-8 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <h4 className="font-serif font-bold text-slate-700 text-lg">Active Quick Order Items ({selectedRes.popularGroceryItems?.length || 0}/30)</h4>
                        {selectedRes.popularGroceryItems && selectedRes.popularGroceryItems.length > 0 && (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to clear all popular grocery items?")) {
                                handleRestaurantUpdate({ popularGroceryItems: [] });
                              }
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {!selectedRes.popularGroceryItems || selectedRes.popularGroceryItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600 text-sm">No popular items uploaded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Download the CSV template, add your 30 most popular items, and import it above.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedRes.popularGroceryItems.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:bg-emerald-50/20 hover:border-emerald-200 transition-all duration-300 shadow-sm">
                              <div>
                                <div className="text-xs font-mono text-emerald-600 font-bold mb-1">Item #{idx+1}</div>
                                <h5 className="font-serif font-bold text-slate-800 text-sm leading-snug">{item.name}</h5>
                                <p className="text-xs text-slate-500 mt-0.5 min-h-[2rem] line-clamp-2">{item.description || "No description provided"}</p>
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50">
                                <span className="font-bold text-xs text-slate-800">{item.price}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = selectedRes.popularGroceryItems?.filter((_, itemIdx) => itemIdx !== idx) || [];
                                    handleRestaurantUpdate({ popularGroceryItems: filtered });
                                  }}
                                  className="text-xs text-red-400 hover:text-red-600 font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Bulk Menu CSV Import/Export Panel */}
                  <div className="p-8 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-lucy-700" />
                        Bulk Menu & Price Management
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 max-w-xl">
                        Seamlessly update prices or add new dishes. Download the template below, modify details in any spreadsheet app, and re-import it.
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => exportCSVForRestaurant(selectedRes)}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:border-lucy-400 text-slate-700 hover:text-lucy-800 font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                          title="Download spreadsheet-compatible CSV file"
                        >
                          <Download className="w-3.5 h-3.5" /> CSV Menu
                        </button>

                        <button
                          type="button"
                          onClick={() => exportTXTForRestaurant(selectedRes)}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:border-lucy-400 text-slate-700 hover:text-lucy-800 font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                          title="Download beautifully formatted plain text menu for print/offline use"
                        >
                          <Download className="w-3.5 h-3.5" /> Plain Text Menu
                        </button>

                        <button
                          type="button"
                          onClick={() => exportJSONForRestaurant(selectedRes)}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:border-lucy-400 text-slate-700 hover:text-lucy-800 font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                          title="Download structured JSON configuration backup"
                        >
                          <Download className="w-3.5 h-3.5" /> JSON Data
                        </button>

                        {selectedRes.image && (
                          <button
                            type="button"
                            onClick={() => downloadImageDirect(selectedRes.image, `${selectedRes.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_logo.jpg`)}
                            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-lucy-400 text-slate-700 hover:text-lucy-800 font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            title="Directly download the restaurant's logo/banner photo"
                          >
                            <Download className="w-3.5 h-3.5" /> Logo Photo
                          </button>
                        )}
                      </div>

                      <div className="h-px sm:h-8 w-full sm:w-px bg-slate-200 mx-1"></div>

                      <label className="px-5 py-3 bg-lucy-900 border border-transparent hover:bg-lucy-800 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-lucy-900/10 whitespace-nowrap">
                        <Upload className="w-4 h-4" /> Import CSV
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleImportCSV}
                        />
                      </label>
                    </div>
                  </div>

                  {selectedRes.menu.map((sec, sIdx) => (
                    <div key={sec.id} className="border-b last:border-0">
                      <div className="bg-slate-50 p-6 font-serif font-bold text-slate-700 text-lg flex justify-between items-center">
                        {sec.title}
                        <button className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {sec.content.map((sub, subIdx) =>
                        sub.items.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            onDoubleClick={() =>
                              setEditItem({
                                s: sIdx,
                                sub: subIdx,
                                i: iIdx,
                                item,
                              })
                            }
                            className="p-6 flex items-center justify-between hover:bg-slate-50 cursor-pointer border-t first:border-t-0 border-slate-100"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                <ShoppingBag className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.price}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                  Delivery
                                </span>
                                <input
                                  type="checkbox"
                                  checked={item.availableForDelivery !== false}
                                  onChange={(e) =>
                                    updateItem(sIdx, subIdx, iIdx, {
                                      ...item,
                                      availableForDelivery: e.target.checked,
                                    })
                                  }
                                  className="w-5 h-5 text-lucy-600 rounded-lg border-slate-300 focus:ring-lucy-600"
                                />
                              </div>
                              <button
                                onClick={() =>
                                  setEditItem({
                                    s: sIdx,
                                    sub: subIdx,
                                    i: iIdx,
                                    item,
                                  })
                                }
                                className="p-3 bg-slate-100 hover:bg-lucy-50 text-slate-400 hover:text-lucy-600 rounded-xl transition-all"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )),
                      )}
                    </div>
                  ))}
                </div>
                )
              ) : restaurantTab === "accounting" ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Total Orders
                      </p>
                      <p className="text-3xl font-serif font-bold text-slate-800">
                        {
                          orders.filter(
                            (o) => o.restaurantId === selectedRes.id,
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Total Sales
                      </p>
                      <p className="text-3xl font-serif font-bold text-slate-800">
                        {formatPrice(
                          orders
                            .filter((o) => o.restaurantId === selectedRes.id)
                            .reduce((acc, o) => acc + o.subtotal, 0),
                        )}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Commission Owed (15%)
                      </p>
                      <p className="text-3xl font-serif font-bold text-emerald-600">
                        {formatPrice(
                          Math.round(
                            orders
                              .filter((o) => o.restaurantId === selectedRes.id)
                              .reduce((acc, o) => acc + o.commission, 0),
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b bg-slate-50 font-serif font-bold text-slate-800">
                      Order History
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Items</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Commission</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orders
                            .filter((o) => o.restaurantId === selectedRes.id)
                            .map((o) => (
                              <tr
                                key={o.id}
                                className="text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-6 py-4 font-mono text-xs">
                                  {o.id}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                  {o.customerName}
                                </td>
                                <td className="px-6 py-4 truncate max-w-[200px]">
                                  {o.items
                                    .map((i) => `${i.quantity}x ${i.name}`)
                                    .join(", ")}
                                </td>
                                <td className="px-6 py-4 font-bold">
                                  {formatPrice(o.total)}
                                </td>
                                <td className="px-6 py-4 text-emerald-600 font-bold">
                                  {formatPrice(Math.round(o.commission))}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                      o.status === "delivered"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-lucy-100 rounded-xl text-lucy-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-serif font-bold text-slate-800">
                          Profile Information
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Restaurant Name
                        </label>
                        <input
                          type="text"
                          value={selectedRes.name}
                          onChange={(e) =>
                            handleRestaurantUpdate({ name: e.target.value })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Email Address (For Orders)
                          </label>
                          <input
                            type="email"
                            value={selectedRes.email || ""}
                            onChange={(e) =>
                              handleRestaurantUpdate({ email: e.target.value })
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                            placeholder="orders@restaurant.com"
                          />
                          <p className="text-[10px] text-slate-400 italic mt-1">
                            Orders will be sent to this address
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Telephone Number
                          </label>
                          <input
                            type="tel"
                            value={selectedRes.phone || ""}
                            onChange={(e) =>
                              handleRestaurantUpdate({ phone: e.target.value })
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                            placeholder="028 123 4567"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Person Responsible
                        </label>
                        <input
                          type="text"
                          value={selectedRes.responsiblePerson || ""}
                          onChange={(e) =>
                            handleRestaurantUpdate({
                              responsiblePerson: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                          placeholder="Manager Name"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Delivery Time
                          </label>
                          <input
                            type="text"
                            value={selectedRes.deliveryTime || ""}
                            onChange={(e) =>
                              handleRestaurantUpdate({
                                deliveryTime: e.target.value,
                              })
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                            placeholder="30-45 min"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Rating
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={selectedRes.rating || 0}
                            onChange={(e) =>
                              handleRestaurantUpdate({
                                rating: parseFloat(e.target.value),
                              })
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Category
                        </label>
                        <input
                          type="text"
                          value={selectedRes.category}
                          onChange={(e) =>
                            handleRestaurantUpdate({ category: e.target.value })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${selectedRes.isVisible !== false ? "bg-lucy-100 text-lucy-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            {selectedRes.isVisible !== false ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Visible on Main Page
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Toggle to hide this restaurant from customers
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRestaurantUpdate({
                              isVisible:
                                selectedRes.isVisible !== false ? false : true,
                            })
                          }
                          className={`w-12 h-6 rounded-full transition-colors relative ${selectedRes.isVisible !== false ? "bg-lucy-600" : "bg-slate-300"}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedRes.isVisible !== false ? "right-1" : "left-1"}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${selectedRes.isGroceryStore ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Retail Grocery Store
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Enables custom grocery pick list builder and quick order forms
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRestaurantUpdate({
                              isGroceryStore: !selectedRes.isGroceryStore,
                              category: !selectedRes.isGroceryStore ? "Retail Grocery Store" : "Restaurant"
                            })
                          }
                          className={`w-12 h-6 rounded-full transition-colors relative ${selectedRes.isGroceryStore ? "bg-emerald-600" : "bg-slate-300"}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedRes.isGroceryStore ? "right-1" : "left-1"}`}
                          />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Description
                        </label>
                        <textarea
                          value={selectedRes.description}
                          onChange={(e) =>
                            handleRestaurantUpdate({
                              description: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lucy-600 h-32 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-lucy-100 rounded-xl text-lucy-700">
                          <Upload className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-serif font-bold text-slate-800">
                          Media Assets
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Cover Image
                        </label>
                        <ImageUpload
                          onUpload={(url) =>
                            handleRestaurantUpdate({ image: url })
                          }
                          currentImage={selectedRes.image}
                        />
                        <div className="mt-4 h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group relative">
                          <img
                            src={selectedRes.image}
                            alt="Preview"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                      </div>

                      <div 
                        onClick={() => !isStorageUploading && storageInputRef.current?.click()}
                        className={`p-6 bg-slate-50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-2 transition-all cursor-pointer ${isStorageUploading ? "border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed" : "border-slate-300 hover:border-lucy-600 hover:bg-lucy-50/40 active:scale-[0.99]"}`}
                      >
                        <input
                          type="file"
                          ref={storageInputRef}
                          className="hidden"
                          onChange={handleStorageFileChange}
                          disabled={isStorageUploading}
                          accept="image/*"
                        />
                        <div className={`p-3 rounded-full shadow-xs ${isStorageUploading ? "bg-slate-100 text-slate-400" : uploadedStorageUrl ? "bg-emerald-50 text-emerald-600" : "bg-white text-slate-400"}`}>
                          {isStorageUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : uploadedStorageUrl ? (
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {isStorageUploading ? "Uploading..." : uploadedStorageUrl ? "Upload Succeeded!" : "Upload Image"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {uploadedStorageUrl ? "Image uploaded & set as restaurant image" : "Upload a restaurant image"}
                          </p>
                        </div>

                        {storageError && (
                          <div className="mt-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{storageError}</span>
                          </div>
                        )}

                        {uploadedStorageUrl && (
                          <div className="mt-3 flex flex-col items-center gap-2 w-full max-w-xs animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-full flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200 text-slate-600 text-xs shadow-xs">
                              <span className="truncate flex-1 text-left select-all px-2 font-mono">
                                {uploadedStorageUrl}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(uploadedStorageUrl);
                                  alert("Download URL copied to clipboard!");
                                }}
                                className="px-3 py-1.5 bg-lucy-900 text-white font-bold rounded-lg hover:bg-lucy-800 text-[10px] uppercase tracking-wide transition-all active:scale-95"
                              >
                                Copy Url
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button className="w-full bg-lucy-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-lucy-900/20 hover:bg-lucy-900 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" /> Save Profile & Photos
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "orders" ? (
            <OrdersTab
              orders={orders}
              drivers={drivers}
              onUpdateOrders={onUpdateOrders}
              loggedInUser={loggedInUser}
            />
          ) : activeTab === "accounting" ? (
            <AccountingTab orders={orders} />
          ) : activeTab === "drivers" ? (
            <DriversTab
              drivers={drivers}
              shifts={shifts}
              onUpdateDrivers={onUpdateDrivers}
              onUpdateShifts={onUpdateShifts}
            />
          ) : activeTab === "menu" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Menu Management
              </h2>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {menu.map((sec, sIdx) => (
                  <div key={sec.id} className="border-b last:border-0">
                    <div className="bg-slate-50 p-4 font-bold text-slate-700">
                      {sec.title}
                    </div>
                    {sec.content.map((sub, subIdx) =>
                      sub.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          onDoubleClick={() =>
                            setEditItem({ s: sIdx, sub: subIdx, i: iIdx, item })
                          }
                          className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-800">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.price}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={item.availableForDelivery !== false}
                              onChange={(e) =>
                                updateItem(sIdx, subIdx, iIdx, {
                                  ...item,
                                  availableForDelivery: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-lucy-600 rounded"
                            />
                            <button
                              onClick={() =>
                                setEditItem({
                                  s: sIdx,
                                  sub: subIdx,
                                  i: iIdx,
                                  item,
                                })
                              }
                              className="text-slate-300 hover:text-lucy-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "modifiers" ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Modifiers</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupKey}
                    onChange={(e) => setNewGroupKey(e.target.value)}
                    placeholder="New Group Name"
                    className="p-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      if (newGroupKey && !modifierDefs[newGroupKey]) {
                        onUpdateModifierDefs({
                          ...modifierDefs,
                          [newGroupKey]: [],
                        });
                        setNewGroupKey("");
                      }
                    }}
                    className="bg-lucy-800 text-white px-4 py-2 rounded-lg font-bold text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.entries(modifierDefs) as [string, string[]][]).map(
                  ([mKey, mOptions]) => (
                    <ModifierGroupEditor
                      key={mKey}
                      groupKey={mKey}
                      options={mOptions}
                      onAddOption={(o) => {
                        if (!mOptions.includes(o)) {
                          onUpdateModifierDefs({
                            ...modifierDefs,
                            [mKey]: [...mOptions, o],
                          });
                        }
                      }}
                      onRemoveOption={(o) => {
                        onUpdateModifierDefs({
                          ...modifierDefs,
                          [mKey]: mOptions.filter((x) => x !== o),
                        });
                      }}
                      onDeleteGroup={() => {
                        if (window.confirm(`Delete "${mKey}"?`)) {
                          const newDefs = { ...modifierDefs };
                          delete newDefs[mKey];
                          onUpdateModifierDefs(newDefs);
                        }
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          ) : activeTab === "onboarding" ? (
            <OnboardingTab />
          ) : (
            <SystemTab />
          )}
        </div>
      </div>
    </div>
  );
};

const CartDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQty,
  onClear,
  onCheckout,
}) => {
  const total = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[70]"
          onClick={() => {
            onClose();
          }}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-[80] transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-5 border-b flex justify-between items-center bg-stone-50 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2 text-slate-800">
            <ShoppingBag className="w-6 h-6" /> Your Order
          </h2>
          <button
            onClick={() => {
              onClose();
            }}
            className="p-2 text-slate-500 hover:bg-stone-200 rounded-full transition-colors active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm relative group"
              >
                <button
                  onClick={() => {
                    onRemove(item.id);
                  }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <h4 className="font-bold text-slate-800 pr-6">
                  {item.menuItem.name}
                </h4>
                <div className="text-xs text-slate-500 my-1">
                  {Object.entries(item.selectedModifiers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </div>
                <div className="font-bold text-lucy-800">
                  {formatPrice(item.totalPrice)}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      onUpdateQty(item.id, -1);
                    }}
                    className="p-1 bg-stone-100 rounded hover:bg-stone-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      onUpdateQty(item.id, 1);
                    }}
                    className="p-1 bg-stone-100 rounded hover:bg-stone-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-6 border-t bg-stone-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Total</span>
              <span className="text-2xl font-bold text-slate-800">
                {formatPrice(total)}
              </span>
            </div>
            <button
              onClick={() => {
                onCheckout();
              }}
              className="w-full bg-lucy-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-lucy-800/20 mb-3 hover:bg-lucy-900 active:scale-[0.98] transition-all"
            >
              Secure Checkout
            </button>
            <button
              onClick={() => {
                onClear();
              }}
              className="w-full text-slate-400 text-sm font-medium hover:text-red-500 transition-colors active:opacity-70"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [restaurants, setRestaurants] =
    useState<Restaurant[]>(initialRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuSection[]>([]);
  const [modifierDefs, setModifierDefs] = useState<Record<string, string[]>>(
    INITIAL_MODIFIER_DEFS,
  );
  const [currentView, setCurrentView] = useState<ViewState>(
    "restaurant-selection",
  );
  // Load from Firestore on mount, seed with initial data if empty
  useEffect(() => {
    seedIfEmpty().then(setRestaurants);
  }, []);



  // Save to Firestore whenever admin changes data
  const saveAndSetRestaurants = useCallback((updated: Restaurant[] | ((prev: Restaurant[]) => Restaurant[])) => {
    setRestaurants((prev) => {
      const next = typeof updated === "function" ? updated(prev) : updated;
      saveRestaurants(next).catch(console.error);
      return next;
    });
  }, []);

  const [loggedInUser, setLoggedInUser] = useState<{
    role: "admin" | "driver";
    id?: string;
  } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [isCollectionMode, setIsCollectionMode] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Accounting & Driver State
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: "1",
      name: "John Driver",
      phone: "0712345678",
      email: "john@greytondelivery.co.za",
      password: "password123",
      pin: "123456",
      isClockedIn: false,
    },
    {
      id: "2",
      name: "Sarah Driver",
      phone: "0787654321",
      email: "sarah@greytondelivery.co.za",
      password: "password123",
      pin: "654321",
      isClockedIn: false,
    },
  ]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const mergedMenu = useMemo(() => {
    const sections: Record<string, MenuSection> = {};
    restaurants
      .filter((r) => r.isVisible !== false)
      .forEach((r) => {
        r.menu.forEach((s) => {
          if (!sections[s.id]) {
            sections[s.id] = {
              ...s,
              content: s.content.map((sub) => ({
                ...sub,
                items: sub.items.map((i) => ({
                  ...i,
                  restaurantId: r.id,
                  restaurantName: r.name,
                })),
              })),
            };
          } else {
            s.content.forEach((sub) => {
              const existingSub = sections[s.id].content.find(
                (es) => es.title === sub.title,
              );
              if (existingSub) {
                existingSub.items.push(
                  ...sub.items.map((i) => ({
                    ...i,
                    restaurantId: r.id,
                    restaurantName: r.name,
                  })),
                );
              } else {
                sections[s.id].content.push({
                  ...sub,
                  items: sub.items.map((i) => ({
                    ...i,
                    restaurantId: r.id,
                    restaurantName: r.name,
                  })),
                });
              }
            });
          }
        });
      });
    return Object.values(sections);
  }, []);

  const pizzaToppings = useMemo(() => {
    const pizzaSection = menu.find((s) => s.id === "pizza");
    if (!pizzaSection) return [];
    const buildYourOwn = pizzaSection.content.find(
      (sub) => sub.title === "Build Your Own",
    );
    if (!buildYourOwn) return [];
    const toppings: { label: string; price: string }[] = [];
    buildYourOwn.items.forEach((group) => {
      if (group.description) {
        group.description.split(",").forEach((itemName) => {
          const clean = itemName.trim().replace(/\.$/, "");
          if (clean) toppings.push({ label: clean, price: group.price });
        });
      } else {
        toppings.push({ label: group.name, price: group.price });
      }
    });
    return toppings;
  }, [menu]);

  const burgerToppings = useMemo(() => {
    const mainsSection = menu.find((s) => s.id === "mains");
    if (!mainsSection) return [];
    const toppingsSub = mainsSection.content.find(
      (sub) => sub.title === "Burger Toppings",
    );
    return toppingsSub
      ? toppingsSub.items.map((item) => ({
          label: item.name,
          price: item.price,
        }))
      : [];
  }, [menu]);

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    setCurrentView("detail");
  };
  const handleBackToDashboard = () => {
    setSelectedCategoryId(null);
    setCurrentView("dashboard");
  };
  const handleBackToLanding = () => {
    setCurrentView("restaurant-selection");
  };
  const handleLoginSuccess = (user: {
    role: "admin" | "driver";
    id?: string;
  }) => {
    setLoggedInUser(user);
    setCurrentView("backoffice");
  };
  const handleLogout = () => {
    setCurrentView("restaurant-selection");
  };
  const handleMenuUpdate = (updatedMenu: MenuSection[]) => setMenu(updatedMenu);
  const handleModifierDefsUpdate = (newDefs: Record<string, string[]>) =>
    setModifierDefs(newDefs);

  const handleRestaurantSelect = (r: Restaurant) => {
    setSelectedRestaurant(r);
    // Inject restaurant info into menu items
    const restaurantMenu = r.menu.map((s) => ({
      ...s,
      content: s.content.map((sub) => ({
        ...sub,
        items: sub.items.map((i) => ({
          ...i,
          restaurantId: r.id,
          restaurantName: r.name,
        })),
      })),
    }));
    setMenu(restaurantMenu);
    setCurrentView("full-menu");
  };

  const handleBackToRestaurantSelection = () => {
    setSelectedRestaurant(null);
    setCurrentView("restaurant-selection");
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    setIsCartOpen(true);
  };
  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));
  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          const unitPrice = item.totalPrice / item.quantity;
          return { ...item, quantity: newQty, totalPrice: unitPrice * newQty };
        }
        return item;
      }),
    );
  };
  const clearCart = () => setCart([]);

  const handleCheckoutSuccess = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    clearCart();
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCurrentView("restaurant-selection");
    setSelectedRestaurant(null);
  };

  return (
    <div className="min-h-screen font-sans bg-stone-50 text-slate-800 flex flex-col relative overflow-hidden">
      {(currentView === "restaurant-selection" ||
        currentView === "restaurant-landing" ||
        currentView === "dashboard") && <BackgroundSlideshow />}
      <div className="relative z-10 flex-1 flex flex-col">
        {currentView === "detail" && selectedCategoryId ? (
          <DetailView
            section={menu.find((c) => c.id === selectedCategoryId)!}
            onBack={handleBackToDashboard}
            isCollectionMode={isCollectionMode}
          />
        ) : currentView === "full-menu" ? (
          selectedRestaurant?.isGroceryStore ? (
            <GroceryPickListBuilder
              restaurant={selectedRestaurant}
              onBack={handleBackToRestaurantSelection}
              onSubmitOrder={(o) => {
                setOrders((prev) => [o, ...prev]);
              }}
            />
          ) : (
            <FullMenuView
              menu={menu}
              onBack={handleBackToRestaurantSelection}
              restaurantName={selectedRestaurant?.name}
              modifierDefs={modifierDefs}
              onAddToCart={addToCart}
              cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
              onOpenCart={() => setIsCartOpen(true)}
              pizzaToppings={pizzaToppings}
              burgerToppings={burgerToppings}
              restaurant={selectedRestaurant || undefined}
            />
          )
        ) : currentView === "collection-menu" ? (
          <CollectionMenuView
            menu={mergedMenu}
            modifierDefs={modifierDefs}
            onBack={handleBackToRestaurantSelection}
            onAddToCart={addToCart}
            cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
            onOpenCart={() => setIsCartOpen(true)}
            pizzaToppings={pizzaToppings}
            burgerToppings={burgerToppings}
          />
        ) : currentView === "login" ? (
          <LoginView
            onSuccess={handleLoginSuccess}
            onCancel={handleBackToLanding}
            drivers={drivers}
          />
        ) : currentView === "driver-login" ? (
          <DriverLoginView
            onSuccess={handleLoginSuccess}
            onCancel={handleBackToLanding}
            drivers={drivers}
          />
        ) : currentView === "backoffice" ? (
          <BackOfficeView
            restaurants={restaurants}
            onUpdateRestaurants={saveAndSetRestaurants}
            menu={menu}
            modifierDefs={modifierDefs}
            onUpdate={handleMenuUpdate}
            onUpdateModifierDefs={handleModifierDefsUpdate}
            onLogout={handleLogout}
            orders={orders}
            drivers={drivers}
            shifts={shifts}
            onUpdateOrders={setOrders}
            onUpdateDrivers={setDrivers}
            onUpdateShifts={setShifts}
            loggedInUser={loggedInUser}
          />
        ) : currentView === "dashboard" ? (
          <DashboardView
            menu={menu}
            onSelect={handleCategorySelect}
            onBack={handleBackToLanding}
            isCollectionMode={isCollectionMode}
          />
        ) : (
          <RestaurantSelectionView
            restaurants={restaurants}
            onSelect={handleRestaurantSelect}
            onLoginRequest={() => setCurrentView("login")}
            onDriverLoginRequest={() => setCurrentView("driver-login")}
          />
        )}
      </div>
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        onUpdateQty={updateCartQuantity}
        onClear={clearCart}
        onCheckout={() => setIsCheckoutOpen(true)}
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        total={cart.reduce((acc, item) => acc + item.totalPrice, 0)}
        onSuccess={handleCheckoutSuccess}
        restaurantName={selectedRestaurant?.name || "Greyton Go"}
        restaurantId={selectedRestaurant?.id || ""}
      />
    </div>
  );
};

export default App;
