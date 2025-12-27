"use client";

import { useEffect, useMemo, useState } from "react";
import BillingHistoryModal from "./BillingHistoryModal";

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

export default function BillingModal({
  open,
  onClose,
  tableId,
  tableCode,
  onClosed, // callback after closing bill (to refresh parent list)
  styles = {}, // pass styles from parent to keep UI consistent
}) {
  const { cardStyle, btnStyle, btnOk, btnDanger, smallMuted } = styles;

  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState("");
  const [billData, setBillData] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  const canRender = open && tableId;

  const loadOpenBill = async () => {
    if (!tableId) return;
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/billing/table/${tableId}`);
      setBillData(data);
    } catch (e) {
      setErr(e.message || "Failed to load bill");
      setBillData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRender) return;
    loadOpenBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, tableId]);

  const mergedItems = useMemo(() => {
    const orders = billData?.orders || [];
    const map = new Map();

    for (const o of orders) {
      const items = o?.items || o?.orderItems || [];
      for (const it of items) {
        const key = `${it.itemId || it._id || it.name}::${Number(it.price)}`;
        const prev = map.get(key);
        const qty = Number(it.quantity || 0);

        if (!prev) {
          map.set(key, {
            name: it.name,
            price: Number(it.price || 0),
            quantity: qty,
          });
        } else {
          prev.quantity += qty;
        }
      }
    }

    const list = Array.from(map.values()).map((x) => ({
      ...x,
      lineTotal: Number(x.price) * Number(x.quantity),
    }));

    return list;
  }, [billData]);

  const subtotal = useMemo(() => {
    return mergedItems.reduce((sum, x) => sum + Number(x.lineTotal || 0), 0);
  }, [mergedItems]);

  const closeBill = async () => {
    if (!tableId) return;
    setErr("");
    setClosing(true);
    try {
      const result = await apiFetch(`/api/admin/billing/table/${tableId}/close`, {
        method: "POST",
      });

      // success
      if (onClosed) onClosed(result);
      onClose?.();
    } catch (e) {
      setErr(e.message || "Failed to close bill");
    } finally {
      setClosing(false);
    }
  };

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
        zIndex: 9999,
      }}
      onClick={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "min(820px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          ...cardStyle,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            Billing — Table: <span style={{ color: "#fff" }}>{tableCode || "-"}</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button style={btnStyle} onClick={() => setHistoryOpen(true)} disabled={closing}>
              History
            </button>
            <button style={btnStyle} onClick={loadOpenBill} disabled={loading || closing}>
              Reload
            </button>
            <button style={btnDanger} onClick={onClose} disabled={closing}>
              Close
            </button>
          </div>
        </div>

        <div style={{ height: 10 }} />

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
          <div style={cardStyle}>Loading bill...</div>
        ) : !billData ? (
          <div style={cardStyle}>No bill data.</div>
        ) : (
          <>
            <div style={{ ...smallMuted, marginBottom: 10 }}>
              Open Orders: <b style={{ color: "#fff" }}>{billData?.orders?.length || 0}</b>
              {"  "} | {"  "}
              Open Total (server):{" "}
              <b style={{ color: "#fff" }}>{formatMoney(billData?.totalAmount)}</b>
            </div>

            <div
              style={{
                border: "1px solid #262626",
                borderRadius: 12,
                padding: 12,
                background: "#0f0f0f",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                Items Summary
              </div>

              {mergedItems.length === 0 ? (
                <div style={smallMuted}>No items.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {mergedItems.map((it, idx) => (
                    <div
                      key={idx}
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#eaeaea", fontSize: 13, fontWeight: 700 }}>
                          {it.name}
                        </div>
                        <div style={smallMuted}>
                          {formatMoney(it.price)} x {it.quantity}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800 }}>{formatMoney(it.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 12 }} />
              <div
                style={{
                  borderTop: "1px solid #262626",
                  paddingTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, ...smallMuted }}>Subtotal</div>
                <div style={{ fontWeight: 900 }}>{formatMoney(subtotal)}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, ...smallMuted }}>Tax</div>
                <div style={{ fontWeight: 900 }}>{formatMoney(0)}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, fontWeight: 900 }}>Grand Total</div>
                <div style={{ fontWeight: 900 }}>{formatMoney(subtotal)}</div>
              </div>

              <div style={{ height: 12 }} />

              <button
                style={btnOk}
                onClick={closeBill}
                disabled={closing || mergedItems.length === 0}
                title="Closes the bill and marks orders as billed/completed"
              >
                {closing ? "Closing..." : "Close Bill"}
              </button>

              <div style={{ marginTop: 8, ...smallMuted }}>
                Closing will mark open orders as <b>COMPLETED</b> and set <b>billed=true</b>.
              </div>
            </div>
          </>
        )}
        <BillingHistoryModal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            tableId={tableId}
            tableCode={tableCode}
            styles={styles}
        />
      </div>
    </div>
  );
}
