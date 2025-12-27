"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function fmtDateTime(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
  } catch {
    return "-";
  }
}

export default function BillHistoryPanel({
  tables = [], // from live-by-table
  styles = {}, // { cardStyle, btnStyle, btnOk, btnDanger, smallMuted }
  defaultOpen = true,
}) {
  const { cardStyle, btnStyle, btnOk, btnDanger, smallMuted } = styles;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState(null); // { tableId, count, bills: [] }

  const [expandedBillId, setExpandedBillId] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billErr, setBillErr] = useState("");
  const [billDetails, setBillDetails] = useState(null);

  // simple cache so switching tables back/forth is fast
  const historyCacheRef = useRef(new Map()); // tableId -> history
  const billCacheRef = useRef(new Map()); // billId -> bill

  const tableOptions = useMemo(() => {
    const list = Array.isArray(tables) ? tables : [];
    return list
      .map((t) => ({
        tableId: t?.tableId,
        tableCode: t?.tableCode,
      }))
      .filter((x) => x.tableId);
  }, [tables]);

  // Pick first table by default (only once, when tables arrive)
  useEffect(() => {
    if (selectedTableId) return;
    if (tableOptions.length > 0) {
      setSelectedTableId(String(tableOptions[0].tableId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableOptions]);

  const loadHistory = async (tableId) => {
    if (!tableId) return;
    setErr("");
    setLoading(true);
    setExpandedBillId(null);
    setBillDetails(null);
    setBillErr("");

    try {
      const cached = historyCacheRef.current.get(tableId);
      if (cached) {
        setHistory(cached);
        return;
      }

      const data = await apiFetch(`/api/admin/billing/table/${tableId}/history`);
      historyCacheRef.current.set(tableId, data);
      setHistory(data);
    } catch (e) {
      setErr(e.message || "Failed to load bill history");
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  // auto-load when panel opens or table changes
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedTableId) return;
    loadHistory(selectedTableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedTableId]);

  const loadBillById = async (billId) => {
    if (!billId) return;
    setBillErr("");
    setBillLoading(true);

    try {
      const cached = billCacheRef.current.get(billId);
      if (cached) {
        setBillDetails(cached);
        return;
      }

      const data = await apiFetch(`/api/admin/billing/bill/${billId}`);
      billCacheRef.current.set(billId, data);
      setBillDetails(data);
    } catch (e) {
      setBillErr(e.message || "Failed to load bill");
      setBillDetails(null);
    } finally {
      setBillLoading(false);
    }
  };

  const currentTableCode =
    tableOptions.find((x) => String(x.tableId) === String(selectedTableId))?.tableCode || "-";

  return (
    <div style={{ ...cardStyle, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>
          Bill History{" "}
          <span style={{ color: "#a5a5a5", fontWeight: 600 }}>
            (Table: {currentTableCode})
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={btnStyle}
            onClick={() => setIsOpen((v) => !v)}
            title="Show/Hide"
          >
            {isOpen ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {!isOpen ? null : (
        <>
          <div style={{ height: 10 }} />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              style={{
                background: "#0f0f0f",
                border: "1px solid #2a2a2a",
                color: "#eaeaea",
                padding: "8px 10px",
                borderRadius: 10,
                outline: "none",
                minWidth: 220,
              }}
            >
              {tableOptions.length === 0 ? (
                <option value="">No tables</option>
              ) : (
                tableOptions.map((t) => (
                  <option key={t.tableId} value={String(t.tableId)}>
                    {t.tableCode}
                  </option>
                ))
              )}
            </select>

            <button
              style={btnStyle}
              onClick={() => loadHistory(selectedTableId)}
              disabled={loading || !selectedTableId}
            >
              {loading ? "Loading..." : "Reload History"}
            </button>

            {history ? (
              <div style={smallMuted}>
                Bills: <b style={{ color: "#fff" }}>{history?.count ?? 0}</b>
              </div>
            ) : null}
          </div>

          {err ? (
            <div
              style={{
                ...cardStyle,
                borderColor: "#3a0f0f",
                background: "#160707",
                color: "#ffb3b3",
                marginTop: 12,
              }}
            >
              {err}
            </div>
          ) : null}

          <div style={{ height: 12 }} />

          {!selectedTableId ? (
            <div style={smallMuted}>Select a table to view bill history.</div>
          ) : loading ? (
            <div style={smallMuted}>Loading bill history...</div>
          ) : !history || !Array.isArray(history.bills) || history.bills.length === 0 ? (
            <div style={smallMuted}>No bills found for this table.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {history.bills.slice(0, 20).map((b) => {
                const billId = String(b?._id || "");
                const isExpanded = expandedBillId === billId;

                return (
                  <div
                    key={billId}
                    style={{
                      border: "1px solid #262626",
                      borderRadius: 12,
                      padding: 12,
                      background: "#0f0f0f",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>
                        Bill #{billId.slice(-6)}
                      </div>
                      <div style={smallMuted}>{fmtDateTime(b.closedAt)}</div>

                      <div style={{ marginLeft: "auto", fontWeight: 900 }}>
                        {formatMoney(b.grandTotal ?? b.subtotal ?? 0)}
                      </div>

                      <button
                        style={btnStyle}
                        onClick={async () => {
                          if (isExpanded) {
                            setExpandedBillId(null);
                            setBillDetails(null);
                            setBillErr("");
                            return;
                          }
                          setExpandedBillId(billId);
                          setBillDetails(null);
                          setBillErr("");
                          await loadBillById(billId);
                        }}
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </div>

                    {!isExpanded ? null : (
                      <div style={{ marginTop: 10 }}>
                        {billErr ? (
                          <div style={{ ...smallMuted, color: "#ffb3b3" }}>{billErr}</div>
                        ) : billLoading && !billDetails ? (
                          <div style={smallMuted}>Loading bill...</div>
                        ) : !billDetails ? null : (
                          <>
                            <div style={{ ...smallMuted, marginBottom: 8 }}>
                              Orders:{" "}
                              <b style={{ color: "#fff" }}>
                                {Array.isArray(billDetails.orderIds)
                                  ? billDetails.orderIds.length
                                  : 0}
                              </b>
                              {"  "} | {"  "}
                              Subtotal:{" "}
                              <b style={{ color: "#fff" }}>
                                {formatMoney(billDetails.subtotal)}
                              </b>
                              {"  "} | {"  "}
                              Tax:{" "}
                              <b style={{ color: "#fff" }}>
                                {formatMoney(billDetails.taxAmount)}
                              </b>
                              {"  "} | {"  "}
                              Grand:{" "}
                              <b style={{ color: "#fff" }}>
                                {formatMoney(billDetails.grandTotal)}
                              </b>
                            </div>

                            <div style={{ display: "grid", gap: 8 }}>
                              {(billDetails.items || []).map((it, idx) => (
                                <div
                                  key={idx}
                                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ color: "#eaeaea", fontSize: 13, fontWeight: 700 }}>
                                      {it.name}
                                    </div>
                                    <div style={smallMuted}>
                                      {formatMoney(it.price)} x {it.quantity}
                                    </div>
                                  </div>
                                  <div style={{ fontWeight: 900 }}>
                                    {formatMoney(it.lineTotal ?? Number(it.price) * Number(it.quantity))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 6 }} />
          <div style={smallMuted}>
            Tip: This shows bill history per table (using your existing endpoint). If you want “all tables
            combined”, we’ll add a single backend endpoint next.
          </div>
        </>
      )}
    </div>
  );
}
