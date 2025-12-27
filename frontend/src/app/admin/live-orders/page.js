"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import BillingModal from "../../components/BillingModal";
import RevenueSummaryPanel from "../../components/RevenueSummaryPanel";
import BillHistoryPanel from "../../components/BillHistoryPanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

function safeDecodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
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
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2);
}

const STATUS_META = {
  PENDING: { label: "PENDING", bg: "#2a1d00", fg: "#ffcc66" },
  ACCEPTED: { label: "ACCEPTED", bg: "#062a14", fg: "#9ff7b3" },
  REJECTED: { label: "REJECTED", bg: "#2a0707", fg: "#ff9e9e" },
  CANCELLED: { label: "CANCELLED", bg: "#2a0707", fg: "#ff9e9e" },
  IN_KITCHEN: { label: "IN KITCHEN", bg: "#001f2a", fg: "#7ad9ff" },
  READY: { label: "READY", bg: "#20122a", fg: "#d7a6ff" },
  SERVED: { label: "SERVED", bg: "#1b1b1b", fg: "#eaeaea" },
};

function StatusPill({ status }) {
  const s = STATUS_META[status] || { label: status, bg: "#1b1b1b", fg: "#eaeaea" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #2a2a2a",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default function LiveOrdersPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [showBillHistory, setShowBillHistory] = useState(false);

  // ✅ This fixes your crash when billing_closed tries to call setRevenueTick
  const [revenueTick, setRevenueTick] = useState(0);

  const [billingOpen, setBillingOpen] = useState(false);
  const [billingTable, setBillingTable] = useState(null);

  const refreshTimerRef = useRef(null);
  const socketRef = useRef(null);

  const styles = {
    cardStyle: {
      background: "#111",
      borderRadius: 12,
      padding: 14,
      border: "1px solid #222",
    },
    btnStyle: {
      background: "#1a1a1a",
      color: "#fff",
      border: "1px solid #2a2a2a",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
    },
    smallMuted: {
      fontSize: 12,
      color: "#9aa0a6",
    },
  };

  const fetchLive = async () => {
    setErr("");
    const data = await apiFetch("/api/admin/orders/live-by-table");
    setTables(Array.isArray(data?.tables) ? data.tables : []);
  };

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      try {
        await fetchLive();
      } catch (e) {
        setErr(e.message || "Failed to refresh live orders");
      }
    }, 250);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await fetchLive();
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load live orders");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, []);

  // ✅ Socket.IO
  useEffect(() => {
    const token = getToken();
    const payload = token ? safeDecodeJwtPayload(token) : null;
    const restaurantId = payload?.restaurantId || null;

    if (!API_BASE) {
      console.warn("NEXT_PUBLIC_API_URL is missing; Socket.IO disabled.");
      return;
    }

    const socket = io(API_BASE, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (restaurantId) socket.emit("join_admin_room", { restaurantId });
    });

    socket.on("order_updated", () => {
      scheduleRefresh();
    });

    socket.on("billing_closed", () => {
      scheduleRefresh();
      setRevenueTick((x) => x + 1);
      <RevenueSummaryPanel styles={styles} refreshKey={revenueTick} />
    });

    socket.on("connect_error", (e) => {
      console.error("Socket connect_error:", e?.message || e);
    });

    return () => {
      try {
        if (restaurantId) socket.emit("leave_admin_room", { restaurantId });
        socket.off("order_updated");
        socket.off("billing_closed");
        socket.disconnect();
      } catch {}
    };
  }, []);

  const filteredTables = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return tables;

    return tables.filter((t) => {
      const hay = `${t.tableCode || ""}`.toLowerCase();
      if (hay.includes(q)) return true;

      const orders = Array.isArray(t.orders) ? t.orders : [];
      return orders.some((o) =>
        (o?.orderItems || o?.items || []).some((it) =>
          `${it?.name || ""}`.toLowerCase().includes(q)
        )
      );
    });
  }, [tables, search]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      setErr("");
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      scheduleRefresh();
    } catch (e) {
      setErr(e.message || "Failed to update status");
    }
  };

  // styles
  const containerStyle = { minHeight: "100vh", background: "#0b0b0b", color: "#eaeaea", padding: 16 };

  const cardStyle = {
    background: "#121212",
    border: "1px solid #262626",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  };

  const btnStyle = {
    background: "#1c1c1c",
    border: "1px solid #2a2a2a",
    color: "#eaeaea",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
  };

  const btnDanger = { ...btnStyle, background: "#2a0707", border: "1px solid #3a0f0f", color: "#ffb3b3" };
  const btnOk = { ...btnStyle, background: "#062a14", border: "1px solid #0d3a1e", color: "#b7ffd0" };
  const smallMuted = { color: "#a5a5a5", fontSize: 12 };

  return (
    <div style={containerStyle}>
      {showBillHistory && (
        <BillHistoryPanel tables={tables} styles={{ cardStyle, btnStyle, btnOk, btnDanger, smallMuted }} />
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Live Orders (By Table)</h2>

        <button style={btnStyle} onClick={() => setShowBillHistory((v) => !v)}>
          {showBillHistory ? "Hide Bill History" : "Show Bill History"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table or item..."
            style={{
              background: "#0f0f0f",
              border: "1px solid #2a2a2a",
              color: "#eaeaea",
              padding: "8px 10px",
              borderRadius: 10,
              width: 240,
              outline: "none",
            }}
          />

          <button
            style={btnStyle}
            onClick={async () => {
              try {
                setLoading(true);
                await fetchLive();
              } catch (e) {
                setErr(e.message || "Refresh failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ ...cardStyle, borderColor: "#3a0f0f", background: "#160707", color: "#ffb3b3", marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : filteredTables.length === 0 ? (
        <div style={cardStyle}>No live orders.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {filteredTables.map((t) => {
            const orders = Array.isArray(t.orders) ? t.orders : [];
            return (
              <div key={t.tableId} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    Table: <span style={{ color: "#fff" }}>{t.tableCode}</span>
                  </div>

                  <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={smallMuted}>
                      Open Total: <b style={{ color: "#fff" }}>{formatMoney(t.totalOpenAmount)}</b>
                    </div>

                    <div style={smallMuted}>
                      Orders: <b style={{ color: "#fff" }}>{orders.length}</b>
                    </div>

                    <button
                      style={btnStyle}
                      onClick={() => {
                        setBillingTable({ tableId: t.tableId, tableCode: t.tableCode });
                        setBillingOpen(true);
                      }}
                    >
                      Billing
                    </button>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                <div style={{ display: "grid", gap: 10 }}>
                  {orders.map((o) => {
                    const items = o.orderItems || o.items || [];
                    return (
                      <div
                        key={o._id}
                        style={{
                          border: "1px solid #262626",
                          borderRadius: 12,
                          padding: 12,
                          background: "#0f0f0f",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>Order #{String(o._id).slice(-6)}</div>

                          <StatusPill status={o.status} />

                          <div style={{ marginLeft: "auto", ...smallMuted }}>
                            Total: <b style={{ color: "#fff" }}>{formatMoney(o.totalAmount)}</b>
                          </div>
                        </div>

                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          {items.map((it, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 10, ...smallMuted }}>
                              <div style={{ flex: 1, color: "#eaeaea" }}>
                                {it?.name} <span style={{ color: "#a5a5a5" }}>x{it?.quantity || 0}</span>
                              </div>
                              <div>{formatMoney(it?.price)}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {o.status === "PENDING" ? (
                            <>
                              <button style={btnOk} onClick={() => updateOrderStatus(o._id, "ACCEPTED")}>
                                Accept
                              </button>
                              <button style={btnDanger} onClick={() => updateOrderStatus(o._id, "REJECTED")}>
                                Reject
                              </button>
                            </>
                          ) : (
                            <div style={smallMuted}>Use next lifecycle buttons in next step (IN_KITCHEN → READY → SERVED)</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BillingModal
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        tableId={billingTable?.tableId}
        tableCode={billingTable?.tableCode}
        onClosed={() => scheduleRefresh()}
        styles={{ cardStyle, btnStyle, btnOk, btnDanger, smallMuted }}
      />

      <RevenueSummaryPanel
        styles={{ cardStyle, btnStyle, smallMuted }}
        refreshKey={revenueTick}
      />
    </div>
  );
}
