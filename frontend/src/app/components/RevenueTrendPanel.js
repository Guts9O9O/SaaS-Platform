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

function formatDateDMY(dateStr) {
  if (!dateStr) return "-";

  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RevenueTrendPanel({
  range = "7d",
  styles = {},
  title = "Daily Sales Summary",
  subtitle = "Bills and sales for each day",
}) {
  const { cardStyle, smallMuted } = styles;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await apiFetch(`/api/admin/revenue/trend?range=${range}`);
        setData(Array.isArray(res?.daily) ? res.daily : []);
      } catch (e) {
        setErr(e.message || "Failed to load trend");
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
          {title}
        </div>
        <div style={smallMuted}>{subtitle}</div>
      </div>

      {err ? (
        <div style={{ color: "#ffb3b3" }}>{err}</div>
      ) : loading ? (
        <div style={smallMuted}>Loading sales summary...</div>
      ) : data.length === 0 ? (
        <div style={smallMuted}>No sales data</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 120px 1fr",
              gap: 12,
              padding: "0 4px 10px 4px",
              borderBottom: "1px solid #262626",
              fontSize: 12,
              fontWeight: 700,
              color: "#8a8070",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <div>Date</div>
            <div style={{ textAlign: "center" }}>Bills</div>
            <div style={{ textAlign: "right" }}>Sales</div>
          </div>

          {data.map((d) => (
            <div
              key={d.date}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 120px 1fr",
                gap: 12,
                alignItems: "center",
                padding: "10px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div style={smallMuted}>{formatDateDMY(d.date)}</div>

              <div
                style={{
                  textAlign: "center",
                  color: "#f5f0e8",
                  fontWeight: 600,
                }}
              >
                {Number(d?.bills || 0)}
              </div>

              <div
                style={{
                  textAlign: "right",
                  color: "#f5f0e8",
                  fontWeight: 500,
                }}
              >
                ₹ {formatMoney(d?.revenue || 0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}