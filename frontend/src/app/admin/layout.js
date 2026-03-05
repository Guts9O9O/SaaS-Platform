"use client";
import "@/app/globals.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { getAdminToken, clearAdminToken } from "@/lib/auth";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const socketRef = useRef(null);
  const [suspension, setSuspension] = useState(null); // { status, message }

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { router.replace("/admin/login"); return; }

    // ── Auth check ──────────────────────────────────────────
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        // If it's a suspension message show modal instead of redirect
        if (data?.message?.toLowerCase().includes("suspend") || data?.message?.toLowerCase().includes("inactive")) {
          setSuspension({ status: "SUSPENDED", message: data.message });
          return;
        }
        clearAdminToken();
        localStorage.removeItem("adminUser");
        localStorage.removeItem("restaurantId");
        router.replace("/admin/login");
      }
    }).catch(() => {});

    // ── Socket: ONLY for subscription_update events ─────────
    // Uses a separate socket instance so it never conflicts
    // with the live-orders page socket.
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      forceNew: true, // ✅ separate connection, never shared
    });

    socketRef.current.on("connect", () => {
      // Join using token — backend puts us in restaurant_<id> room
      socketRef.current.emit("join_admin_room_secure", { token });
    });

    // ✅ Only listen to subscription events — nothing else
    socketRef.current.on("subscription_update", ({ status, message }) => {
      if (status === "SUSPENDED" || status === "INACTIVE") {
        setSuspension({ status, message });
      } else if (status === "ACTIVE" || status === "TRIAL") {
        setSuspension(null);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-screen" style={{ background: "#0b0b0b", color: "#eaeaea" }}>
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto" style={{ padding: 16, background: "#0b0b0b" }}>
          {children}
        </main>
      </div>

      {/* ── Suspension Modal ─────────────────────────────── */}
      {suspension && <SuspensionModal message={suspension.message} status={suspension.status} onLogout={() => { clearAdminToken(); localStorage.removeItem("adminUser"); localStorage.removeItem("restaurantId"); router.replace("/admin/login"); }} />}
    </div>
  );
}

function SuspensionModal({ message, status, onLogout }) {
  const isInactive = status === "INACTIVE";
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 16px rgba(239,68,68,0); } }
      `}</style>

      {/* Overlay — not dismissable */}
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ width:"100%", maxWidth:480, background:"#161410", border:"1px solid rgba(239,68,68,0.2)", borderRadius:28, overflow:"hidden", animation:"modalIn 0.4s cubic-bezier(0.16,1,0.3,1) both", boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>

          {/* Red top bar */}
          <div style={{ height:4, background:"linear-gradient(90deg, #ef4444, #dc2626)" }} />

          <div style={{ padding:"40px 40px 36px" }}>
            {/* Icon */}
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", animation:"pulse-ring 2s infinite" }}>
              <svg width="28" height="28" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            {/* Title */}
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#f5f0e8", textAlign:"center", margin:"0 0 12px", letterSpacing:-0.5 }}>
              {isInactive ? "Account Deactivated" : "Subscription Suspended"}
            </h2>

            {/* Message */}
            <p style={{ fontSize:14, color:"#8a8070", textAlign:"center", lineHeight:1.7, margin:"0 0 8px", fontWeight:300 }}>
              {message}
            </p>

            {/* Divider */}
            <div style={{ height:1, background:"rgba(245,240,232,0.06)", margin:"28px 0" }} />

            {/* What this means */}
            <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.1)", borderRadius:14, padding:"16px 20px", marginBottom:28 }}>
              <p style={{ fontSize:12, letterSpacing:1.5, textTransform:"uppercase", color:"#ef4444", fontWeight:600, marginBottom:10 }}>What this means</p>
              {["Your menu is no longer accessible to customers", "All admin features are temporarily disabled", "Your data is safe and will be restored on reactivation"].map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom: i < 2 ? 8 : 0 }}>
                  <span style={{ color:"#ef4444", marginTop:1, flexShrink:0 }}>•</span>
                  <span style={{ fontSize:13, color:"#c8bfb0", lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Contact support */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <p style={{ fontSize:13, color:"#8a8070", marginBottom:16 }}>To reactivate your account, contact support:</p>
              <a href="mailto:support@dineflow.co.in" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:100, fontSize:13, fontWeight:600, color:"#c9a84c", textDecoration:"none", transition:"all 0.2s" }}
                onMouseOver={e => e.currentTarget.style.background="rgba(201,168,76,0.2)"}
                onMouseOut={e => e.currentTarget.style.background="rgba(201,168,76,0.1)"}>
                ✉ support@dineflow.co.in
              </a>
            </div>

            {/* Logout button */}
            <button onClick={onLogout} style={{ width:"100%", padding:"14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(245,240,232,0.08)", borderRadius:14, fontSize:14, fontWeight:500, color:"#8a8070", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.color="#f5f0e8"; }}
              onMouseOut={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#8a8070"; }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}