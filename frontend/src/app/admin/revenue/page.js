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

export default function RevenuePage() {
  const [today, setToday] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().slice(0, 10);
        const data = await apiFetch(`/api/admin/revenue/daily?date=${todayStr}`);
        setToday(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: 16, background: "#0b0b0b", minHeight: "100vh", color: "#eaeaea" }}>
      <h2 style={{ marginBottom: 16 }}>Revenue Summary</h2>

      {err && <div style={{ color: "#ff9e9e" }}>{err}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : !today ? (
        <div>No data</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <Card title="Today's Revenue" value={`₹ ${today.totalRevenue}`} />
          <Card title="Bills Generated" value={today.totalBills} />
          <Card title="Average Bill" value={`₹ ${today.averageBill?.toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "#121212",
        border: "1px solid #262626",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: "#a5a5a5" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}
