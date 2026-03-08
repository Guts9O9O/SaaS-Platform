"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BillHistoryPanel from "../../components/BillHistoryPanel";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}
const cardStyle  = { background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" };
const btnStyle   = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", color: "#c8bfb0", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" };
const btnOk      = { ...btnStyle, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" };
const btnDanger  = { ...btnStyle, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" };
const smallMuted = { color: "#8a8070", fontSize: 12 };
export default function BillHistoryPage() {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = getToken();
    if (!t) { router.push("/admin/login"); return; }
    fetch(`${API_BASE}/api/admin/orders/live-by-table`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(data => setTables(Array.isArray(data?.tables) ? data.tables : []))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "24px 20px", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Dashboard</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.5 }}>Bill History</h1>
          <p style={{ fontSize: 13, color: "#8a8070", marginTop: 6 }}>View closed bills and payment records per table</p>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginBottom: 24 }} />
        {loading ? (
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, color: "#8a8070" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading tables...
          </div>
        ) : (
          <BillHistoryPanel
            tables={tables}
            defaultOpen={true}
            styles={{ cardStyle, btnStyle, btnOk, btnDanger, smallMuted }}
          />
        )}
      </div>
    </>
  );
}