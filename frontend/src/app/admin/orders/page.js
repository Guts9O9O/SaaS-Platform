"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

const RESTAURANT_ID = "693bce41df2c72b4f331b7cf";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  /* ------------------ KITCHEN MODE ------------------ */
  const [kitchenMode, setKitchenMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("kitchenMode");
    if (saved === "true") {
        setKitchenMode(true);
    }
  }, []);


  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showServed, setShowServed] = useState(false);

  function toggleKitchenMode() {
    setKitchenMode((prev) => {
      localStorage.setItem("kitchenMode", (!prev).toString());
      return !prev;
    });
  }

  /* ------------------ SOUND SETUP ------------------ */
  const audioRef = useRef(null);
  const playedOrdersRef = useRef(new Set());

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
    audioRef.current.volume = 0.9;
  }, []);

  function enableSound() {
    if (!audioRef.current) return;

    audioRef.current
        .play()
        .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setSoundEnabled(true);
        })
        .catch(() => {});
  }

  function playNewOrderSound(orderId) {
    if (!kitchenMode || !soundEnabled) return;
    if (playedOrdersRef.current.has(orderId)) return;

    playedOrdersRef.current.add(orderId);

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }

  /* ------------------ AUTH GUARD ------------------ */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.push("/admin/login");
  }, [router]);

  /* ------------------ INITIAL FETCH ------------------ */
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/orders", {
    headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    },
    })
    .then((res) => res.json())
    .then((data) => setOrders(data.orders || []))
    .catch(() => setError("Failed to load orders"));
  }, []);

  /* ------------------ SOCKET ------------------ */
  useEffect(() => {
    const socket = io("http://localhost:4000", { withCredentials: true });

    socket.emit("join_admin_room", { restaurantId: RESTAURANT_ID });

    socket.on("new_order", ({ order }) => {
      setOrders((prev) => [order, ...prev]);

      if (order.status === "ACCEPTED") {
        playNewOrderSound(order._id);
      }
    });

    const updateHandler = ({ order }) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? order : o))
      );
    };

    socket.on("order_updated", updateHandler);
    socket.on("order_status", updateHandler);

    return () => socket.disconnect();
  }, []);

  /* ------------------ UPDATE STATUS ------------------ */
  async function updateStatus(orderId, status) {
    const token = localStorage.getItem("adminToken");
    if (!token) return router.push("/admin/login");

    try {
      setUpdatingId(orderId);

      const res = await fetch(
        `http://localhost:4000/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? data.order : o))
      );
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ------------------ GROUP & SORT ------------------ */
  const groupedByTable = orders.reduce((acc, order) => {
    const tableCode = order.tableId?.tableCode || "Unknown";
    if (!acc[tableCode]) acc[tableCode] = [];
    acc[tableCode].push(order);
    return acc;
  }, {});

  function sortOrders(list) {
    const priority = { ACCEPTED: 1, PREPARING: 2, SERVED: 3 };
    return [...list].sort(
      (a, b) => priority[a.status] - priority[b.status]
    );
  }

  if (!mounted) return null;
  /* ------------------ UI ------------------ */
  return (
    <div
      className={`min-h-screen text-white ${
        kitchenMode ? "bg-black p-4" : "bg-gray-950 p-6"
      }`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {kitchenMode ? "🍽 Kitchen Orders" : "🍽 Live Restaurant Orders"}
        </h1>

        <div className="flex gap-3">
          {kitchenMode && (
            <button
              onClick={() => setShowServed((p) => !p)}
              className="px-4 py-2 rounded-lg bg-gray-800 text-sm"
            >
              {showServed ? "Hide Served" : "Show Served"}
            </button>
          )}

          <button
            onClick={() => {
                enableSound();
                toggleKitchenMode();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              kitchenMode
                ? "bg-emerald-500 text-black"
                : "bg-gray-800 text-white"
            }`}
          >
            {kitchenMode ? "Exit Kitchen" : "Kitchen Mode"}
          </button>
        </div>
      </div>

      {!kitchenMode && error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {Object.entries(groupedByTable).map(([tableCode, tableOrders]) => {
        const sorted = sortOrders(tableOrders);

        const visibleOrders = kitchenMode
          ? sorted.filter(
              (o) => showServed || o.status !== "SERVED"
            )
          : sorted;

        return (
          <div
            key={tableCode}
            className="rounded-xl border border-gray-700 p-4 mb-6"
          >
            <h2 className="text-lg font-bold mb-4">
              🍽 Table {tableCode}
            </h2>

            <div className="space-y-4">
              {visibleOrders.map((order) => (
                <div
                  key={order._id}
                  className={`rounded-lg p-4 ${
                    order.status === "ACCEPTED"
                      ? "bg-yellow-500/10 border border-yellow-400"
                      : order.status === "PREPARING"
                      ? "bg-blue-500/10 border border-blue-400"
                      : "bg-green-500/10 border border-green-400"
                  }`}
                >
                  {/* ITEMS */}
                  <ul
                    className={`space-y-2 ${
                      kitchenMode ? "text-lg" : "text-sm"
                    }`}
                  >
                    {(order.orderItems || []).map((item, idx) => (
                      <li key={idx} className="font-bold">
                        {item.quantity}× {item.name}
                      </li>
                    ))}
                  </ul>

                  {/* ACTIONS */}
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm opacity-70">
                      Order #{order._id.slice(-6)}
                    </span>

                    {/* ADMIN MODE */}
                    {!kitchenMode && (
                      <>
                        {order.status === "ACCEPTED" && (
                          <button
                            onClick={() =>
                              updateStatus(order._id, "PREPARING")
                            }
                            className="px-4 py-2 bg-blue-600 rounded-lg"
                          >
                            Mark Preparing
                          </button>
                        )}

                        {order.status === "PREPARING" && (
                          <button
                            onClick={() =>
                              updateStatus(order._id, "SERVED")
                            }
                            className="px-4 py-2 bg-green-600 rounded-lg"
                          >
                            Mark Served
                          </button>
                        )}
                      </>
                    )}

                    {/* KITCHEN MODE */}
                    {kitchenMode && order.status === "ACCEPTED" && (
                      <button
                        onClick={() =>
                          updateStatus(order._id, "PREPARING")
                        }
                        className="px-6 py-2 bg-blue-600 rounded-lg font-semibold"
                      >
                        Start Preparing
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {visibleOrders.length === 0 && (
                <p className="text-sm opacity-50">
                  No active orders
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
