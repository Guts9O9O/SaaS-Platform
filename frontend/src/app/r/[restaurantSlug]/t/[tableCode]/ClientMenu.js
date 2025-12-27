"use client";

import { useEffect, useState, useRef } from "react";
import Cart from "../../../../components/Cart";
import CartDrawer from "../../../../components/CartDrawer";
import { io } from "socket.io-client";
import useMenuContext from "./hooks/useMenuContext";

/* ------------------ TABLE SESSION KEY ------------------ */
const getTableSessionKey = (restaurantSlug, tableCode) =>
  `table_auth_${restaurantSlug}_${tableCode}`;

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

  // const [orderPlaced, setOrderPlaced] = useState(false);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  // const [addingItemId, setAddingItemId] = useState(null);

  /* Tabs */
  const [activeTab, setActiveTab] = useState("menu");

  /* Orders */
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  /* OTP (kept commented as you don't want OTP flow) */
  // const [showOtpModal, setShowOtpModal] = useState(false);
  // const [phone, setPhone] = useState("");
  // const [otp, setOtp] = useState("");
  // const [otpSent, setOtpSent] = useState(false);
  // const [otpError, setOtpError] = useState(null);

  /* TABLE AUTH */
  const tableSessionKey = getTableSessionKey(restaurantSlug, tableCode);

  // const [isAuthenticated, setIsAuthenticated] = useState(() => {
  //   if (typeof window === "undefined") return false;
  //   return localStorage.getItem(tableSessionKey) === "true";
  // });

  // const [verifiedPhone, setVerifiedPhone] = useState(() => {
  //   if (typeof window === "undefined") return null;
  //   return localStorage.getItem(`${tableSessionKey}_phone`);
  // });

  /* Socket */
  const socketRef = useRef(null);
  const joinedOrdersRef = useRef(new Set());

  /* ------------------ LOAD MENU (C1.2) ------------------ */
  useEffect(() => {
    if (!context?.restaurant?.slug) return;

    const fetchMenu = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/menu/public/${context.restaurant.slug}`
        );

        if (!res.ok) throw new Error("Failed to load menu");

        const data = await res.json();

        // backend returns { categories }
        const normalized = (data.categories || []).map((cat, catIndex) => {
        const catRealId = cat._id || cat.id;
        const catKeyId = catRealId || `cat_${catIndex}`;

        const items = (cat.items || []).map((item, itemIndex) => {
          const realId = item._id || item.id || item.itemId;     // ✅ must be Mongo id
          const keyId = realId || `item_${catIndex}_${itemIndex}`; // ✅ for React key only

          return {
            ...item,
            _id: realId,      // ✅ keep real id only (can be undefined if truly missing)
            _keyId: keyId,    // ✅ always present for React keys
          };
        });
        // Force category _id always present
        return { ...cat, _id: catRealId, _keyId: catKeyId, items };
      });

      setMenuData(normalized);
      } catch (err) {
        setMenuError(err.message);
      }
    };

    fetchMenu();
  }, [context]);

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
        : Array.isArray(data.orders)
        ? data.orders
        : [];

      setTableOrders(orders);
    } catch (err) {
      console.error("Failed to refresh orders", err);
    }
  }

  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadingOrders(true);
    refreshTableOrders().finally(() => setLoadingOrders(false));
  }, [activeTab, restaurantSlug, tableCode]);

  useEffect(() => {
  if (activeTab !== "orders") return;

  // Create socket once (when Orders tab opens)
  if (!socketRef.current) {
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    // listen once
    socketRef.current.on("order_status", ({ order }) => {
      if (!order?._id) return;
      setTableOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, status: order.status } : o))
      );
    });
  }

  // Join rooms for all currently loaded orders
  const socket = socketRef.current;
  for (const o of tableOrders) {
    const id = o?._id;
    if (!id) continue;
    if (joinedOrdersRef.current.has(id)) continue;

    socket.emit("join_order_room", { orderId: id });
    joinedOrdersRef.current.add(id);
  }

  return () => {
    // optional cleanup: keep socket connected (faster) while user stays on page
    // If you want disconnect on tab switch, tell me — we’ll do it safely.
  };
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

  /* ------------------ SOCKET ------------------ */
  function joinOrderSocket(orderId) {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
        withCredentials: true,
      });
    }

    socketRef.current.emit("join_order_room", { orderId });

    socketRef.current.off("order_status");
    socketRef.current.on("order_status", ({ order }) => {
      setTableOrders((prev) =>
        prev.map((o) =>
          o._id === order._id ? { ...o, status: order.status } : o
        )
      );
    });
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
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }

      setCartItems([]);
      setIsCartOpen(false);

      // Go to My Orders after placing order
      setActiveTab("orders");

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

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center">
      <div className="w-full max-w-md px-4 py-6 pb-32 relative">
        {/* HEADER */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <h2 className="text-lg font-semibold">{context.restaurant.name}</h2>
          <p className="text-sm text-zinc-400">
            Table {context.table.tableCode}
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-zinc-900 rounded-xl p-1 mb-4">
          {["menu", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                activeTab === tab
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400"
              }`}
            >
              {tab === "menu" ? "Menu" : "My Orders"}
            </button>
          ))}
        </div>

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <div >
            {!menuData && !menuError ? (
              <MenuSkeleton />
            ) : Array.isArray(menuData) && menuData.length === 0 ? (
              <p className="text-zinc-400 text-center mt-10">
                Menu is not available right now
              </p>
            ) : Array.isArray(menuData) ? (
              menuData.map((cat) => (
                // ✅ FIX 2: use _id instead of id (keys + consistent backend shape)
                <div key={cat._keyId} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{cat.name}</h3>

                  <ul className="space-y-3">
                    {(cat.items || []).map((item) => (
                      // ✅ FIX 2: use _id instead of id
                      <li
                        key={item._keyId}
                        className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-zinc-400">₹{item.price}</p>
                        </div>

                        {getItemQty(item._id) === 0 ? (
                          <button
                            onClick={() => {
                             if (!item._id) return alert("Item id missing in DB. Please re-seed menu items.");
                             addToCart(item);
                            }}
                            className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 bg-zinc-800 rounded-lg px-2 py-1">
                            {/* ✅ FIX 2: decrease/increase should use item._id */}
                            <button
                              onClick={() => decreaseQty(item._id)}
                              className="text-emerald-400 text-lg font-bold"
                            >
                              −
                            </button>
                            <span className="font-semibold">
                              {getItemQty(item._id)}
                            </span>
                            <button
                              onClick={() => increaseQty(item._id)}
                              className="text-emerald-400 text-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : null}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* {menuLocked && (
              <button
                onClick={unlockMenuForMoreOrders}
                className="w-full bg-emerald-500 text-black py-3 rounded-xl font-semibold"
              >
                + Order More Items
              </button>
            )} */}

            {loadingOrders ? (
              <OrdersSkeleton />
            ) : tableOrders.length === 0 ? (
              <p className="text-zinc-400 text-sm">No orders placed yet.</p>
            ) : (
              tableOrders.map((order) => (
                <div key={order._id} className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-zinc-400">
                      Order #{order._id.slice(-5)}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <ul className="text-sm space-y-1">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx}>
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* CART */}
        {cartItems.length > 0 && activeTab === "menu" && (
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t px-4 py-3">
            <div className="max-w-md mx-auto flex justify-between">
              <div>
                <p className="text-sm text-zinc-400">{cartCount} items</p>
                <p className="font-semibold">₹{cartTotal}</p>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-emerald-500 text-black px-6 py-2 rounded-xl"
              >
                View Cart →
              </button>
            </div>
          </div>
        )}

        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart cartItems={cartItems} onIncrease={increaseQty} onDecrease={decreaseQty} />
          <div className="mt-4 border-t border-zinc-800 pt-4 flex justify-between">
            <div>
              <p className="text-sm text-zinc-400">{cartCount} items</p>
              <p className="font-semibold">₹{cartTotal}</p>
            </div>
            <button
              onClick={() => placeOrder()}
              className="bg-emerald-500 text-black px-6 py-2 rounded-xl"
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
            <div key={i} className="bg-zinc-900 rounded-xl p-4 mb-3" />
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
        <div key={i} className="bg-zinc-900 rounded-xl p-4 h-20" />
      ))}
    </div>
  );
}

function OrderPlacedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">🎉 Order Placed!</h3>
        <p className="text-sm text-zinc-400 mb-4">
          You can track your order in “My Orders”.
        </p>
        <button
          onClick={onClose}
          className="bg-emerald-500 text-black px-6 py-2 rounded-xl"
        >
          OK
        </button>
      </div>
    </div>
  );
}
