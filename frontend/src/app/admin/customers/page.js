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

export default function CustomersAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
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
        const d = await apiFetch(`/api/admin/analytics/customers?days=${days}`);
        setData(d);
      } catch (e) {
        setErr(e.message || "Failed to load customers analytics");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [days]);

  const overview = data?.overview;

  return (
    <div style={{ padding: 16, background: "#0b0b0b", minHeight: "100vh", color: "#eaeaea" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Customer Analytics</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              style={{
                ...btnStyle,
                opacity: days === d ? 1 : 0.65,
                borderColor: days === d ? "#3a3a3a" : "#2a2a2a",
              }}
              onClick={() => setDays(d)}
            >
              Last {d} days
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
      ) : !data ? (
        <div style={cardStyle}>No data</div>
      ) : (
        <>
          {/* Overview */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              <div>
                <div style={smallMuted}>Unique Customers</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{overview?.totalCustomers || 0}</div>
              </div>
              <div>
                <div style={smallMuted}>Repeat Customers</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{overview?.repeatCustomers || 0}</div>
              </div>
              <div>
                <div style={smallMuted}>Repeat Rate</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{overview?.repeatRate || 0}%</div>
              </div>
              <div>
                <div style={smallMuted}>Avg Spend / Customer</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>₹ {formatMoney(overview?.avgSpendPerCustomer)}</div>
              </div>
              <div>
                <div style={smallMuted}>Avg Orders / Customer</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{overview?.avgOrdersPerCustomer || 0}</div>
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
              Top Customers (by spend)
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#a5a5a5", fontSize: 12 }}>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Customer</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Phone</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Orders</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Spent</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Fav Item</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topCustomers || []).map((c) => (
                    <tr key={c.key} style={{ borderBottom: "1px solid #1f1f1f" }}>
                      <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 700 }}>
                        {c.name || "Guest"}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>{c.phone || "-"}</td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>{c.totalOrders || 0}</td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>₹ {formatMoney(c.totalSpent)}</td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>{c.favoriteItem || "-"}</td>
                      <td style={{ padding: "10px 8px", color: "#a5a5a5" }}>
                        {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {(data.topCustomers || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 12, color: "#a5a5a5" }}>
                        No customers found
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Items by customers */}
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
              Popular Items (by customers)
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#a5a5a5", fontSize: 12 }}>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Item</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Total Qty</th>
                    <th style={{ padding: "10px 8px", borderBottom: "1px solid #262626" }}>Unique Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topItems || []).map((it) => (
                    <tr key={it.name} style={{ borderBottom: "1px solid #1f1f1f" }}>
                      <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 700 }}>{it.name}</td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>{it.totalQuantity || 0}</td>
                      <td style={{ padding: "10px 8px", color: "#cfcfcf" }}>{it.uniqueCustomers || 0}</td>
                    </tr>
                  ))}
                  {(data.topItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, color: "#a5a5a5" }}>
                        No items found
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
