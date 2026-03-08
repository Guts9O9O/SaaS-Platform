"use client";
import { useEffect, useState } from "react";
import RevenueTrendPanel from "../../components/RevenueTrendPanel";
import TopItemsPanel from "../../components/TopItemsPanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

async function apiFetch(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "API error");
  return data;
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  });
}

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

export default function RevenuePage() {
  const [range, setRange] = useState("today");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const s = await apiFetch(`/api/admin/revenue/summary?range=${range}`);
        setSummary(s);
      } catch (e) {
        setErr(e.message);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const cardStyle = {
    background: "#161410",
    border: "1px solid rgba(245,240,232,0.07)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  };

  const smallMuted = {
    color: "#8a8070",
    fontSize: 12,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes countUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .rv-range-btn:hover { background: rgba(245,240,232,0.08) !important; color: #f5f0e8 !important; }
        .rv-stat-card { transition: border-color 0.2s, transform 0.2s; }
        .rv-stat-card:hover { border-color: rgba(201,168,76,0.25) !important; transform: translateY(-2px); }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#0e0e0e",
          color: "#f5f0e8",
          padding: "28px 24px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: 28,
            animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "#c9a84c",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Restaurant Admin
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#f5f0e8",
                  margin: 0,
                  letterSpacing: -0.5,
                }}
              >
                Revenue Analytics
              </h1>
              <p
                style={{
                  color: "#8a8070",
                  fontSize: 13,
                  margin: "6px 0 0",
                  fontWeight: 300,
                }}
              >
                Track earnings, bills and top-performing items
              </p>
            </div>

            {/* Range switcher */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                background: "#161410",
                border: "1px solid rgba(245,240,232,0.07)",
                borderRadius: 12,
              }}
            >
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  className="rv-range-btn"
                  onClick={() => setRange(r.key)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: range === r.key ? "#c9a84c" : "transparent",
                    color: range === r.key ? "#0e0e0e" : "#8a8070",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)",
              marginTop: 20,
            }}
          />
        </div>

        {/* ERROR */}
        {err && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12,
              color: "#fca5a5",
              fontSize: 13,
              marginBottom: 20,
              display: "flex",
              gap: 10,
            }}
          >
            <span>⚠</span>
            {err}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#8a8070",
              padding: "60px 0",
              justifyContent: "center",
            }}
          >
            <svg
              style={{ animation: "spin 0.8s linear infinite" }}
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="31.4"
                strokeDashoffset="10"
              />
            </svg>
            Loading revenue data...
          </div>
        ) : !summary ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p style={{ color: "#f5f0e8", fontWeight: 600 }}>No data available</p>
            <p style={{ color: "#8a8070", fontSize: 13 }}>
              Revenue will appear once bills are closed
            </p>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "Total Revenue",
                  value: `₹${formatMoney(summary.totalRevenue)}`,
                  icon: "💰",
                  sub: `for ${RANGES.find((r) => r.key === range)?.label}`,
                  color: "#c9a84c",
                  accent: "rgba(201,168,76,0.15)",
                  border: "rgba(201,168,76,0.2)",
                },
                {
                  label: "Total Bills",
                  value: summary.totalBills || 0,
                  icon: "🧾",
                  sub: "bills closed",
                  color: "#10b981",
                  accent: "rgba(16,185,129,0.1)",
                  border: "rgba(16,185,129,0.2)",
                },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="rv-stat-card"
                  style={{
                    background: "#161410",
                    border: `1px solid ${s.border}`,
                    borderRadius: 16,
                    padding: "20px 22px",
                    animation: `countUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#8a8070",
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </span>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: s.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      {s.icon}
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 28,
                      fontWeight: 700,
                      color: s.color,
                      margin: "0 0 6px",
                      letterSpacing: -0.5,
                    }}
                  >
                    {s.value}
                  </p>
                  <p style={{ fontSize: 12, color: "#4a4540", margin: 0 }}>
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* CHILD PANELS */}
            <RevenueTrendPanel
              range={range}
              title="Daily Sales Summary"
              subtitle="Bills and sales for each day"
              styles={{ cardStyle, smallMuted }}
            />

            <div style={{ height: 16 }} />

            <TopItemsPanel
              range={range}
              title="Bestselling Item"
              styles={{ cardStyle, smallMuted }}
            />
          </>
        )}
      </div>
    </>
  );
}