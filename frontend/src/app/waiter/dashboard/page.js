"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getWaiterToken, clearWaiterToken } from "@/lib/auth";
import { io } from "socket.io-client";

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = [
      { freq: 1046.5,  start: 0.0,  dur: 0.12 },
      { freq: 1318.5,  start: 0.13, dur: 0.12 },
      { freq: 1567.98, start: 0.26, dur: 0.22 },
    ];
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
      gain.gain.linearRampToValueAtTime(0.95, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t1);
      osc.start(t0); osc.stop(t1 + 0.05);
    });
  } catch (err) { console.warn("[CHIME]", err); }
}

function StatusDot({ status }) {
  const cfg = {
    connected:    { color: "#10b981", label: "Connected",    pulse: true },
    disconnected: { color: "#8a8070", label: "Disconnected", pulse: false },
    error:        { color: "#ef4444", label: "Error",        pulse: false },
  }[status] || { color: "#8a8070", label: status, pulse: false };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: `${cfg.color}14`, border: `1px solid ${cfg.color}30`, fontSize: 12, fontWeight: 600, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", animation: cfg.pulse ? "pulse 2s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}

export default function WaiterDashboardPage() {
  const router = useRouter();
  const [token, setToken]               = useState(null);
  const [tables, setTables]             = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [events, setEvents]             = useState([]);
  const [status, setStatus]             = useState("disconnected");
  const socketRef = useRef(null);

  // ✅ Read sessionStorage only after mount
  useEffect(() => {
    const t = getWaiterToken();
    if (!t) { router.push("/waiter/login"); return; }
    setToken(t);
  }, []);

  const fetchMyTables = async () => {
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
  };

  useEffect(() => { if (token) fetchMyTables(); }, [token]);

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

    socket.on("waiter:called", (payload) => {
      setEvents(prev => {
        if (prev.some(ev => !ev.blurred && ev.payload?.tableCode === payload?.tableCode)) return prev;
        playNotificationChime();
        return [{ id: `${Date.now()}_${Math.random()}`, type: "WAITER_CALLED", payload, ts: new Date().toISOString() }, ...prev];
      });
    });

    socket.on("service_request", ({ request } = {}) => {
      if (!request || request.type !== "WAITER") return;
      playNotificationChime();
      setEvents(prev => {
        if (prev.some(ev => !ev.blurred && ev.payload?.tableCode === request?.tableCode)) return prev;
        return [{ id: `${Date.now()}_${Math.random()}`, type: "SERVICE_REQUEST", payload: request, ts: new Date().toISOString() }, ...prev];
      });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const logout = () => {
    clearWaiterToken();
    try { socketRef.current?.disconnect(); } catch {}
    router.push("/waiter/login");
  };

  const handleAccept = (eventId, payload) => {
    const { orderId, tableCode, waiterUserId, restaurantId } = payload;
    socketRef.current?.emit("waiter:accepted", {
      restaurantId, tableCode, waiterUserId,
      payload: { orderId, status: "accepted", waiterUserId, tableCode },
    });
    setEvents(prev => prev.map(ev =>
      ev.id === eventId ? { ...ev, type: "WAITER_ACCEPTED", payload: { ...ev.payload, status: "accepted" }, blurred: true } : ev
    ));
    setTimeout(() => setEvents(prev => prev.filter(ev => ev.id !== eventId)), 60000);
  };

  if (!token) return null;

  const activeEvents = events.filter(ev => !ev.blurred);
  const acceptedEvents = events.filter(ev => ev.blurred);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4);} 60%{box-shadow:0 0 0 14px rgba(201,168,76,0);} }
        @keyframes spin { to { transform:rotate(360deg); } }
        .wd-btn { transition: all 0.2s; font-family: inherit; }
        .wd-btn:hover { transform: translateY(-1px); opacity: 0.9; }
        .wd-table-pill:hover { border-color: rgba(201,168,76,0.4) !important; color: #c9a84c !important; }
        .wd-notif { animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif" }}>

        {/* TOPBAR */}
        <header style={{ height: 60, background: "#111009", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
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

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>

          {/* PAGE HEADER */}
          <div style={{ marginBottom: 28, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
            <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Waiter Dashboard</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#f5f0e8", margin: "0 0 6px", letterSpacing: -0.5 }}>Live Notifications</h1>
            <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Receive real-time calls from your assigned tables</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 18 }} />
          </div>

          {/* ACTIVE CALLS BANNER */}
          {activeEvents.length > 0 && (
            <div style={{ padding: "14px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12, animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "ringPulse 1.5s infinite", flexShrink: 0 }}>🔔</div>
              <div>
                <p style={{ fontWeight: 700, color: "#c9a84c", fontSize: 14, margin: 0 }}>{activeEvents.length} active call{activeEvents.length > 1 ? "s" : ""} waiting</p>
                <p style={{ fontSize: 12, color: "#8a8070", margin: 0 }}>Tap Accept to acknowledge</p>
              </div>
            </div>
          )}

          {/* ASSIGNED TABLES */}
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "18px 20px", marginBottom: 20, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" fill="none" stroke="#c9a84c" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>My Tables</p>
                  <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{tables.length} assigned</p>
                </div>
              </div>
              <button className="wd-btn" onClick={fetchMyTables}
                style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 9, color: "#8a8070", fontSize: 12, cursor: "pointer" }}>
                Refresh
              </button>
            </div>
            {loadingTables ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8a8070", fontSize: 13 }}>
                <svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                Loading tables...
              </div>
            ) : tables.length === 0 ? (
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, textAlign: "center" }}>
                <p style={{ color: "#8a8070", fontSize: 13, margin: 0 }}>No tables assigned yet — ask your admin to assign you</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tables.map(t => (
                  <span key={t._id} className="wd-table-pill" style={{ padding: "6px 14px", borderRadius: 999, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)", color: "#c8bfb0", fontSize: 13, fontWeight: 600, transition: "all 0.2s", cursor: "default" }}>
                    {t.tableCode}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* NOTIFICATIONS */}
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden", animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: activeEvents.length > 0 ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeEvents.length > 0 ? "rgba(201,168,76,0.3)" : "rgba(245,240,232,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  🔔
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Live Notifications</p>
                  <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>
                    {events.length === 0 ? "Waiting for calls..." : `${activeEvents.length} pending · ${acceptedEvents.length} accepted`}
                  </p>
                </div>
              </div>
              {events.length > 0 && (
                <button className="wd-btn" onClick={() => setEvents([])}
                  style={{ padding: "6px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 9, color: "#f87171", fontSize: 12, cursor: "pointer" }}>
                  Clear All
                </button>
              )}
            </div>

            {events.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.4 }}>🔕</div>
                <p style={{ color: "#4a4540", fontSize: 14, fontWeight: 500, margin: "0 0 6px" }}>No calls yet</p>
                <p style={{ color: "#4a4540", fontSize: 12, margin: 0 }}>Waiting for customers to call…</p>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {events.map(ev => {
                  const p = ev.payload || {};
                  const tableCode = p.tableCode || p?.payload?.tableCode;
                  const isAccepted = ev.blurred;
                  return (
                    <div key={ev.id} className="wd-notif" style={{ padding: "14px 16px", borderRadius: 14, background: isAccepted ? "rgba(255,255,255,0.01)" : "rgba(201,168,76,0.05)", border: `1px solid ${isAccepted ? "rgba(245,240,232,0.06)" : "rgba(201,168,76,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: isAccepted ? 0.5 : 1, transition: "opacity 0.3s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: isAccepted ? "rgba(255,255,255,0.04)" : "rgba(201,168,76,0.12)", border: `1px solid ${isAccepted ? "rgba(245,240,232,0.08)" : "rgba(201,168,76,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {isAccepted ? "✓" : "🔔"}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: "0 0 3px" }}>
                            Customer called from{" "}
                            {tableCode && <span style={{ color: isAccepted ? "#8a8070" : "#c9a84c" }}>Table {tableCode}</span>}
                          </p>
                          <p style={{ fontSize: 11, color: "#4a4540", margin: 0 }}>{new Date(ev.ts).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {isAccepted ? (
                          <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>Accepted</span>
                        ) : (
                          <>
                            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", animation: "pulse 2s infinite" }}>NEW</span>
                            <button className="wd-btn" onClick={() => handleAccept(ev.id, ev.payload)}
                              style={{ padding: "8px 18px", background: "#c9a84c", border: "none", borderRadius: 10, color: "#0e0e0e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                              Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}