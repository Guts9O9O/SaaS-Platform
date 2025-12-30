"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function RevenueTrendPanel({ range = "7d", styles = {} }) {
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

  const maxRevenue = useMemo(() => {
    return data.reduce((m, d) => Math.max(m, Number(d?.revenue || 0)), 0);
  }, [data]);

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Revenue Trend</div>

      {err ? (
        <div style={{ color: "#ffb3b3" }}>{err}</div>
      ) : loading ? (
        <div style={smallMuted}>Loading trend...</div>
      ) : data.length === 0 ? (
        <div style={smallMuted}>No trend data</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {data.map((d) => {
            const rev = Number(d?.revenue || 0);
            const pct = maxRevenue ? Math.round((rev / maxRevenue) * 100) : 0;

            return (
              <div key={d.date} style={{ display: "grid", gridTemplateColumns: "110px 1fr 110px", gap: 10, alignItems: "center" }}>
                <div style={smallMuted}>{d.date}</div>

                <div style={{ background: "#0f0f0f", border: "1px solid #262626", borderRadius: 10, height: 14, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%" , background: "#2a2a2a" }} />
                </div>

                <div style={{ textAlign: "right" }}>₹ {formatMoney(rev)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
