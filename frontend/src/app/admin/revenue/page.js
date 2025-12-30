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
  return Number(n || 0).toFixed(2);
}

export default function RevenuePage() {
  const [range, setRange] = useState("today"); // today | 7d | 30d
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  const smallMuted = { color: "#a5a5a5", fontSize: 12 };

  useEffect(() => {
    const load = async () => {
      try {
        setErr("");
        setLoading(true);
        const s = await apiFetch(`/api/admin/revenue/summary?range=${range}`);
        setSummary(s);
      } catch (e) {
        setErr(e.message || "Failed to load revenue");
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [range]);

  const avg = summary?.averageBillValue ?? summary?.averageBill ?? 0;

  return (
    <div style={{ padding: 16, background: "#0b0b0b", minHeight: "100vh", color: "#eaeaea" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Revenue Analytics</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[
            { key: "today", label: "Today" },
            { key: "7d", label: "7 Days" },
            { key: "30d", label: "30 Days" },
          ].map((r) => (
            <button
              key={r.key}
              style={{
                ...btnStyle,
                opacity: range === r.key ? 1 : 0.65,
                borderColor: range === r.key ? "#3a3a3a" : "#2a2a2a",
              }}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {err ? (
        <div style={{ ...cardStyle, borderColor: "#3a0f0f", background: "#160707", color: "#ffb3b3", marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : !summary ? (
        <div style={cardStyle}>No data</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div>
                <div style={smallMuted}>Total Revenue</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>₹ {formatMoney(summary.totalRevenue)}</div>
              </div>
              <div>
                <div style={smallMuted}>Total Bills</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{summary.totalBills || 0}</div>
              </div>
              <div>
                <div style={smallMuted}>Avg Bill Value</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>₹ {formatMoney(avg)}</div>
              </div>
            </div>
          </div>

          {/* Trend + Top Items */}
          <RevenueTrendPanel range={range} styles={{ cardStyle, smallMuted }} />
          <div style={{ height: 12 }} />
          <TopItemsPanel range={range} styles={{ cardStyle, smallMuted }} />
        </>
      )}
    </div>
  );
}
