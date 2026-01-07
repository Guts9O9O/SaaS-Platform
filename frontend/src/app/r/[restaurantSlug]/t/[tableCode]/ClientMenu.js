"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cart from "../../../../components/Cart";
import CartDrawer from "../../../../components/CartDrawer";
import { io } from "socket.io-client";
import useMenuContext from "./hooks/useMenuContext";
import CustomerAuth from "../../../../components/CustomerAuth";

const getTableSessionKey = (restaurantSlug, tableCode) =>
  `table_auth_${restaurantSlug}_${tableCode}`;

function getItemImage(item) {
  // 1️⃣ New schema (correct)
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const img = item.images[0];
    // absolute vs relative safety
    if (img.startsWith("http")) return img;
    return `${process.env.NEXT_PUBLIC_API_URL}${img}`;
  }

  // 2️⃣ Legacy fallbacks (keep for safety)
  return (
    item?.imageUrl ||
    item?.image ||
    item?.photo ||
    item?.photoUrl ||
    item?.thumbnail ||
    ""
  );
}

function moneyINR(n) {
  const num = Number(n || 0);
  return `₹${num}`;
}

const DEV_IMAGE_MAP = {
  "Spring Roll": "/Spring-Roll-Recipe.jpg",
  "Paneer Butter Masala": "/paneer-butter-masala.jpg",
  "Cold Coffee": "/cold-coffee.jpg",
  "Garlic Naan": "/Garlic-naan.jpg",
};

// Category emoji mapping
const CATEGORY_EMOJIS = {
  "ALL": "🍽️",
  "STARTER": "🥗",
  "MAIN COURSE": "🍛",
  "DESSERT": "🍰",
  "BEVERAGES": "🥤",
  "BURGERS": "🍔",
  "PIZZA": "🍕",
  "SANDWICH": "🥪",
  "FRUITS": "🍓",
};

function getCategoryEmoji(categoryName) {
  const upper = String(categoryName || "").toUpperCase();
  return CATEGORY_EMOJIS[upper] || "🍴";
}

export default function ClientMenu({ restaurantSlug, tableCode }) {
  const { loading, error, context } = useMenuContext({
    restaurantSlug,
    tableCode,
  });

  const [menuData, setMenuData] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("menu");
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [billRequested, setBillRequested] = useState(false);
  const billCooldownTimerRef = useRef(null);
  const socketRef = useRef(null);
  const joinedOrdersRef = useRef(new Set());
  const [search, setSearch] = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("ALL");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const waiterCooldownRef = useRef(null);

  useEffect(() => {
    if (!context?.restaurant?.slug) return;
    let cancelled = false;
    const fetchMenu = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/menu-context/context?restaurantSlug=${restaurantSlug}&tableCode=${tableCode}`
        );
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        const normalized = (data.categories || []).map((cat, catIndex) => {
          const catRealId = cat._id || cat.id;
          const catKeyId = catRealId || `cat_${catIndex}`;
          const items = (cat.items || []).map((item, itemIndex) => {
            const realId = item._id || item.id || item.itemId;
            const keyId = realId || `item_${catIndex}_${itemIndex}`;
            return { ...item, _id: realId, _keyId: keyId };
          });
          return { ...cat, _id: catRealId, _keyId: catKeyId, items };
        });
        if (!cancelled) setMenuData(normalized);
      } catch (err) {
        if (!cancelled) setMenuError(err.message);
      }
    };
    fetchMenu();
    return () => { cancelled = true; };
  }, [context?.restaurant?.slug]);

  useEffect(() => {
    if (!context?.restaurant?._id) return;
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/me`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCustomer(data.customer || null);
        } else {
          if (!cancelled) setCustomer(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        if (!cancelled) setCustomer(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [context?.restaurant?._id]);

  async function refreshTableOrders() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders/my`,
        { credentials: "include" }
      );
      const data = await res.json();
      const orders = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
      setTableOrders(orders);
    } catch (err) {
      console.error("Failed to refresh orders", err);
      setTableOrders([]);
    }
  }

  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadingOrders(true);
    refreshTableOrders().finally(() => setLoadingOrders(false));
  }, [activeTab]);

  async function callWaiter() {
    const payload = {
      restaurantId: context.restaurant._id || context.restaurant.id,
      tableId: context.table._id || context.table.id,
      tableCode: context.table.tableCode,
      type: "WAITER",
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to call waiter");
    return data;
  }

  function startWaiterCooldown(ms = 2 * 60 * 1000) {
    setWaiterCalled(true);
    if (waiterCooldownRef.current) clearTimeout(waiterCooldownRef.current);
    waiterCooldownRef.current = setTimeout(() => {
      setWaiterCalled(false);
      waiterCooldownRef.current = null;
    }, ms);
  }

  useEffect(() => {
    return () => {
      if (waiterCooldownRef.current) clearTimeout(waiterCooldownRef.current);
    };
  }, []);

  async function requestBill() {
    const payload = {
      restaurantId: context.restaurant._id || context.restaurant.id,
      tableId: context.table._id || context.table.id,
      tableCode: context.table.tableCode,
    };
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests/bill`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to request bill");
    return data;
  }

  function startBillCooldown(ms = 2 * 60 * 1000) {
    setBillRequested(true);
    if (billCooldownTimerRef.current) clearTimeout(billCooldownTimerRef.current);
    billCooldownTimerRef.current = setTimeout(() => {
      setBillRequested(false);
      billCooldownTimerRef.current = null;
    }, ms);
  }

  useEffect(() => {
    return () => {
      if (billCooldownTimerRef.current) clearTimeout(billCooldownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "orders") return;
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
      socketRef.current.on("order_status", ({ order }) => {
        if (!order?._id) return;
        setTableOrders((prev) =>
          prev.map((o) => o._id === order._id ? { ...o, status: order.status } : o)
        );
      });
    }
    const socket = socketRef.current;
    for (const o of tableOrders) {
      const id = o?._id;
      if (!id) continue;
      if (joinedOrdersRef.current.has(id)) continue;
      socket.emit("join_order_room", { orderId: id });
      joinedOrdersRef.current.add(id);
    }
  }, [activeTab, tableOrders]);

  function getItemQty(itemId) {
    if (!itemId) return 0;
    const id = String(itemId);
    const found = cartItems.find((i) => String(i.itemId) === id);
    return found ? found.quantity : 0;
  }

  function addToCart(item) {
    setCartItems((prev) => {
      const existing = prev.find((i) => String(i.itemId) === String(item._id));
      if (existing) {
        return prev.map((i) =>
          String(i.itemId) === String(item._id) ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { itemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function increaseQty(itemId) {
    setCartItems((prev) =>
      prev.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQty(itemId) {
    setCartItems((prev) =>
      prev.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, quantity: item.quantity - 1 } : item
      ).filter((item) => item.quantity > 0)
    );
  }

  async function placeOrder() {
    try {
      const payload = {
        restaurantId: context.restaurant._id || context.restaurant.id,
        tableId: context.table._id || context.table.id,
        items: cartItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Order failed");
      }
      setCartItems([]);
      setIsCartOpen(false);
      setActiveTab("orders");
      setShowOrderPlacedModal(true);
    } catch (err) {
      alert(err.message);
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const categories = useMemo(() => {
    const cats = Array.isArray(menuData) ? menuData : [];
    return [
      { _keyId: "ALL", name: "All", items: [] },
      ...cats.map((c) => ({ _keyId: c._keyId, name: c.name, items: c.items })),
    ];
  }, [menuData]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cats = Array.isArray(menuData) ? menuData : [];
    const byCategory = activeCategoryKey === "ALL" ? cats : cats.filter((c) => c._keyId === activeCategoryKey);
    if (!q) return byCategory;
    return byCategory
      .map((cat) => ({
        ...cat,
        items: (cat.items || []).filter((it) => String(it.name || "").toLowerCase().includes(q)),
      }))
      .filter((cat) => (cat.items || []).length > 0);
  }, [menuData, search, activeCategoryKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-gray-400">
        Loading menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-red-500 text-center px-6">
        {error}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <CustomerAuth
        restaurantName={context?.restaurant?.name}
        onSuccess={(cust) => setCustomer(cust)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-white">
      <div className="w-full max-w-md mx-auto px-4 py-6 pb-32 relative">
        {/* HEADER */}
        <div className="relative rounded-3xl p-6 mb-6 overflow-hidden bg-gradient-to-br from-neutral-900/80 via-neutral-800/50 to-neutral-900/70 border border-neutral-700/40 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-neutral-700/20 via-transparent to-transparent"></div>
          
          <div className="relative">
            {/* Restaurant Info */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-white mb-1">
                Find Your
              </h1>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Delicious Food
              </h2>
              <div className="flex items-center gap-2 mt-3">
                <p className="text-sm text-gray-400">
                  {context.restaurant.name} • Table {context.table.tableCode}
                </p>
              </div>
              {customer && (
                <p className="text-xs text-emerald-400/80 font-medium mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Welcome, {customer.name}
                </p>
              )}
            </div>

            {activeTab === "menu" && (
              <>
                {/* Search Bar */}
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔎︎</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search dishes..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/30 border border-neutral-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-neutral-600 focus:bg-black/40 transition"
                  />
                </div>

                {/* Category Pills with Emojis */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {categories.map((c) => (
                    <button
                      key={c._keyId}
                      onClick={() => setActiveCategoryKey(c._keyId)}
                      className={`flex flex-col items-center justify-center min-w-[70px] transition-all ${
                        activeCategoryKey === c._keyId ? "" : ""
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1 transition-all ${
                        activeCategoryKey === c._keyId
                          ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30"
                          : "bg-neutral-800/60 border border-neutral-700/40"
                      }`}>
                        {getCategoryEmoji(c.name)}
                      </div>
                      <span className={`text-xs font-medium ${
                        activeCategoryKey === c._keyId ? "text-white" : "text-gray-400"
                      }`}>
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6">
          {["menu", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-neutral-800/60 text-gray-400 border border-neutral-700/40 hover:bg-neutral-800"
              }`}
            >
              {tab === "menu" ? "Menu" : "My Orders"}
            </button>
          ))}
        </div>

        {/* MENU TAB - GRID LAYOUT */}
        {activeTab === "menu" && (
          <div>
            {!menuData && !menuError ? (
              <MenuSkeleton />
            ) : Array.isArray(menuData) && menuData.length === 0 ? (
              <p className="text-zinc-400 text-center mt-10">Menu is not available right now</p>
            ) : Array.isArray(filteredMenu) ? (
              filteredMenu.map((cat) => (
                <div key={cat._keyId} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{cat.name}</h3>
                  </div>

                  {/* 2-COLUMN GRID */}
                  <div className="grid grid-cols-2 gap-4">
                    {(cat.items || []).map((item) => (
                      <MenuItemCard
                        key={item._keyId}
                        item={item}
                        qty={getItemQty(item._id)}
                        onAdd={() => {
                          if (!item._id) return alert("Item id missing in DB. Please re-seed menu items.");
                          addToCart(item);
                        }}
                        onInc={() => increaseQty(item._id)}
                        onDec={() => decreaseQty(item._id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : null}

            {Array.isArray(menuData) && Array.isArray(filteredMenu) && filteredMenu.length === 0 && (
              <div className="mt-10 text-center">
                <p className="text-zinc-300 font-semibold">No matches found</p>
                <p className="text-zinc-500 text-sm mt-1">Try a different keyword.</p>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {loadingOrders ? (
              <OrdersSkeleton />
            ) : tableOrders.length === 0 ? (
              <p className="text-zinc-400 text-sm">No orders placed yet.</p>
            ) : (
              tableOrders.map((order) => (
                <div key={order._id} className="rounded-3xl p-5 bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 border border-neutral-700/40 backdrop-blur-sm">
                  <div className="flex justify-between mb-3">
                    <p className="text-sm text-gray-400">Order #{order._id.slice(-5)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <ul className="text-sm space-y-2 text-zinc-200">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate text-gray-300">{item.name}</span>
                        <span className="text-amber-400 font-medium">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* FLOATING CART BUTTON */}
        {activeTab === "menu" && cartItems.length > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xl shadow-amber-500/40 flex items-center justify-center hover:scale-110 transition-transform z-50"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
              {cartCount}
            </span>
          </button>
        )}

        {/* BOTTOM BAR */}
        {activeTab === "menu" && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-xl border-t border-neutral-800/60 px-4 py-4">
            <div className="max-w-md mx-auto flex justify-between items-center gap-3">
              <div className="min-w-0">
                {cartItems.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-400">{cartCount} items in cart</p>
                    <p className="text-lg font-bold text-white">{moneyINR(cartTotal)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400">Need the bill?</p>
                    <p className="text-sm font-semibold text-white">Tap Request Bill</p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {/* Call Waiter */}
                <button
                  disabled={waiterCalled}
                  onClick={async () => {
                    try {
                      const ok = window.confirm(`Call waiter for Table ${context.table.tableCode}?`);
                      if (!ok) return;
                      await callWaiter();
                      startWaiterCooldown();
                    } catch (e) {
                      alert(e?.message || "Failed to call waiter");
                    }
                  }}
                  className={`px-4 py-3 rounded-2xl font-bold transition-all ${
                    waiterCalled
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800/80 text-white border border-neutral-700/60 hover:bg-neutral-800"
                  }`}
                >
                  {waiterCalled ? "✓ Waiter Called" : "Call Waiter"}
                </button>

                {/* Request Bill */}
                <button
                  disabled={billRequested}
                  onClick={async () => {
                    try {
                      const ok = window.confirm(`Request the bill for Table ${context.table.tableCode}?`);
                      if (!ok) return;
                      await requestBill();
                      startBillCooldown(2 * 60 * 1000);
                    } catch (e) {
                      alert(e?.message || "Failed to request bill");
                    }
                  }}
                  className={`px-4 py-3 rounded-2xl font-bold transition-all ${
                    billRequested
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-800/80 text-white border border-neutral-700/60 hover:bg-neutral-800"
                  }`}
                >
                  {billRequested ? "✓ Bill Requested" : "Request Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart cartItems={cartItems} onIncrease={increaseQty} onDecrease={decreaseQty} />
          <div className="mt-4 border-t border-neutral-700/40 pt-4 flex justify-between items-center gap-3">
            <div>
              <p className="text-xs text-gray-400">{cartCount} items</p>
              <p className="text-xl font-bold text-white">{moneyINR(cartTotal)}</p>
            </div>
            <button
              onClick={() => placeOrder()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
            >
              Place Order
            </button>
          </div>
        </CartDrawer>

        {showOrderPlacedModal && (
          <OrderPlacedModal onClose={() => setShowOrderPlacedModal(false)} />
        )}
      </div>
    </div>
  );
}

/* GRID MENU ITEM CARD - Vertical Layout */
function MenuItemCard({ item, qty, onAdd, onInc, onDec }) {
  const img = getItemImage(item) || DEV_IMAGE_MAP[item?.name] || "/cold-coffee.jpg";

  return (
    <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 border border-neutral-700/40 hover:border-neutral-600/60 transition-all hover:shadow-xl backdrop-blur-sm">
      {/* Image on Top */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900">
        <img
          src={img}
          alt={item?.name || "Menu item"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = "/cold-coffee.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        {/* Veg/Non-veg Badge */}
        {item?.isVeg === true && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded border-2 border-emerald-400 bg-white flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
        )}
        {item?.isVeg === false && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded border-2 border-red-400 bg-white flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
          </div>
        )}
      </div>

      {/* Content Below */}
      <div className="p-3">
        <h3 className="font-bold text-sm text-white mb-1 truncate">{item.name}</h3>
        {item?.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-base font-bold text-white">{moneyINR(item.price)}</p>
          
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-black/40 rounded-xl px-1.5 py-1 border border-neutral-700/40">
              <button onClick={onDec} className="text-amber-400 font-bold px-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              </button>
              <span className="font-bold text-white text-sm min-w-[16px] text-center">{qty}</span>
              <button onClick={onInc} className="text-amber-400 font-bold px-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    ACCEPTED: "bg-yellow-500 text-black",
    PREPARING: "bg-blue-500 text-white",
    SERVED: "bg-emerald-500 text-black",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-zinc-700 text-white"}`}>
      {status}
    </span>
  );
}
function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-neutral-900/60 rounded-3xl h-48 border border-neutral-700/40" />
      ))}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-neutral-900/60 rounded-3xl p-4 h-24 border border-neutral-700/40" />
      ))}
    </div>
  );
}

function OrderPlacedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-gradient-to-br from-neutral-900 to-black rounded-3xl p-8 text-center border border-neutral-700/40 max-w-sm w-full shadow-2xl">
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2 text-white">Order Placed!</h3>
        <p className="text-gray-400 mb-6">Your delicious food is being prepared</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20"
        >
          Track Order
        </button>
      </div>
    </div>
  );
}