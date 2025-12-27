"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

async function apiFetch(path, opts = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function formatMoney(n) {
  const x = Number(n || 0);
  return x.toFixed(2);
}

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt || "");
  }
}

export default function BillingHistoryModal({
  open,
  onClose,
  tableId,
  tableCode,
  styles = {},
}) {
  const { cardStyle, btnStyle, btnOk, btnDanger, smallMuted } = styles;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [history, setHistory] = useState([]); // bills list
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billErr, setBillErr] = useState("");
  const [bill, setBill] = useState(null);

  const canRender = open && tableId;

  const loadHistory = async () => {
    if (!tableId) return;
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/billing/table/${tableId}/history`);
      setHistory(Array.isArray(data?.bills) ? data.bills : []);
    } catch (e) {
      setErr(e.message || "Failed to load bill history");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBill = async (billId) => {
    if (!billId) return;
    setBillErr("");
    setBillLoading(true);
    try {
      const data = await apiFetch(`/api/admin/billing/bill/${billId}`);
      setBill(data || null);
      setSelectedBillId(billId);
    } catch (e) {
      setBillErr(e.message || "Failed to load bill");
      setBill(null);
      setSelectedBillId(billId);
    } finally {
      setBillLoading(false);
    }
  };

  useEffect(() => {
    if (!canRender) return;
    setSelectedBillId(null);
    setBill(null);
    setBillErr("");
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, tableId]);

  const billItems = useMemo(() => {
    const items = bill?.items || [];
    return Array.isArray(items) ? items : [];
  }, [bill]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 10000, // above BillingModal
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          ...cardStyle,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            Bill History — Table: <span style={{ color: "#fff" }}>{tableCode || "-"}</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button style={btnStyle} onClick={loadHistory} disabled={loading || billLoading}>
              Reload
            </button>
            <button style={btnDanger} onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {err ? (
          <div
            style={{
              ...cardStyle,
              borderColor: "#3a0f0f",
              background: "#160707",
              color: "#ffb3b3",
              marginBottom: 12,
            }}
          >
            {err}
          </div>
        ) : null}

        {loading ? (
          <div style={cardStyle}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={cardStyle}>No bills found for this table.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {/* List */}
            <div
              style={{
                border: "1px solid #262626",
                borderRadius: 12,
                padding: 12,
                background: "#0f0f0f",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                Bills ({history.length})
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {history.map((b) => (
                  <div
                    key={b._id}
                    style={{
                      border: "1px solid #262626",
                      borderRadius: 12,
                      padding: 10,
                      background: selectedBillId === b._id ? "#101010" : "#0b0b0b",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#eaeaea" }}>
                        Bill #{String(b._id).slice(-6)}
                      </div>
                      <div style={smallMuted}>
                        Closed: <span style={{ color: "#eaeaea" }}>{formatDate(b.closedAt)}</span>
                      </div>
                      <div style={smallMuted}>
                        Total:{" "}
                        <b style={{ color: "#fff" }}>{formatMoney(b.grandTotal ?? b.subtotal)}</b>
                      </div>
                    </div>

                    <button
                      style={btnOk}
                      onClick={() => loadBill(b._id)}
                      disabled={billLoading && selectedBillId === b._id}
                    >
                      {billLoading && selectedBillId === b._id ? "Loading..." : "View"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div
              style={{
                border: "1px solid #262626",
                borderRadius: 12,
                padding: 12,
                background: "#0f0f0f",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                Bill Details
              </div>

              {billErr ? (
                <div
                  style={{
                    ...cardStyle,
                    borderColor: "#3a0f0f",
                    background: "#160707",
                    color: "#ffb3b3",
                    marginBottom: 12,
                  }}
                >
                  {billErr}
                </div>
              ) : null}

              {!selectedBillId ? (
                <div style={smallMuted}>Select a bill to view details.</div>
              ) : billLoading ? (
                <div style={smallMuted}>Loading bill...</div>
              ) : !bill ? (
                <div style={smallMuted}>No bill data.</div>
              ) : (
                <>
                  <div style={{ ...smallMuted, marginBottom: 10 }}>
                    Bill ID: <span style={{ color: "#eaeaea" }}>{bill._id}</span>
                  </div>

                  {billItems.length === 0 ? (
                    <div style={smallMuted}>No items.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {billItems.map((it, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#eaeaea", fontSize: 13, fontWeight: 700 }}>
                              {it.name}
                            </div>
                            <div style={smallMuted}>
                              {formatMoney(it.price)} x {Number(it.quantity || 0)}
                            </div>
                          </div>
                          <div style={{ fontWeight: 900 }}>
                            {formatMoney(it.lineTotal ?? Number(it.price) * Number(it.quantity || 0))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ height: 12 }} />
                  <div style={{ borderTop: "1px solid #262626", paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, ...smallMuted }}>Subtotal</div>
                      <div style={{ fontWeight: 900 }}>{formatMoney(bill.subtotal)}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <div style={{ flex: 1, ...smallMuted }}>Tax</div>
                      <div style={{ fontWeight: 900 }}>{formatMoney(bill.taxAmount)}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <div style={{ flex: 1, fontWeight: 900 }}>Grand Total</div>
                      <div style={{ fontWeight: 900 }}>{formatMoney(bill.grandTotal)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
