"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import BillingModal from "../../components/BillingModal";
import RevenueSummaryPanel from "../../components/RevenueSummaryPanel";
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
    return JSON.parse(atob(padded));
  } catch { return null; }
}
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}
function formatMoney(n) { return `₹${Number(n || 0).toFixed(2)}`; }
const STATUS_META = {
  PENDING:   { label: "Pending",    bg: "rgba(251,191,36,0.1)",  fg: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  ACCEPTED:  { label: "Accepted",   bg: "rgba(16,185,129,0.1)",  fg: "#10b981", border: "rgba(16,185,129,0.25)" },
  REJECTED:  { label: "Rejected",   bg: "rgba(239,68,68,0.1)",   fg: "#ef4444", border: "rgba(239,68,68,0.25)" },
  IN_KITCHEN:{ label: "In Kitchen", bg: "rgba(99,102,241,0.1)",  fg: "#818cf8", border: "rgba(99,102,241,0.25)" },
  READY:     { label: "Ready",      bg: "rgba(34,197,94,0.1)",   fg: "#22c55e", border: "rgba(34,197,94,0.25)" },
  SERVED:    { label: "Served",     bg: "rgba(148,163,184,0.1)", fg: "#94a3b8", border: "rgba(148,163,184,0.25)" },
};
function StatusPill({ status }) {
  const s = STATUS_META[status] || { label: status, bg: "rgba(255,255,255,0.05)", fg: "#8a8070", border: "rgba(255,255,255,0.1)" };
  return (
    <span style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}`, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = {
    success: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", fg: "#10b981" },
    bill:    { bg: "rgba(201,168,76,0.1)",  border: "rgba(201,168,76,0.2)",  fg: "#c9a84c" },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "14px 20px", background: "#161410", border: `1px solid ${c.border}`, borderRadius: 14, boxShadow: "0 20px 40px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 12, maxWidth: 360, animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
      <span style={{ fontSize: 18 }}>{type === "bill" ? "🧾" : "✓"}</span>
      <span style={{ color: "#f5f0e8", fontSize: 13, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#8a8070", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
    </div>
  );
}
export default function LiveOrdersPage() {
  const router = useRouter();
  useEffect(() => { const t = getToken(); if (!t) router.push("/admin/login"); }, [router]);
  const [tables, setTables]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState("");
  const [search, setSearch]           = useState("");
  const [revenueTick, setRevenueTick] = useState(0);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingTable, setBillingTable] = useState(null);
  const [billRequests, setBillRequests] = useState([]);
  const [toast, setToast]             = useState(null);
  const refreshTimerRef  = useRef(null);
  const socketRef        = useRef(null);
  const restaurantIdRef  = useRef(null);
  const cardStyle  = { background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" };
  const btnStyle   = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", color: "#c8bfb0", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" };
  const btnDanger  = { ...btnStyle, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" };
  const btnOk      = { ...btnStyle, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" };
  const btnGold    = { ...btnStyle, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "#c9a84c" };
  const smallMuted = { color: "#8a8070", fontSize: 12 };
  const fetchLive = async () => {
    setErr("");
    const data = await apiFetch("/api/admin/orders/live-by-table");
    setTables(Array.isArray(data?.tables) ? data.tables : []);
  };
  const fetchBillRequests = async (restaurantId) => {
    if (!restaurantId) return;
    try { const data = await apiFetch(`/api/admin/requests?status=OPEN&type=BILL&restaurantId=${restaurantId}`); setBillRequests(Array.isArray(data?.requests) ? data.requests : []); } catch {}
  };
  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => { refreshTimerRef.current = null; try { await fetchLive(); } catch (e) { setErr(e.message); } }, 250);
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { setLoading(true); await fetchLive(); } catch (e) { if (mounted) setErr(e.message); } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []);
  useEffect(() => {
    const token = getToken();
    const payload = token ? safeDecodeJwtPayload(token) : null;
    const restaurantId = payload?.restaurantId || localStorage.getItem("restaurantId") || null;
    restaurantIdRef.current = restaurantId;
    if (!API_BASE) return;
    const socket = io(API_BASE, { transports: ["websocket", "polling"], withCredentials: true });
    socketRef.current = socket;
    const onConnect = () => {
      if (token) socket.emit("join_admin_room_secure", { token });
      if (restaurantId) fetchBillRequests(restaurantId);
    };
    const onOrderUpdated  = () => scheduleRefresh();
    const onBillingClosed = () => { scheduleRefresh(); setRevenueTick(x => x + 1); };
    const onServiceRequest = ({ request }) => {
      if (!request) return;
      if (request.type === "BILL") {
        setToast({ msg: `Bill requested — Table ${request.tableCode}`, type: "bill" });
        setBillRequests(prev => prev.some(r => String(r._id) === String(request._id)) ? prev : [request, ...prev]);
      }
      // waiter calls: toast only, no persistent panel
      if (request.type === "WAITER") {
        setToast({ msg: `Waiter called — Table ${request.tableCode}`, type: "success" });
      }
    };
    const onServiceRequestUpdate = ({ request }) => {
      if (!request?._id || request?.type !== "BILL") return;
      setBillRequests(prev => prev.map(r => String(r._id) === String(request._id) ? request : r).filter(r => r.status === "OPEN" && r.type === "BILL"));
    };
    socket.on("connect", onConnect);
    socket.on("order_updated", onOrderUpdated);
    socket.on("order:updated", onOrderUpdated);
    socket.on("order:created", onOrderUpdated);
    socket.on("billing_closed", onBillingClosed);
    socket.on("service_request", onServiceRequest);
    socket.on("service_request_update", onServiceRequestUpdate);
    socket.on("connect_error", e => console.error("Socket error:", e?.message));
    return () => {
      try { if (restaurantId) socket.emit("leave_admin_room", { restaurantId }); socket.disconnect(); } catch {}
    };
  }, []);
  const filteredTables = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => {
      if (`${t.tableCode || ""}`.toLowerCase().includes(q)) return true;
      return (Array.isArray(t.orders) ? t.orders : []).some(o => (o?.items || []).some(it => `${it?.name || ""}`.toLowerCase().includes(q)));
    });
  }, [tables, search]);
  const updateOrderStatus = async (orderId, status) => {
    try { setErr(""); await apiFetch(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); scheduleRefresh(); }
    catch (e) { setErr(e.message); }
  };
  const ackBillRequest   = async (id) => { try { await apiFetch(`/api/admin/requests/${id}/ack`,   { method: "PATCH" }); await fetchBillRequests(restaurantIdRef.current); } catch (e) { setErr(e.message); } };
  const closeBillRequest = async (id) => { try { await apiFetch(`/api/admin/requests/${id}/close`, { method: "PATCH" }); await fetchBillRequests(restaurantIdRef.current); } catch (e) { setErr(e.message); } };
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .lo-btn:hover { background: rgba(245,240,232,0.08) !important; color: #f5f0e8 !important; }
        .lo-btn-danger:hover { background: rgba(239,68,68,0.15) !important; }
        .lo-btn-ok:hover { background: rgba(16,185,129,0.15) !important; }
        .lo-btn-gold:hover { background: rgba(201,168,76,0.2) !important; }
        .lo-card:hover { border-color: rgba(245,240,232,0.12) !important; }
        .lo-input:focus { border-color: rgba(201,168,76,0.4) !important; background: rgba(255,255,255,0.05) !important; }
        .lo-order-card { transition: border-color 0.2s; }
        .lo-order-card:hover { border-color: rgba(245,240,232,0.12) !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "24px 20px", fontFamily: "'DM Sans', sans-serif" }}>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Dashboard</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.5 }}>Live Orders</h1>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" fill="none" stroke="#8a8070" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35"/></svg>
                <input className="lo-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search table or item..." style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", color: "#f5f0e8", padding: "9px 14px 9px 36px", borderRadius: 12, fontSize: 13, outline: "none", width: 220, fontFamily: "inherit", transition: "all 0.2s" }} />
              </div>
              <button className="lo-btn" style={btnGold} onClick={async () => { try { setLoading(true); await fetchLive(); await fetchBillRequests(restaurantIdRef.current); } catch (e) { setErr(e.message); } finally { setLoading(false); } }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh
                </span>
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: "#8a8070" }}>Live • Updates automatically</span>
            {tables.length > 0 && <span style={{ fontSize: 12, color: "#8a8070" }}>• {tables.length} active table{tables.length !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginBottom: 24 }} />
        {err && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, marginBottom: 16, color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <span>⚠</span>{err}
          </div>
        )}
        {/* BILL REQUESTS */}
        {billRequests.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 16, borderColor: "rgba(201,168,76,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧾</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Bill Requests</p>
                  <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{billRequests.length} pending</p>
                </div>
              </div>
              <button className="lo-btn" style={btnStyle} onClick={() => fetchBillRequests(restaurantIdRef.current)}>Reload</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {billRequests.slice(0, 10).map(r => (
                <div key={r._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 12, gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Table <span style={{ color: "#c9a84c" }}>{r.tableCode}</span></p>
                    <p style={{ fontSize: 11, color: "#8a8070", margin: "3px 0 0" }}>{new Date(r.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="lo-btn-ok"     style={btnOk}     onClick={() => ackBillRequest(r._id)}>Acknowledge</button>
                    <button className="lo-btn-danger" style={btnDanger} onClick={() => closeBillRequest(r._id)}>Close</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ORDERS */}
        {loading ? (
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, color: "#8a8070" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading live orders...
          </div>
        ) : filteredTables.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
            <p style={{ color: "#f5f0e8", fontWeight: 600, marginBottom: 6 }}>No live orders</p>
            <p style={{ color: "#8a8070", fontSize: 13 }}>Orders will appear here as customers place them</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredTables.map(t => {
              const orders      = Array.isArray(t.orders) ? t.orders : [];
              const hasBillReq  = billRequests.some(r => r.tableCode === t.tableCode);
              return (
                <div key={t.tableId} className="lo-card" style={{ ...cardStyle, borderColor: hasBillReq ? "rgba(201,168,76,0.3)" : "rgba(245,240,232,0.07)", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" fill="none" stroke="#c9a84c" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: "#f5f0e8", margin: 0 }}>Table <span style={{ color: "#c9a84c" }}>{t.tableCode}</span></p>
                        <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
                      </div>
                      {hasBillReq && (
                        <span style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>🧾 Bill Requested</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>Open Total</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c", margin: 0, fontFamily: "'Playfair Display', serif" }}>{formatMoney(t.totalOpenAmount)}</p>
                      </div>
                      <button className="lo-btn-gold" style={btnGold} onClick={() => { setBillingTable({ tableId: t.tableId, tableCode: t.tableCode }); setBillingOpen(true); }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Billing
                        </span>
                      </button>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "rgba(245,240,232,0.05)", marginBottom: 14 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {orders.map(o => {
                      const items = o.items || o.orderItems || [];
                      return (
                        <div key={o._id} className="lo-order-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Order <span style={{ color: "#8a8070" }}>#{String(o._id).slice(-6)}</span></p>
                            <StatusPill status={o.status} />
                            <p style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#c9a84c", margin: 0 }}>{formatMoney(o.totalAmount)}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                            {items.map((it, idx) => (
                              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ color: "#c8bfb0" }}>{it?.name} <span style={{ color: "#8a8070" }}>×{it?.quantity || 0}</span></span>
                                <span style={{ color: "#8a8070" }}>₹{Number(it?.price || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {o.status === "PENDING" && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="lo-btn-ok" style={{ ...btnOk, flex: 1 }} onClick={() => updateOrderStatus(o._id, "ACCEPTED")}>
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  Accept
                                </span>
                              </button>
                              <button className="lo-btn-danger" style={{ ...btnDanger, flex: 1 }} onClick={() => updateOrderStatus(o._id, "REJECTED")}>
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  Reject
                                </span>
                              </button>
                            </div>
                          )}
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
        <RevenueSummaryPanel styles={{ cardStyle, btnStyle, smallMuted }} refreshKey={revenueTick} />
      </div>
    </>
  );
}