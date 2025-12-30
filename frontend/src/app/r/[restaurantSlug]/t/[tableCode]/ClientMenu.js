"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cart from "../../../../components/Cart";
import CartDrawer from "../../../../components/CartDrawer";
import { io } from "socket.io-client";
import useMenuContext from "./hooks/useMenuContext";
import CustomerAuth from "../../../../components/CustomerAuth";

/* ------------------ TABLE SESSION KEY ------------------ */
const getTableSessionKey = (restaurantSlug, tableCode) =>
  `table_auth_${restaurantSlug}_${tableCode}`;

/* ------------------ IMAGE HELPERS ------------------ */
function getItemImage(item) {
  // Support multiple common field names
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

export default function ClientMenu({ restaurantSlug, tableCode }) {
  /* ------------------ CONTEXT (QR VALIDATION) ------------------ */
  const { loading, error, context } = useMenuContext({
    restaurantSlug,
    tableCode,
  });

  /* ------------------ STATE ------------------ */
  const [menuData, setMenuData] = useState(null);
  const [menuError, setMenuError] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);

  /* Tabs */
  const [activeTab, setActiveTab] = useState("menu");

  /* Orders */
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  /* ------------------ CUSTOMER AUTH ------------------ */
  const [authChecked, setAuthChecked] = useState(false);
  const [customer, setCustomer] = useState(null);

  /* TABLE AUTH (currently unused, kept for future) */
  const tableSessionKey = getTableSessionKey(restaurantSlug, tableCode);

  /* ------------------ BILL REQUEST UI STATE ------------------ */
  const [billRequested, setBillRequested] = useState(false);
  const billCooldownTimerRef = useRef(null);

  /* Socket */
  const socketRef = useRef(null);
  const joinedOrdersRef = useRef(new Set());

  /* UI Filters */
  const [search, setSearch] = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("ALL");

  /* ------------------ LOAD MENU ------------------ */
  useEffect(() => {
    if (!context?.restaurant?.slug) return;

    let cancelled = false;

    const fetchMenu = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/menu/public/${context.restaurant.slug}`
        );

        if (!res.ok) throw new Error("Failed to load menu");

        const data = await res.json();

        const normalized = (data.categories || []).map((cat, catIndex) => {
          const catRealId = cat._id || cat.id;
          const catKeyId = catRealId || `cat_${catIndex}`;

          const items = (cat.items || []).map((item, itemIndex) => {
            const realId = item._id || item.id || item.itemId; // must be Mongo id
            const keyId = realId || `item_${catIndex}_${itemIndex}`; // react key

            return {
              ...item,
              _id: realId,
              _keyId: keyId,
            };
          });

          return { ...cat, _id: catRealId, _keyId: catKeyId, items };
        });

        if (!cancelled) setMenuData(normalized);
      } catch (err) {
        if (!cancelled) setMenuError(err.message);
      }
    };

    fetchMenu();

    return () => {
      cancelled = true;
    };
  }, [context?.restaurant?.slug]);

  /* ------------------ AUTH CHECK ------------------ */
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

    return () => {
      cancelled = true;
    };
  }, [context?.restaurant?._id]);

  /* ------------------ FETCH TABLE ORDERS ------------------ */
  async function refreshTableOrders() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders/my`,
        { credentials: "include" }
      );

      const data = await res.json();

      const orders = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];

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

  /* ------------------ REQUEST BILL ------------------ */
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

  /* ------------------ SOCKET: ORDER STATUS UPDATES ------------------ */
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
          prev.map((o) =>
            o._id === order._id ? { ...o, status: order.status } : o
          )
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

  /* ------------------ HELPERS ------------------ */
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
          String(i.itemId) === String(item._id)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [
        ...prev,
        {
          itemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQty(itemId) {
    setCartItems((prev) =>
      prev.map((item) =>
        String(item.itemId) === String(itemId)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQty(itemId) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          String(item.itemId) === String(itemId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  /* ------------------ ORDER ------------------ */
  async function placeOrder() {
    try {
      const payload = {
        restaurantId: context.restaurant._id || context.restaurant.id,
        tableId: context.table._id || context.table.id,
        items: cartItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
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

  /* ------------------ TOTALS ------------------ */
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  /* ------------------ FILTERED MENU ------------------ */
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

    const byCategory =
      activeCategoryKey === "ALL"
        ? cats
        : cats.filter((c) => c._keyId === activeCategoryKey);

    if (!q) return byCategory;

    return byCategory
      .map((cat) => ({
        ...cat,
        items: (cat.items || []).filter((it) =>
          String(it.name || "").toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => (cat.items || []).length > 0);
  }, [menuData, search, activeCategoryKey]);

  /* ------------------ UI STATES ------------------ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-400">
        Loading menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-500 text-center px-6">
        {error}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-400">
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

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center">
      <div className="w-full max-w-md px-4 py-6 pb-32 relative">
        {/* HEADER (Upgraded) */}
        <div className="rounded-2xl p-4 mb-4 border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight truncate">
                {context.restaurant.name}
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                Table{" "}
                <span className="font-medium">{context.table.tableCode}</span>
              </p>

              {customer && (
                <p className="text-sm text-emerald-400 font-medium mt-2">
                  Hi {customer.name} 👋, welcome
                </p>
              )}
            </div>

            {/* Small badge */}
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </div>

          {/* Search only on Menu tab */}
          {activeTab === "menu" && (
            <div className="mt-4">
              <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2">
                <span className="text-zinc-400">🔎</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dishes..."
                  className="w-full bg-transparent outline-none text-sm placeholder:text-zinc-500"
                />
                {search?.length > 0 && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-zinc-400 hover:text-zinc-200 text-sm"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category chips */}
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((c) => (
                  <button
                    key={c._keyId}
                    onClick={() => setActiveCategoryKey(c._keyId)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      activeCategoryKey === c._keyId
                        ? "bg-emerald-500 text-black border-emerald-500"
                        : "bg-zinc-900/60 text-zinc-300 border-zinc-800"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="flex bg-zinc-900 rounded-2xl p-1 mb-4 border border-zinc-800">
          {["menu", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab === "menu" ? "Menu" : "My Orders"}
            </button>
          ))}
        </div>

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <div>
            {!menuData && !menuError ? (
              <MenuSkeleton />
            ) : Array.isArray(menuData) && menuData.length === 0 ? (
              <p className="text-zinc-400 text-center mt-10">
                Menu is not available right now
              </p>
            ) : Array.isArray(filteredMenu) ? (
              filteredMenu.map((cat) => (
                <div key={cat._keyId} className="mb-7">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">{cat.name}</h3>
                    <span className="text-xs text-zinc-500">
                      {(cat.items || []).length} items
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {(cat.items || []).map((item) => (
                      <MenuItemCard
                        key={item._keyId}
                        item={item}
                        qty={getItemQty(item._id)}
                        onAdd={() => {
                          if (!item._id)
                            return alert(
                              "Item id missing in DB. Please re-seed menu items."
                            );
                          addToCart(item);
                        }}
                        onInc={() => increaseQty(item._id)}
                        onDec={() => decreaseQty(item._id)}
                      />
                    ))}
                  </ul>
                </div>
              ))
            ) : null}

            {/* No results state */}
            {Array.isArray(menuData) &&
              Array.isArray(filteredMenu) &&
              filteredMenu.length === 0 && (
                <div className="mt-10 text-center">
                  <p className="text-zinc-300 font-semibold">No matches found</p>
                  <p className="text-zinc-500 text-sm mt-1">
                    Try a different keyword.
                  </p>
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
                <div
                  key={order._id}
                  className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800"
                >
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-zinc-400">
                      Order #{order._id.slice(-5)}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <ul className="text-sm space-y-1 text-zinc-200">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <span className="text-zinc-400">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* BOTTOM BAR (Cart + Request Bill) */}
        {activeTab === "menu" && (
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur border-t border-zinc-800 px-4 py-3">
            <div className="max-w-md mx-auto flex justify-between items-center gap-3">
              <div className="min-w-0">
                {cartItems.length > 0 ? (
                  <>
                    <p className="text-sm text-zinc-400">{cartCount} items</p>
                    <p className="font-semibold">{moneyINR(cartTotal)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-400">Need the bill?</p>
                    <p className="font-semibold">Tap Request Bill</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="bg-emerald-500 text-black px-4 py-2 rounded-2xl font-semibold"
                  >
                    View Cart →
                  </button>
                )}

                <button
                  disabled={billRequested}
                  onClick={async () => {
                    try {
                      const ok = window.confirm(
                        `Request the bill for Table ${context.table.tableCode}?`
                      );
                      if (!ok) return;

                      await requestBill();
                      startBillCooldown(2 * 60 * 1000);
                    } catch (e) {
                      alert(e?.message || "Failed to request bill");
                    }
                  }}
                  className={`px-4 py-2 rounded-2xl font-semibold border ${
                    billRequested
                      ? "bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed"
                      : "bg-zinc-900 text-zinc-100 border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  {billRequested ? "Bill Requested ✅" : "Request Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart
            cartItems={cartItems}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
          />
          <div className="mt-4 border-t border-zinc-800 pt-4 flex justify-between items-center gap-3">
            <div>
              <p className="text-sm text-zinc-400">{cartCount} items</p>
              <p className="font-semibold">{moneyINR(cartTotal)}</p>
            </div>
            <button
              onClick={() => placeOrder()}
              className="bg-emerald-500 text-black px-6 py-2 rounded-2xl font-semibold"
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

/* ------------------ ITEM CARD (With Photo) ------------------ */
function MenuItemCard({ item, qty, onAdd, onInc, onDec }) {
  const img =
    getItemImage(item) || DEV_IMAGE_MAP[item?.name] || "/cold-coffee.jpg";

  return (
    <li className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex gap-3">
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
        <img
          src={img}
          alt={item?.name || "Menu item"}
          className="w-20 h-20 rounded-xl object-cover border border-zinc-800"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/cold-coffee.jpg";
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-snug truncate">{item.name}</p>
            {item?.description ? (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                {item.description}
              </p>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">Freshly prepared</p>
            )}
          </div>

          <p className="font-semibold text-zinc-100 whitespace-nowrap">
            {moneyINR(item.price)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            {item?.isVeg === true ? (
              <span className="inline-flex items-center gap-1">
                🟢 <span>Veg</span>
              </span>
            ) : item?.isVeg === false ? (
              <span className="inline-flex items-center gap-1">
                🔴 <span>Non-veg</span>
              </span>
            ) : (
              <span />
            )}
          </div>

          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-2 py-1.5 border border-zinc-700">
              <button
                onClick={onDec}
                className="text-emerald-400 text-lg font-bold px-2"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-semibold min-w-[18px] text-center">
                {qty}
              </span>
              <button
                onClick={onInc}
                className="text-emerald-400 text-lg font-bold px-2"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ------------------ SMALL COMPONENTS ------------------ */

function OrderStatusBadge({ status }) {
  const map = {
    ACCEPTED: "bg-yellow-500 text-black",
    PREPARING: "bg-blue-500 text-white",
    SERVED: "bg-emerald-500 text-black",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        map[status] || "bg-zinc-700 text-white"
      }`}
    >
      {status}
    </span>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2].map((s) => (
        <div key={s}>
          <div className="h-5 w-32 bg-zinc-800 rounded mb-3"></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-800 h-24"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-zinc-900 rounded-2xl p-4 h-20 border border-zinc-800"
        />
      ))}
    </div>
  );
}

function OrderPlacedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-zinc-900 rounded-2xl p-6 text-center border border-zinc-800 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-2">🎉 Order Placed!</h3>
        <p className="text-sm text-zinc-400 mb-4">
          You can track your order in “My Orders”.
        </p>
        <button
          onClick={onClose}
          className="bg-emerald-500 text-black px-6 py-2 rounded-2xl font-semibold"
        >
          OK
        </button>
      </div>
    </div>
  );
}
