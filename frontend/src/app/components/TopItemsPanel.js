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

export default function TopItemsPanel({
  range = "7d",
  styles = {},
  limit = 10,
  title = "Bestselling Item",
}) {
  const { cardStyle, smallMuted } = styles;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await apiFetch(
          `/api/admin/revenue/top-items?range=${range}&limit=${limit}`
        );
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setErr(e.message || "Failed to load top items");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range, limit]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const qtyDiff = Number(b?.quantity || 0) - Number(a?.quantity || 0);
      if (qtyDiff !== 0) return qtyDiff;

      return Number(b?.revenue || 0) - Number(a?.revenue || 0);
    });
  }, [items]);

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
        {title}
      </div>

      {err ? (
        <div style={{ color: "#ffb3b3" }}>{err}</div>
      ) : loading ? (
        <div style={smallMuted}>Loading bestselling items...</div>
      ) : sortedItems.length === 0 ? (
        <div style={smallMuted}>No items</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {sortedItems.map((it, index) => (
            <div
              key={String(it.itemId ?? `${it.name}-${index}`)}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 90px 130px",
                gap: 10,
                padding: "10px 10px",
                border: "1px solid #262626",
                borderRadius: 12,
                background: "#0f0f0f",
                alignItems: "center",
              }}
            >
              <div style={{ color: "#c9a84c", fontWeight: 700 }}>
                #{index + 1}
              </div>

              <div style={{ color: "#eaeaea" }}>{it.name}</div>

              <div style={{ textAlign: "right", color: "#f5f0e8" }}>
                x{it.quantity || 0}
              </div>

              <div style={{ textAlign: "right", color: "#f5f0e8" }}>
                ₹ {formatMoney(it.revenue)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}