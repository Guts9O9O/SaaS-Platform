"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL;
const navItems = [
  { label: "Live Orders", href: "/admin/live-orders", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  )},
  { label: "Tables", href: "/admin/tables", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
  )},
  { label: "Waiters", href: "/admin/waiters", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { label: "Menu", href: "/admin/menu", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  )},
  { label: "Revenue", href: "/admin/revenue", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  )},
  { label: "Customers", href: "/admin/customers", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  )},
  { label: "Bill History", href: "/admin/bill-history", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )},
  { label: "Settings", href: "/admin/settings", icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];
export default function AdminSidebar() {
  const pathname = usePathname();
  const [restaurant, setRestaurant] = useState(null);
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    if (!token) return;
    fetch(`${API}/api/admin/restaurant`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRestaurant(data.restaurant || data); })
      .catch(() => {});
  }, []);
  const logoUrl = restaurant?.logoUrl
    ? (restaurant.logoUrl.startsWith("http") ? restaurant.logoUrl : `${API}${restaurant.logoUrl}`)
    : null;
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .sb-link { text-decoration: none; display: block; }
        .sb-item { transition: all 0.18s; }
        .sb-item:hover { background: rgba(245,240,232,0.05) !important; color: #f5f0e8 !important; }
        .sb-item:hover .sb-icon { color: #c9a84c !important; }
      `}</style>
      <aside style={{ width: 240, background: "#111009", borderRight: "1px solid rgba(245,240,232,0.06)", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
        {/* BRAND */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(245,240,232,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: restaurant ? 14 : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" fill="none" stroke="#c9a84c" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.3 }}>DineFlow</p>
              <p style={{ fontSize: 10, color: "#c9a84c", margin: 0, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Admin</p>
            </div>
          </div>
          {restaurant && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoUrl
                  ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{restaurant.name?.charAt(0)?.toUpperCase() || "R"}</span>
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#f5f0e8", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{restaurant.name}</p>
                <p style={{ fontSize: 10, color: "#8a8070", margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>{restaurant.plan || "FREE"}</p>
              </div>
            </div>
          )}
        </div>
        {/* NAV */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#4a4540", fontWeight: 600, padding: "0 8px", marginBottom: 6 }}>Navigation</p>
          {navItems.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="sb-link" style={{ animation: `fadeIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}>
                <div className="sb-item" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, background: isActive ? "rgba(201,168,76,0.1)" : "transparent", border: `1px solid ${isActive ? "rgba(201,168,76,0.2)" : "transparent"}`, color: isActive ? "#f5f0e8" : "#8a8070", fontWeight: isActive ? 600 : 400, fontSize: 13 }}>
                  <span className="sb-icon" style={{ color: isActive ? "#c9a84c" : "currentColor", flexShrink: 0, transition: "color 0.18s" }}>{item.icon}</span>
                  {item.label}
                  {isActive && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#c9a84c" }} />}
                </div>
              </Link>
            );
          })}
        </nav>
        {/* FOOTER */}
        <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(245,240,232,0.06)" }}>
          <div style={{ padding: "10px 12px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 11 }}>
            <p style={{ fontSize: 10, color: "#c9a84c", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, margin: "0 0 2px" }}>DineFlow</p>
            <p style={{ fontSize: 11, color: "#4a4540", margin: 0 }}>Restaurant Management</p>
          </div>
        </div>
      </aside>
    </>
  );
}