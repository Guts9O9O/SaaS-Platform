"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

async function apiFetch(path, signal) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to fetch revenue");
  return data;
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2);
}

export default function RevenueSummaryPanel({ styles = {}, refreshKey = 0 }) {
  const { cardStyle, btnStyle, smallMuted } = styles;

  const [range, setRange] = useState("today");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);

  const abortRef = useRef(null);

  useEffect(() => {
    if (!API_BASE) {
      setErr("NEXT_PUBLIC_API_URL is missing");
      return;
    }

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await apiFetch(`/api/admin/revenue/summary?range=${range}`, controller.signal);
        setSummary(data);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setErr(e.message || "Failed to load revenue");
          setSummary(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [range, refreshKey]);

  const avg = summary?.averageBillValue ?? summary?.averageBill ?? 0;

  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Revenue Summary</div>

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
                opacity: range === r.key ? 1 : 0.6,
                borderColor: range === r.key ? "#3a3a3a" : "#2a2a2a",
              }}
              onClick={() => setRange(r.key)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 10 }} />

      {err ? (
        <div style={{ color: "#ffb3b3" }}>{err}</div>
      ) : loading ? (
        <div style={smallMuted}>Loading revenue...</div>
      ) : !summary ? (
        <div style={smallMuted}>No revenue data</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div>
            <div style={smallMuted}>Total Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₹ {formatMoney(summary.totalRevenue)}</div>
          </div>

          <div>
            <div style={smallMuted}>Total Bills</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{summary.totalBills || 0}</div>
          </div>

          <div>
            <div style={smallMuted}>Avg Bill Value</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₹ {formatMoney(avg)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
