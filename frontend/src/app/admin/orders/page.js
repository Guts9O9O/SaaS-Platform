"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;

/** Get admin token from localStorage */
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

/** Decode JWT payload safely (no verification, just decode) */
function safeDecodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** API fetch helper */
async function apiFetch(path, opts = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState(null);

  // For status update UI feedback
  const [updatingId, setUpdatingId] = useState(null);

  // Get restaurantId from JWT
  const restaurantId = useMemo(() => {
    const token = getToken();
    const payload = token ? safeDecodeJwtPayload(token) : null;
    return payload?.restaurantId || null;
  }, []);

  // Socket instance
  const [socket, setSocket] = useState(null);

  // Connect socket + join admin room for this restaurant
  useEffect(() => {
    // If no token or no restaurantId, do nothing here (page may still render)
    const token = getToken();
    if (!token) return;

    const s = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      if (restaurantId) {
        s.emit("join_admin_room", { restaurantId });
      }
    });

    // When new order comes, refresh list
    s.on("new_order", () => {
      fetchOrders();
    });

    // When order status updated, refresh list
    s.on("order_status_updated", () => {
      fetchOrders();
    });

    return () => {
      try {
        if (restaurantId) s.emit("leave_admin_room", { restaurantId });
        s.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // Fetch orders
  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      setError(null);

      // ✅ Use admin orders API (scoped server-side by token restaurantId)
      const data = await apiFetch("/api/admin/orders");

      // Your backend might return { orders: [...] } or directly [...]
      const list = Array.isArray(data) ? data : data.orders || [];
      setOrders(list);
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update order status
  async function updateStatus(orderId, status) {
    try {
      setUpdatingId(orderId);

      // ✅ FIXED: use admin route
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      // Refresh list
      await fetchOrders();
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  // Simple status badge
  function StatusBadge({ status }) {
    const s = String(status || "").toUpperCase();
    const cls =
      s === "PENDING"
        ? "bg-yellow-700"
        : s === "ACCEPTED"
        ? "bg-green-700"
        : s === "REJECTED"
        ? "bg-red-700"
        : s === "COMPLETED"
        ? "bg-blue-700"
        : "bg-gray-700";

    return <span className={`px-2 py-1 rounded text-xs text-white ${cls}`}>{s}</span>;
  }

  return (
    <div className="p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white">Orders</h1>
        <p className="text-sm text-gray-300">
          Restaurant context:{" "}
          <span className="font-mono">{restaurantId || "(not found in token)"}</span>
        </p>
      </div>

      {loadingOrders ? (
        <div className="text-white">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-white">No orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-white">
                  <div className="font-semibold">
                    Order #{String(order._id).slice(-6)}
                  </div>
                  <div className="text-sm text-gray-300">
                    Table: <b>{order.tableCode || "-"}</b> &nbsp;|&nbsp; Total:{" "}
                    <b>₹{order.totalAmount ?? order.total ?? "-"}</b>
                  </div>
                </div>

                <StatusBadge status={order.status} />
              </div>

              {/* Items */}
              <div className="text-gray-200 text-sm">
                <div className="font-semibold mb-1">Items:</div>
                <ul className="list-disc ml-5 space-y-1">
                  {(order.items || []).map((it, idx) => (
                    <li key={idx}>
                      {it.name || it.itemName || "Item"} × {it.qty || it.quantity || 1}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={updatingId === order._id}
                  onClick={() => updateStatus(order._id, "ACCEPTED")}
                  className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Accept
                </button>

                <button
                  disabled={updatingId === order._id}
                  onClick={() => updateStatus(order._id, "REJECTED")}
                  className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>

                <button
                  disabled={updatingId === order._id}
                  onClick={() => updateStatus(order._id, "COMPLETED")}
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Complete
                </button>

                <button
                  onClick={fetchOrders}
                  className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  Refresh
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
