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
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const img = item.images[0];
    if (img.startsWith("http")) return img;
    return `${process.env.NEXT_PUBLIC_API_URL}${img}`;
  }
  return (
    item?.imageUrl ||
    item?.image ||
    item?.photo ||
    item?.photoUrl ||
    item?.thumbnail ||
    ""
  );
}

function getItemVideo(item) {
  if (Array.isArray(item?.videos) && item.videos.length > 0) {
    const v = item.videos[0];
    if (!v) return "";
    if (v.startsWith("http")) return v;
    return `${process.env.NEXT_PUBLIC_API_URL}${v}`;
  }
  return "";
}

function moneyINR(n) {
  const num = Number(n || 0);
  return `₹${num.toFixed(2)}`;
}

const DEV_IMAGE_MAP = {
  "Spring Roll": "/Spring-Roll-Recipe.jpg",
  "Paneer Butter Masala": "/paneer-butter-masala.jpg",
  "Cold Coffee": "/cold-coffee.jpg",
  "Garlic Naan": "/Garlic-naan.jpg",
};

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
  "FRIED RICE": "🍚",
  "NOODLES": "🍜",
  "INDIAN": "🍛",
  "SOUPS": "🍲",
  "DESERTS": "🍨",
  "ICE CREAM": "🍦",
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
  const [videoModal, setVideoModal] = useState({ open: false, url: "", title: "" });

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
  }, [context?.restaurant?.slug, restaurantSlug, tableCode]);

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-red-400 text-center px-6">
        {error}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <CustomerAuth
        restaurantName={context?.restaurant?.name}
        restaurantSlug={restaurantSlug}
        tableCode={tableCode}
        onSuccess={(cust) => setCustomer(cust)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="w-full max-w-md mx-auto px-5 py-6 pb-32 relative">
        
        {/* PREMIUM HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-[32px] font-bold leading-tight mb-1">
                Find Your <span className="font-extrabold">Best</span>
              </h1>
              <h2 className="text-[32px] font-bold leading-tight text-white/90">
                Food Around You
              </h2>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span>{context.restaurant.name}</span>
                <span>•</span>
                <span>Table {context.table.tableCode}</span>
              </div>
              {customer && (
                <p className="text-xs text-emerald-400 font-medium mt-2">
                  Welcome, {customer.name}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {customer?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>

          {activeTab === "menu" && (
            <>
              {/* SEARCH BAR */}
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your favourit food"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#2a2a2a] border border-gray-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-600 transition text-sm"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>

              {/* FEATURED DISCOUNT CARD */}
              {filteredMenu && filteredMenu[0]?.items?.[0] && (
                <div className="relative rounded-3xl overflow-hidden mb-5 bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border border-gray-800">
                  <div className="flex items-center p-4">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-lg">🔥</span>
                        <span className="text-sm font-bold text-white">20% Discount</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">in 2 orders in a iteams</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>20min</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          4.5
                        </span>
                      </div>
                      <p className="text-lg font-bold text-white">{moneyINR(filteredMenu[0].items[0].price * 0.8)}</p>
                    </div>
                    <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0 border-4 border-[#1a1a1a]">
                      <img
                        src={getItemImage(filteredMenu[0].items[0]) || DEV_IMAGE_MAP[filteredMenu[0].items[0]?.name] || "/cold-coffee.jpg"}
                        alt={filteredMenu[0].items[0].name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/cold-coffee.jpg"; }}
                      />
                    </div>
                  </div>
                  <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* CATEGORY TABS */}
        {activeTab === "menu" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Categories</h3>
              <button className="text-xs text-gray-400 hover:text-white transition">See All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {categories.map((c) => (
                <button
                  key={c._keyId}
                  onClick={() => setActiveCategoryKey(c._keyId)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeCategoryKey === c._keyId
                      ? "bg-white text-black shadow-lg"
                      : "bg-[#2a2a2a] text-gray-400 border border-gray-700/50 hover:border-gray-600"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB SWITCHER */}
        <div className="flex gap-3 mb-6">
          {["menu", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-white text-black shadow-lg"
                  : "bg-[#2a2a2a] text-gray-400 border border-gray-700/50 hover:bg-[#2f2f2f]"
              }`}
            >
              {tab === "menu" ? "Menu" : "My Orders"}
            </button>
          ))}
        </div>

        {/* MENU TAB - CARD GRID */}
        {activeTab === "menu" && (
          <div>
            {!menuData && !menuError ? (
              <MenuSkeleton />
            ) : Array.isArray(menuData) && menuData.length === 0 ? (
              <p className="text-gray-400 text-center mt-10">Menu is not available right now</p>
            ) : Array.isArray(filteredMenu) ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredMenu.flatMap((cat) =>
                  (cat.items || []).map((item) => (
                    <PremiumMenuCard
                      key={item._keyId}
                      item={item}
                      qty={getItemQty(item._id)}
                      onAdd={() => {
                        if (!item._id) return alert("Item id missing in DB. Please re-seed menu items.");
                        addToCart(item);
                      }}
                      onInc={() => increaseQty(item._id)}
                      onDec={() => decreaseQty(item._id)}
                      onViewVideo={(url, title) => setVideoModal({ open: true, url, title })}
                    />

                  ))
                )}
              </div>
            ) : null}

            {Array.isArray(menuData) && Array.isArray(filteredMenu) && filteredMenu.length === 0 && (
              <div className="mt-10 text-center">
                <p className="text-white font-semibold">No matches found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different keyword.</p>
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
              <p className="text-gray-400 text-sm">No orders placed yet.</p>
            ) : (
              tableOrders.map((order) => (
                <div key={order._id} className="rounded-3xl p-5 bg-[#2a2a2a] border border-gray-800">
                  <div className="flex justify-between mb-3">
                    <p className="text-sm text-gray-400">Order #{order._id.slice(-5)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <ul className="text-sm space-y-2">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate text-gray-300">{item.name}</span>
                        <span className="text-white font-medium">× {item.quantity}</span>
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
            className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-black text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </button>
        )}

        {/* BOTTOM ACTION BAR */}
        {activeTab === "menu" && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-gray-800 px-4 py-4">
            <div className="max-w-md mx-auto flex justify-between items-center gap-3">
              <div className="min-w-0">
                {cartItems.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-400">{cartCount} items in cart</p>
                    <p className="text-lg font-bold text-white">{moneyINR(cartTotal)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400">Need assistance?</p>
                    <p className="text-sm font-semibold text-white">We're here to help</p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
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
                  className={`px-4 py-3 rounded-full font-semibold text-sm transition-all ${
                    waiterCalled
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-white border border-gray-700/50 hover:bg-[#2f2f2f]"
                  }`}
                >
                  {waiterCalled ? "✓ Called" : "Call Waiter"}
                </button>

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
                  className={`px-4 py-3 rounded-full font-semibold text-sm transition-all ${
                    billRequested
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-white border border-gray-700/50 hover:bg-[#2f2f2f]"
                  }`}
                >
                  {billRequested ? "✓ Requested" : "Request Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart cartItems={cartItems} onIncrease={increaseQty} onDecrease={decreaseQty} />
          <div className="mt-4 border-t border-gray-800 pt-4 flex justify-between items-center gap-3">
            <div>
              <p className="text-xs text-gray-400">{cartCount} items</p>
              <p className="text-xl font-bold text-white">{moneyINR(cartTotal)}</p>
            </div>
            <button
              onClick={() => placeOrder()}
              className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
            >
              Place Order
            </button>
          </div>
        </CartDrawer>

        {showOrderPlacedModal && (
          <OrderPlacedModal onClose={() => setShowOrderPlacedModal(false)} />
        )}

        {videoModal.open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-md bg-[#2a2a2a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="font-bold text-white truncate pr-2">{videoModal.title}</div>
                <button
                  className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center"
                  onClick={() => setVideoModal({ open: false, url: "", title: "" })}
                >
                  ✕
                </button>
              </div>

              <div className="p-3">
                <video
                  src={videoModal.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full rounded-2xl bg-black"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* PREMIUM MENU CARD */
function PremiumMenuCard({ item, qty, onAdd, onInc, onDec, onViewVideo }) {
  const img = getItemImage(item) || DEV_IMAGE_MAP[item?.name] || "/cold-coffee.jpg";

  return (
    <div className="group relative rounded-[28px] overflow-hidden bg-[#2a2a2a] border border-gray-800 hover:border-gray-700 transition-all hover:shadow-xl">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
        <img
          src={img}
          alt={item?.name || "Menu item"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = "/cold-coffee.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button> */}
        {getItemVideo(item) ? (
          <button
            type="button"
            onClick={() => onViewVideo(getItemVideo(item), item?.name || "Video")}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
            aria-label="View video"
            title="View video"
          >
            👁️
          </button>
        ) : null}
      </div>

      <div className="p-3.5">
        <h3 className="font-bold text-sm text-white mb-1 truncate">{item.name}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span>20min</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            4.5
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-white">{moneyINR(item.price)}</p>
          
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="w-9 h-9 rounded-full bg-white text-black shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-black/40 rounded-full px-2 py-1.5 border border-gray-700/50">
              <button onClick={onDec} className="text-white font-bold px-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              </button>
              <span className="font-bold text-white text-sm min-w-[18px] text-center">{qty}</span>
              <button onClick={onInc} className="text-white font-bold px-1">
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
    ACCEPTED: "bg-yellow-400 text-black",
    PREPARING: "bg-blue-500 text-white",
    SERVED: "bg-emerald-500 text-black",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] || "bg-gray-700 text-white"}`}>
      {status}
    </span>
  );
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#2a2a2a] rounded-[28px] h-52 border border-gray-800" />
      ))}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#2a2a2a] rounded-3xl p-4 h-24 border border-gray-800" />
      ))}
    </div>
  );
}

function OrderPlacedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center px-4 z-50">
      <div className="bg-[#2a2a2a] rounded-3xl p-8 text-center border border-gray-800 max-w-sm w-full shadow-2xl">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2 text-white">Order Placed!</h3>
        <p className="text-gray-400 mb-6">Your delicious food is being prepared</p>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-full bg-white text-black font-bold shadow-lg hover:shadow-xl transition-all"
        >
          Track Order
        </button>
      </div>
    </div>
  );
}