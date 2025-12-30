"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // If you already store selected restaurantId somewhere, set it here:
  // Example: localStorage.getItem("selectedRestaurantId")
  const [restaurantId, setRestaurantId] = useState("");

  const socketRef = useRef(null);

  async function loadRequests(rid) {
    setLoading(true);
    setErr("");
    try {
      const q = new URLSearchParams({
        status: "OPEN",
        type: "BILL",
        ...(rid ? { restaurantId: rid } : {}),
      });
      const data = await apiFetch(`/api/admin/requests?${q.toString()}`);
      setRequests(data.requests || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // Load restaurantId (dev default approach)
  useEffect(() => {
    const saved = localStorage.getItem("selectedRestaurantId");
    if (saved) {
      setRestaurantId(saved);
      return;
    }
    // fallback: try to pick first restaurant from admin restaurants API (if exists)
    (async () => {
      try {
        const data = await apiFetch("/api/admin/restaurants");
        const first = Array.isArray(data?.restaurants) ? data.restaurants[0] : null;
        if (first?._id) {
          setRestaurantId(first._id);
          localStorage.setItem("selectedRestaurantId", first._id);
        }
      } catch {
        // ignore - page can still show without rid filter if your API allows
      }
    })();
  }, []);

  // Load requests when restaurantId changes
  useEffect(() => {
    loadRequests(restaurantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // Socket: join admin room + live update
  useEffect(() => {
    if (!API_BASE) return;

    if (!socketRef.current) {
      socketRef.current = io(API_BASE, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
    }
    const socket = socketRef.current;

    if (restaurantId) {
      socket.emit("join_admin_room", { restaurantId });
    }

    const onNew = () => loadRequests(restaurantId);
    socket.on("service_request", onNew);
    socket.on("service_request_update", onNew);

    return () => {
      socket.off("service_request", onNew);
      socket.off("service_request_update", onNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function ack(id) {
    await apiFetch(`/api/admin/requests/${id}/ack`, { method: "PATCH" });
    await loadRequests(restaurantId);
  }

  async function close(id) {
    await apiFetch(`/api/admin/requests/${id}/close`, { method: "PATCH" });
    await loadRequests(restaurantId);
  }

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Bill Requests</h1>
        <button
          onClick={() => loadRequests(restaurantId)}
          className="px-4 py-2 rounded-lg border"
        >
          Refresh
        </button>
      </div>

      {err && <div className="mb-4 text-red-600">{err}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : sorted.length === 0 ? (
        <div>No pending bill requests.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <div
              key={r._id}
              className="border rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-semibold">Table {r.tableCode}</div>
                <div className="text-sm opacity-70">
                  Type: {r.type} • Status: {r.status}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => ack(r._id)}
                  className="px-3 py-2 rounded-lg border"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => close(r._id)}
                  className="px-3 py-2 rounded-lg border"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
