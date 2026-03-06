"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}
async function apiFetch(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "API error");
  return data;
}
function formatMoney(n) { return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

const DAYS_OPTIONS = [7, 30, 90];

export default function CustomersAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr(""); setLoading(true);
        const d = await apiFetch(`/api/admin/analytics/customers?days=${days}`);
        setData(d);
      } catch (e) { setErr(e.message); setData(null); }
      finally { setLoading(false); }
    })();
  }, [days]);

  const overview = data?.overview;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ca-range-btn:hover { background: rgba(245,240,232,0.08) !important; color: #f5f0e8 !important; }
        .ca-stat:hover { border-color: rgba(201,168,76,0.25) !important; transform: translateY(-2px); }
        .ca-stat { transition: border-color 0.2s, transform 0.2s; }
        .ca-row:hover { background: rgba(245,240,232,0.02) !important; }
        .ca-bar { transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "28px 24px", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Admin</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.5 }}>Customer Analytics</h1>
              <p style={{ color: "#8a8070", fontSize: 13, margin: "6px 0 0", fontWeight: 300 }}>Understand your guests — spending, frequency, favourites</p>
            </div>
            <div style={{ display: "flex", gap: 4, padding: 4, background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 12 }}>
              {DAYS_OPTIONS.map(d => (
                <button key={d} className="ca-range-btn" onClick={() => setDays(d)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s", background: days === d ? "#c9a84c" : "transparent", color: days === d ? "#0e0e0e" : "#8a8070" }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 20 }} />
        </div>

        {err && <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>⚠ {err}</div>}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a8070", padding: "60px 0", justifyContent: "center" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading analytics...
          </div>
        ) : !data ? (
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p style={{ color: "#f5f0e8", fontWeight: 600 }}>No data available</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW STAT CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Unique Customers", value: overview?.totalCustomers || 0, icon: "👥", color: "#c9a84c", accent: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.2)" },
                { label: "Repeat Customers", value: overview?.repeatCustomers || 0, icon: "🔄", color: "#10b981", accent: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
                { label: "Repeat Rate", value: `${overview?.repeatRate || 0}%`, icon: "📊", color: "#818cf8", accent: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.2)" },
                { label: "Avg Spend", value: `₹${formatMoney(overview?.avgSpendPerCustomer)}`, icon: "💰", color: "#f472b6", accent: "rgba(244,114,182,0.1)", border: "rgba(244,114,182,0.2)" },
                { label: "Avg Orders", value: overview?.avgOrdersPerCustomer || 0, icon: "🧾", color: "#38bdf8", accent: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.2)" },
              ].map((s, i) => (
                <div key={s.label} className="ca-stat" style={{ background: "#161410", border: `1px solid ${s.border}`, borderRadius: 16, padding: "18px 20px", animation: `fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{s.label}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                  </div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: s.color, margin: 0, letterSpacing: -0.5 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* TOP CUSTOMERS TABLE */}
            <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏆</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Top Customers</p>
                  <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>Ranked by total spend</p>
                </div>
              </div>

              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 80px 120px 1fr 140px", gap: 12, padding: "10px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(245,240,232,0.05)" }}>
                {["Customer", "Phone", "Orders", "Spent", "Fav Item", "Last Visit"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {(data.topCustomers || []).length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#8a8070", fontSize: 13 }}>No customers found for this period</div>
              ) : (
                (data.topCustomers || []).map((c, i) => (
                  <div key={c.key} className="ca-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 80px 120px 1fr 140px", gap: 12, padding: "14px 20px", borderBottom: i < data.topCustomers.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>
                        {(c.name || "G")[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8" }}>{c.name || "Guest"}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "#8a8070" }}>{c.phone || "—"}</span>
                    <span style={{ fontSize: 13, color: "#c8bfb0", fontWeight: 600 }}>{c.totalOrders || 0}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>₹{formatMoney(c.totalSpent)}</span>
                    <span style={{ fontSize: 12, color: "#8a8070", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.favoriteItem || "—"}</span>
                    <span style={{ fontSize: 11, color: "#4a4540" }}>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}</span>
                  </div>
                ))
              )}
            </div>

            {/* TOP ITEMS TABLE */}
            <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(245,240,232,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>Popular Items</p>
                  <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>By unique customers who ordered</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 160px", gap: 12, padding: "10px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(245,240,232,0.05)" }}>
                {["Item", "Total Qty", "Unique Customers"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {(data.topItems || []).length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#8a8070", fontSize: 13 }}>No items found for this period</div>
              ) : (() => {
                const maxQty = Math.max(...(data.topItems || []).map(it => it.totalQuantity || 0), 1);
                return (data.topItems || []).map((it, i) => (
                  <div key={it.name} className="ca-row" style={{ display: "grid", gridTemplateColumns: "2fr 120px 160px", gap: 12, padding: "14px 20px", borderBottom: i < data.topItems.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: "0 0 5px" }}>{it.name}</p>
                      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden", width: "80%" }}>
                        <div className="ca-bar" style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #c9a84c, #d4b460)", width: `${((it.totalQuantity || 0) / maxQty) * 100}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{it.totalQuantity || 0}</span>
                    <span style={{ fontSize: 13, color: "#8a8070" }}>{it.uniqueCustomers || 0} customers</span>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>
    </>
  );
}