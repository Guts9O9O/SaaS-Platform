"use client";

import { useEffect, useState, useRef } from "react";
import Cart from "./Cart";
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
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [menuLocked, setMenuLocked] = useState(false);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addingItemId, setAddingItemId] = useState(null);

  /* Tabs */
  const [activeTab, setActiveTab] = useState("menu");

  /* Orders */
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  /* OTP */
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState(null);

  /* TABLE AUTH */
  const tableSessionKey = getTableSessionKey(
    restaurantSlug,
    tableCode
  );

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(tableSessionKey) === "true";
  });

  const [verifiedPhone, setVerifiedPhone] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`${tableSessionKey}_phone`);
  });

  /* Socket */
  const socketRef = useRef(null);

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
        setMenuData(data.categories);
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/table?restaurantSlug=${restaurantSlug}&tableCode=${tableCode}`
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
    refreshTableOrders().finally(() =>
      setLoadingOrders(false)
    );
  }, [activeTab, restaurantSlug, tableCode]);

  /* ------------------ HELPERS ------------------ */
  function getItemQty(itemId) {
    const item = cartItems.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  }

  function unlockMenuForMoreOrders() {
    setMenuLocked(false);
    setOrderPlaced(false);
    setActiveTab("menu");
  }

  /* ------------------ CART ------------------ */
  function addToCart(item) {
    setAddingItemId(item.id);

    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    setTimeout(() => setAddingItemId(null), 300);
  }

  function increaseQty(itemId) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQty(itemId) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  /* ------------------ SOCKET ------------------ */
  function joinOrderSocket(orderId) {
    if (!socketRef.current) {
      socketRef.current = io(
        process.env.NEXT_PUBLIC_API_URL,
        { withCredentials: true }
      );
    }

    socketRef.current.emit("join_order_room", { orderId });

    socketRef.current.off("order_status");
    socketRef.current.on("order_status", ({ order }) => {
      setTableOrders((prev) =>
        prev.map((o) =>
          o._id === order._id
            ? { ...o, status: order.status }
            : o
        )
      );
    });
  }

  /* ------------------ OTP ------------------ */
  async function sendOtp() {
    setOtpError(null);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/otp/request`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }
    );

    if (!res.ok) {
      setOtpError("Failed to send OTP");
      return;
    }

    setOtpSent(true);
  }

  async function verifyOtpAndPlaceOrder() {
    setOtpError(null);

    const verifyRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/otp/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      }
    );

    if (!verifyRes.ok) {
      setOtpError("Invalid OTP");
      return;
    }

    setIsAuthenticated(true);
    setVerifiedPhone(phone);
    localStorage.setItem(tableSessionKey, "true");
    localStorage.setItem(`${tableSessionKey}_phone`, phone);

    await placeOrder(phone);
  }

  /* ------------------ ORDER ------------------ */
  async function placeOrder(customerPhone) {
    try {
      if (!customerPhone) {
        setShowOtpModal(true);
        return;
      }

      setIsCartOpen(false);

      const payload = {
        restaurantSlug,
        tableCode,
        customerPhone,
        orderItems: cartItems.map((i) => ({
          menuItemId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();

      setCartItems([]);
      setMenuLocked(true);
      setOrderPlaced(true);
      setShowOtpModal(false);
      setShowOrderPlacedModal(true);

      await refreshTableOrders();
      joinOrderSocket(data.orderId);
      setActiveTab("orders");
    } catch {
      alert("Failed to place order");
    }
  }

  /* ------------------ TOTALS ------------------ */
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

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
          <h2 className="text-lg font-semibold">
            {context.restaurant.name}
          </h2>
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
          <div
            className={
              menuLocked ? "opacity-40 pointer-events-none" : ""
            }
          >
            {!menuData && !menuError ? (
              <MenuSkeleton />
            ) : menuData.length === 0 ? (
              <p className="text-zinc-400 text-center mt-10">
                Menu is not available right now
              </p>
            ) : (
              menuData.map((cat) => (
                <div key={cat.id} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    {cat.name}
                  </h3>

                  <ul className="space-y-3">
                    {cat.items.map((item) => (
                      <li
                        key={item.id}
                        className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">
                            {item.name}
                          </p>
                          <p className="text-sm text-zinc-400">
                            ₹{item.price}
                          </p>
                        </div>

                        {getItemQty(item.id) === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 bg-zinc-800 rounded-lg px-2 py-1">
                            <button
                              onClick={() =>
                                decreaseQty(item.id)
                              }
                              className="text-emerald-400 text-lg font-bold"
                            >
                              −
                            </button>
                            <span className="font-semibold">
                              {getItemQty(item.id)}
                            </span>
                            <button
                              onClick={() =>
                                increaseQty(item.id)
                              }
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
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {menuLocked && (
              <button
                onClick={unlockMenuForMoreOrders}
                className="w-full bg-emerald-500 text-black py-3 rounded-xl font-semibold"
              >
                + Order More Items
              </button>
            )}

            {loadingOrders ? (
              <OrdersSkeleton />
            ) : tableOrders.length === 0 ? (
              <p className="text-zinc-400 text-sm">
                No orders placed yet.
              </p>
            ) : (
              tableOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-zinc-900 rounded-xl p-4"
                >
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-zinc-400">
                      Order #{order._id.slice(-5)}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <ul className="text-sm space-y-1">
                    {(order.orderItems || []).map(
                      (item, idx) => (
                        <li key={idx}>
                          {item.name} × {item.quantity}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* CART + MODALS */}
        {cartItems.length > 0 && activeTab === "menu" && (
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t px-4 py-3">
            <div className="max-w-md mx-auto flex justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  {cartCount} items
                </p>
                <p className="font-semibold">
                  ₹{cartTotal}
                </p>
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

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        >
          <Cart
            cartItems={cartItems}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
          />
          <div className="mt-4 border-t border-zinc-800 pt-4 flex justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                {cartCount} items
              </p>
              <p className="font-semibold">
                ₹{cartTotal}
              </p>
            </div>
            <button
              onClick={() =>
                isAuthenticated
                  ? placeOrder(verifiedPhone)
                  : setShowOtpModal(true)
              }
              className="bg-emerald-500 text-black px-6 py-2 rounded-xl"
            >
              Place Order
            </button>
          </div>
        </CartDrawer>

        {showOtpModal && (
          <OtpModal
            phone={phone}
            setPhone={setPhone}
            otp={otp}
            setOtp={setOtp}
            otpSent={otpSent}
            sendOtp={sendOtp}
            verifyOtp={verifyOtpAndPlaceOrder}
            error={otpError}
          />
        )}

        {showOrderPlacedModal && (
          <OrderPlacedModal
            onClose={() => setShowOrderPlacedModal(false)}
          />
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
            <div
              key={i}
              className="bg-zinc-900 rounded-xl p-4 mb-3"
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
          className="bg-zinc-900 rounded-xl p-4 h-20"
        />
      ))}
    </div>
  );
}

function OtpModal({
  phone,
  setPhone,
  otp,
  setOtp,
  otpSent,
  sendOtp,
  verifyOtp,
  error,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-3">
          Verify Phone
        </h3>

        {!otpSent ? (
          <>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-4 py-2 mb-4"
            />
            <button
              onClick={sendOtp}
              className="w-full bg-emerald-500 text-black py-2 rounded-lg"
            >
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter 4-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-4 py-2 mb-4"
            />
            <button
              onClick={verifyOtp}
              className="w-full bg-emerald-500 text-black py-2 rounded-lg"
            >
              Verify & Place Order
            </button>
          </>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function OrderPlacedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">
          🎉 Order Placed!
        </h3>
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

/* ------------------ STATUS BADGE ------------------ */
// function OrderStatusBadge({ status }) {
//   const map = {
//     ACCEPTED: "bg-yellow-500 text-black",
//     PREPARING: "bg-blue-500 text-white",
//     SERVED: "bg-emerald-500 text-black",
//   };

//   return (
//     <span
//       className={`px-3 py-1 rounded-full text-xs font-semibold ${
//         map[status] || "bg-zinc-700 text-white"
//       }`}
//     >
//       {status}
//     </span>
//   );
// }

/* ------------------ SKELETONS ------------------ */
// function MenuSkeleton() {
//   return (
//     <div className="space-y-6 animate-pulse">
//       {[1, 2].map((section) => (
//         <div key={section}>
//           <div className="h-5 w-32 bg-zinc-800 rounded mb-3"></div>
//           <div className="space-y-3">
//             {[1, 2, 3].map((item) => (
//               <div
//                 key={item}
//                 className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center"
//               >
//                 <div className="space-y-2">
//                   <div className="h-4 w-40 bg-zinc-800 rounded"></div>
//                   <div className="h-3 w-20 bg-zinc-800 rounded"></div>
//                 </div>
//                 <div className="h-8 w-16 bg-zinc-800 rounded-lg"></div>
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function OrdersSkeleton() {
//   return (
//     <div className="space-y-4 animate-pulse">
//       {[1, 2, 3].map((order) => (
//         <div
//           key={order}
//           className="bg-zinc-900 rounded-xl p-4 space-y-3"
//         >
//           <div className="flex justify-between">
//             <div className="h-3 w-24 bg-zinc-800 rounded"></div>
//             <div className="h-5 w-16 bg-zinc-800 rounded-full"></div>
//           </div>
//           <div className="space-y-2">
//             <div className="h-3 w-40 bg-zinc-800 rounded"></div>
//             <div className="h-3 w-32 bg-zinc-800 rounded"></div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
