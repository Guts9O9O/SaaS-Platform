"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaiterToken, clearWaiterToken } from "@/lib/auth";
import { io } from "socket.io-client";

function playChime(type = "call") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = type === "bill"
      ? [{ freq: 880, start: 0.0, dur: 0.1 }, { freq: 1108.73, start: 0.12, dur: 0.1 }, { freq: 1318.5, start: 0.24, dur: 0.18 }]
      : [{ freq: 1046.5, start: 0.0, dur: 0.12 }, { freq: 1318.5, start: 0.13, dur: 0.12 }, { freq: 1567.98, start: 0.26, dur: 0.22 }];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-10, ctx.currentTime);
      comp.knee.setValueAtTime(3, ctx.currentTime);
      comp.ratio.setValueAtTime(6, ctx.currentTime);
      comp.attack.setValueAtTime(0.001, ctx.currentTime);
      comp.release.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain); gain.connect(comp); comp.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      const t0 = ctx.currentTime + start, t1 = t0 + dur;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.9, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t1);
      osc.start(t0); osc.stop(t1 + 0.05);
    });
  } catch (err) { console.warn("[CHIME]", err); }
}

function moneyINR(n) { return `₹${Number(n || 0).toFixed(2)}`; }

function StatusDot({ status }) {
  const cfg = {
    connected:    { color: "#10b981", label: "Live",         pulse: true },
    disconnected: { color: "#8a8070", label: "Disconnected", pulse: false },
    error:        { color: "#ef4444", label: "Error",        pulse: false },
  }[status] || { color: "#8a8070", label: status, pulse: false };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: `${cfg.color}14`, border: `1px solid ${cfg.color}30`, fontSize: 12, fontWeight: 600, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", animation: cfg.pulse ? "wdPulse 2s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    PENDING:   { bg: "rgba(255,255,255,0.05)", color: "#8a8070",  border: "rgba(255,255,255,0.08)", label: "Pending" },
    ACCEPTED:  { bg: "rgba(234,179,8,0.1)",   color: "#eab308",  border: "rgba(234,179,8,0.25)",   label: "Accepted" },
    PREPARING: { bg: "rgba(59,130,246,0.1)",  color: "#60a5fa",  border: "rgba(59,130,246,0.25)",  label: "Preparing" },
    SERVED:    { bg: "rgba(16,185,129,0.1)",  color: "#10b981",  border: "rgba(16,185,129,0.25)",  label: "Served" },
    COMPLETED: { bg: "rgba(201,168,76,0.1)",  color: "#c9a84c",  border: "rgba(201,168,76,0.25)",  label: "Completed" },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
}

// ─── TABLE ORDER CARD ─────────────────────────────────────────────────────────
function TableOrderCard({ tableCode, orders, totalAmount, isNew }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ background: isNew ? "rgba(201,168,76,0.04)" : "#161410", border: `1px solid ${isNew ? "rgba(201,168,76,0.25)" : "rgba(245,240,232,0.07)"}`, borderRadius: 16, overflow: "hidden", animation: "wdSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)", transition: "border-color 0.3s" }}>
      {/* Table header */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: isNew ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${isNew ? "rgba(201,168,76,0.3)" : "rgba(245,240,232,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
            🪑
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f5f0e8", margin: 0 }}>Table {tableCode}</p>
            <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{orders.length} order{orders.length !== 1 ? "s" : ""} · {moneyINR(totalAmount)}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isNew && <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", animation: "wdPulse 2s infinite" }}>NEW</span>}
          <svg width="14" height="14" fill="none" stroke="#8a8070" viewBox="0 0 24 24" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((order, oi) => (
            <div key={order._id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.05)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#4a4540", fontWeight: 500 }}>Order #{oi + 1} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(order.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: "#c8bfb0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: "#4a4540", flexShrink: 0 }}>×{item.quantity}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#c9a84c", marginLeft: 12, flexShrink: 0 }}>{moneyINR((item.price || 0) * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.05)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#8a8070" }}>Order total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#c9a84c" }}>{moneyINR(order.totalAmount)}</span>
              </div>
            </div>
          ))}
          {/* Grand total for table */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: "#c8bfb0", fontWeight: 600 }}>Table Total</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>{moneyINR(totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICATION CARD ────────────────────────────────────────────────────────
function NotifCard({ ev, onAccept }) {
  const isBill = ev.type === "BILL_REQUESTED";
  const isAccepted = ev.blurred;
  const p = ev.payload || {};
  const tableCode = p.tableCode || p?.payload?.tableCode;
  return (
    <div className="wd-notif" style={{ padding: "14px 16px", borderRadius: 14, background: isAccepted ? "rgba(255,255,255,0.01)" : isBill ? "rgba(59,130,246,0.05)" : "rgba(201,168,76,0.05)", border: `1px solid ${isAccepted ? "rgba(245,240,232,0.06)" : isBill ? "rgba(59,130,246,0.2)" : "rgba(201,168,76,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: isAccepted ? 0.45 : 1, transition: "opacity 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: isAccepted ? "rgba(255,255,255,0.04)" : isBill ? "rgba(59,130,246,0.12)" : "rgba(201,168,76,0.12)", border: `1px solid ${isAccepted ? "rgba(245,240,232,0.08)" : isBill ? "rgba(59,130,246,0.25)" : "rgba(201,168,76,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {isAccepted ? "✓" : isBill ? "💳" : "🔔"}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: "0 0 3px" }}>
            {isBill ? "Bill requested" : "Customer called"}{" "}
            {tableCode && <span style={{ color: isAccepted ? "#8a8070" : isBill ? "#60a5fa" : "#c9a84c" }}>· Table {tableCode}</span>}
          </p>
          <p style={{ fontSize: 11, color: "#4a4540", margin: 0 }}>{new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {isAccepted ? (
          <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>Done</span>
        ) : (
          <>
            <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: isBill ? "rgba(59,130,246,0.12)" : "rgba(201,168,76,0.12)", border: `1px solid ${isBill ? "rgba(59,130,246,0.3)" : "rgba(201,168,76,0.3)"}`, color: isBill ? "#60a5fa" : "#c9a84c", animation: "wdPulse 2s infinite" }}>NEW</span>
            <button className="wd-btn" onClick={() => onAccept(ev.id)}
              style={{ padding: "8px 16px", background: isBill ? "rgba(59,130,246,0.8)" : "#c9a84c", border: "none", borderRadius: 10, color: isBill ? "#fff" : "#0e0e0e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {isBill ? "Noted" : "Accept"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WaiterDashboardPage() {
  const router = useRouter();
  const [token, setToken]                   = useState(null);
  const [tables, setTables]                 = useState([]);
  const [loadingTables, setLoadingTables]   = useState(true);
  const [tableOrders, setTableOrders]       = useState([]); // [{tableId, tableCode, orders, totalAmount}]
  const [loadingOrders, setLoadingOrders]   = useState(false);
  const [newTableIds, setNewTableIds]       = useState(new Set()); // tableIds with newly arrived orders
  const [events, setEvents]                 = useState([]);
  const [status, setStatus]                 = useState("disconnected");
  const [activeTab, setActiveTab]           = useState("orders"); // "orders" | "notifications"
  const socketRef = useRef(null);

  useEffect(() => {
    const t = getWaiterToken();
    if (!t) { router.push("/waiter/login"); return; }
    setToken(t);
  }, []);

  // ── Fetch assigned tables ─────────────────────────────────────────────────
  const fetchMyTables = useCallback(async () => {
    const t = getWaiterToken();
    if (!t) return;
    try {
      setLoadingTables(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/waiter/tables/my-tables`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message);
      setTables(Array.isArray(data?.tables) ? data.tables : []);
    } catch { setTables([]); } finally { setLoadingTables(false); }
  }, []);

  // ── Fetch orders for all assigned tables ─────────────────────────────────
  const fetchTableOrders = useCallback(async () => {
    const t = getWaiterToken();
    if (!t) return;
    try {
      setLoadingOrders(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/waiter/tables/orders`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message);
      setTableOrders(Array.isArray(data?.tableOrders) ? data.tableOrders : []);
    } catch { setTableOrders([]); } finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => { if (token) { fetchMyTables(); fetchTableOrders(); } }, [token]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("join_waiter_room", { token });
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    // ── Waiter called (existing) ───────────────────────────────────────────
    socket.on("waiter:called", (payload) => {
      playChime("call");
      setEvents(prev => {
        if (prev.some(ev => !ev.blurred && ev.type === "WAITER_CALLED" && ev.payload?.tableCode === payload?.tableCode)) return prev;
        return [{ id: `${Date.now()}_${Math.random()}`, type: "WAITER_CALLED", payload, ts: new Date().toISOString() }, ...prev];
      });
      setActiveTab("notifications");
    });

    // ── Bill requested (NEW) ───────────────────────────────────────────────
    socket.on("waiter:bill_requested", (payload) => {
      playChime("bill");
      setEvents(prev => {
        if (prev.some(ev => !ev.blurred && ev.type === "BILL_REQUESTED" && ev.payload?.tableCode === payload?.tableCode)) return prev;
        return [{ id: `${Date.now()}_${Math.random()}`, type: "BILL_REQUESTED", payload, ts: new Date().toISOString() }, ...prev];
      });
      setActiveTab("notifications");
    });

    // ── New order placed (NEW) ─────────────────────────────────────────────
    socket.on("waiter:new_order", (payload) => {
      // Add/update in tableOrders in real time
      setTableOrders(prev => {
        const existing = prev.find(g => g.tableId === payload.tableId);
        if (existing) {
          // Add the new order to existing table group
          const newOrder = {
            _id: payload.orderId,
            items: payload.items,
            totalAmount: payload.totalAmount,
            status: "PENDING",
            createdAt: payload.createdAt,
          };
          return prev.map(g => g.tableId === payload.tableId
            ? { ...g, orders: [...g.orders, newOrder], totalAmount: g.totalAmount + (payload.totalAmount || 0) }
            : g
          );
        } else {
          // New table appearing
          return [...prev, {
            tableId: payload.tableId,
            tableCode: payload.tableCode,
            orders: [{
              _id: payload.orderId,
              items: payload.items,
              totalAmount: payload.totalAmount,
              status: "PENDING",
              createdAt: payload.createdAt,
            }],
            totalAmount: payload.totalAmount || 0,
          }];
        }
      });
      // Mark this table as "new" for visual highlight
      setNewTableIds(prev => new Set([...prev, payload.tableId]));
      // Auto-clear new highlight after 10s
      setTimeout(() => {
        setNewTableIds(prev => { const s = new Set(prev); s.delete(payload.tableId); return s; });
      }, 10000);
      setActiveTab("orders");
    });

    // ── Bill closed — clear orders for that table (NEW) ───────────────────
    socket.on("waiter:bill_closed", (payload) => {
      setTableOrders(prev => prev.filter(g => g.tableId !== payload.tableId));
      setNewTableIds(prev => { const s = new Set(prev); s.delete(payload.tableId); return s; });
      // Add a brief notification
      setEvents(prev => [
        { id: `${Date.now()}_${Math.random()}`, type: "BILL_CLOSED", payload, ts: new Date().toISOString(), blurred: true },
        ...prev,
      ]);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const logout = () => {
    clearWaiterToken();
    try { socketRef.current?.disconnect(); } catch {}
    router.push("/waiter/login");
  };

  const handleAccept = (eventId) => {
    setEvents(prev => prev.map(ev =>
      ev.id === eventId ? { ...ev, blurred: true } : ev
    ));
    setTimeout(() => setEvents(prev => prev.filter(ev => ev.id !== eventId)), 60000);
  };

  if (!token) return null;

  const activeNotifs = events.filter(ev => !ev.blurred);
  const totalOrderCount = tableOrders.reduce((s, g) => s + g.orders.length, 0);
  const pendingNotifCount = activeNotifs.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes wdFadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes wdSlideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes wdPulse   { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes wdRing    { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4);} 60%{box-shadow:0 0 0 14px rgba(201,168,76,0);} }
        @keyframes wdSpin    { to { transform:rotate(360deg); } }
        .wd-btn { transition: all 0.2s; font-family: inherit; }
        .wd-btn:hover { transform: translateY(-1px); opacity: 0.88; }
        .wd-tab { transition: all 0.2s; font-family: inherit; cursor: pointer; border: none; }
        .wd-notif { animation: wdSlideIn 0.35s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── TOPBAR ── */}
        <header style={{ height: 60, background: "#111009", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" fill="none" stroke="#c9a84c" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: "#f5f0e8", margin: 0 }}>Waiter Portal</p>
              <p style={{ fontSize: 10, color: "#4a4540", margin: 0 }}>DineFlow</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusDot status={status} />
            <button className="wd-btn" onClick={logout}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>
        </header>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" }}>

          {/* ── PAGE HEADER ── */}
          <div style={{ marginBottom: 24, animation: "wdFadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
            <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 4 }}>Waiter Dashboard</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#f5f0e8", margin: "0 0 4px", letterSpacing: -0.5 }}>My Tables</h1>
            <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Live orders, notifications, and bill requests</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 16 }} />
          </div>

          {/* ── ALERT BANNERS ── */}
          {pendingNotifCount > 0 && (
            <div onClick={() => setActiveTab("notifications")} style={{ padding: "12px 16px", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", animation: "wdFadeUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, animation: "wdRing 1.5s infinite", flexShrink: 0 }}>🔔</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#c9a84c", fontSize: 13, margin: 0 }}>{pendingNotifCount} active alert{pendingNotifCount > 1 ? "s" : ""} waiting</p>
                <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>Tap to view notifications</p>
              </div>
              <svg width="14" height="14" fill="none" stroke="#c9a84c" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          )}

          {/* ── ASSIGNED TABLES STRIP ── */}
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, padding: "14px 16px", marginBottom: 18, animation: "wdFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.04s both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#8a8070", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Assigned Tables · {tables.length}</p>
              <button className="wd-btn" onClick={() => { fetchMyTables(); fetchTableOrders(); }}
                style={{ padding: "4px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 8, color: "#8a8070", fontSize: 11, cursor: "pointer" }}>
                Refresh
              </button>
            </div>
            {loadingTables ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4a4540", fontSize: 12 }}>
                <svg style={{ animation: "wdSpin 0.8s linear infinite" }} width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                Loading...
              </div>
            ) : tables.length === 0 ? (
              <p style={{ color: "#4a4540", fontSize: 12, margin: 0 }}>No tables assigned — ask your admin</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tables.map(t => {
                  const hasOrders = tableOrders.some(g => g.tableId === t._id);
                  return (
                    <span key={t._id} style={{ padding: "5px 12px", borderRadius: 999, background: hasOrders ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${hasOrders ? "rgba(201,168,76,0.25)" : "rgba(245,240,232,0.08)"}`, color: hasOrders ? "#c9a84c" : "#8a8070", fontSize: 12, fontWeight: 600 }}>
                      {t.tableCode}{hasOrders ? " •" : ""}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── TAB SWITCHER ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.06)", borderRadius: 14, padding: 4 }}>
            {[
              { key: "orders",        label: "Orders",        count: totalOrderCount,    icon: "🧾" },
              { key: "notifications", label: "Notifications", count: pendingNotifCount,  icon: "🔔" },
            ].map(tab => (
              <button key={tab.key} className="wd-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: activeTab === tab.key ? "#0e0e0e" : "#8a8070", background: activeTab === tab.key ? "#c9a84c" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: activeTab === tab.key ? "rgba(0,0,0,0.2)" : "rgba(201,168,76,0.15)", color: activeTab === tab.key ? "#0e0e0e" : "#c9a84c" }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── ORDERS TAB ── */}
          {activeTab === "orders" && (
            <div style={{ animation: "wdFadeUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: "#8a8070", margin: 0 }}>
                  {tableOrders.length === 0 ? "No active orders" : `${tableOrders.length} table${tableOrders.length > 1 ? "s" : ""} with open orders`}
                </p>
                <button className="wd-btn" onClick={fetchTableOrders}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 9, color: "#8a8070", fontSize: 12, cursor: "pointer" }}>
                  {loadingOrders
                    ? <svg style={{ animation: "wdSpin 0.8s linear infinite" }} width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                    : <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  }
                  Refresh
                </button>
              </div>
              {tableOrders.length === 0 ? (
                <div style={{ padding: "56px 24px", textAlign: "center", background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16 }}>
                  <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.3 }}>🧾</div>
                  <p style={{ color: "#4a4540", fontSize: 14, fontWeight: 500, margin: "0 0 6px" }}>No active orders</p>
                  <p style={{ color: "#4a4540", fontSize: 12, margin: 0 }}>Orders from your tables will appear here</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tableOrders.map(group => (
                    <TableOrderCard
                      key={group.tableId}
                      tableCode={group.tableCode}
                      orders={group.orders}
                      totalAmount={group.totalAmount}
                      isNew={newTableIds.has(group.tableId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === "notifications" && (
            <div style={{ animation: "wdFadeUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Live Notifications</p>
                    <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>
                      {events.length === 0 ? "Waiting for activity..." : `${pendingNotifCount} pending · ${events.length - pendingNotifCount} resolved`}
                    </p>
                  </div>
                  {events.length > 0 && (
                    <button className="wd-btn" onClick={() => setEvents([])}
                      style={{ padding: "5px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", fontSize: 12, cursor: "pointer" }}>
                      Clear All
                    </button>
                  )}
                </div>
                {events.length === 0 ? (
                  <div style={{ padding: "56px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.3 }}>🔕</div>
                    <p style={{ color: "#4a4540", fontSize: 14, fontWeight: 500, margin: "0 0 6px" }}>No activity yet</p>
                    <p style={{ color: "#4a4540", fontSize: 12, margin: 0 }}>Waiter calls and bill requests appear here</p>
                  </div>
                ) : (
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {events.map(ev => (
                      <NotifCard key={ev.id} ev={ev} onAccept={handleAccept} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}