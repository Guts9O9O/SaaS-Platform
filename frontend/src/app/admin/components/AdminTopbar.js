"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearAdminToken } from "@/lib/auth";

const PAGE_TITLES = {
  "/admin/live-orders": { title: "Live Orders", sub: "Real-time table activity" },
  "/admin/tables":      { title: "Tables", sub: "Manage & assign tables" },
  "/admin/waiters":     { title: "Waiters & Staff", sub: "Staff accounts" },
  "/admin/menu":        { title: "Menu Management", sub: "Categories & items" },
  "/admin/revenue":     { title: "Revenue Analytics", sub: "Earnings overview" },
  "/admin/customers":   { title: "Customer Analytics", sub: "Guest insights" },
  "/admin/requests":    { title: "Requests", sub: "Bill & waiter requests" },
};

export default function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) setAdminUser(JSON.parse(stored));
    } catch {}
  }, []);

  const restaurantName = adminUser?.restaurantName || adminUser?.name || "Restaurant";
  const pageInfo = PAGE_TITLES[pathname] || { title: "Dashboard", sub: "" };

  const handleLogout = () => {
    clearAdminToken();
    localStorage.removeItem("adminUser");
    localStorage.removeItem("restaurantId");
    router.replace("/admin/login");
  };

  const initials = restaurantName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .tb-logout:hover { background: rgba(239,68,68,0.12) !important; color: #fca5a5 !important; border-color: rgba(239,68,68,0.25) !important; }
        .tb-avatar:hover { border-color: rgba(201,168,76,0.5) !important; }
      `}</style>

      <header style={{ height: 60, borderBottom: "1px solid rgba(245,240,232,0.06)", background: "#111009", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>

        {/* LEFT: page title */}
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.3 }}>{pageInfo.title}</h1>
          {pageInfo.sub && <p style={{ fontSize: 11, color: "#4a4540", margin: 0 }}>{pageInfo.sub}</p>}
        </div>

        {/* RIGHT: restaurant badge + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          {/* Restaurant pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(245,240,232,0.03)", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 100 }}>
            <div className="tb-avatar" style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#c9a84c" }}>{initials}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#c8bfb0", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurantName}</span>
          </div>

          {/* Logout */}
          <button className="tb-logout" onClick={() => setShowLogoutConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 10, color: "#8a8070", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </header>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}>
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 360, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", animation: "fadeDown 0.25s cubic-bezier(0.16,1,0.3,1)", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }} />
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="20" height="20" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#f5f0e8", margin: "0 0 8px" }}>Sign Out?</h3>
              <p style={{ fontSize: 13, color: "#8a8070", margin: 0 }}>You'll need to log in again to access the dashboard.</p>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 28px 28px" }}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={handleLogout}
                style={{ flex: 1, padding: "11px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}