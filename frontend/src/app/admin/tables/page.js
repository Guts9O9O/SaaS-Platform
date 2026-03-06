"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

export default function AdminTablesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tables, setTables] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableCode, setTableCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => setMounted(true), []);

  const fetchTables = async () => {
    const token = getAdminToken();
    if (!token) return router.replace("/admin/login");
    try {
      setError(null); setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => []);
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error(data?.message || "Failed to load tables");
      setTables(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const fetchWaiters = async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message);
      setWaiters(Array.isArray(data.waiters) ? data.waiters : []);
    } catch { setWaiters([]); }
  };

  useEffect(() => { if (mounted) { fetchTables(); fetchWaiters(); } }, [mounted]);

  const createTable = async () => {
    if (!tableCode.trim()) return;
    setCreating(true);
    const token = getAdminToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tableCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create table");
      setTableCode(""); setShowCreateModal(false); fetchTables();
    } catch (e) { alert(e.message); } finally { setCreating(false); }
  };

  const deleteTable = async (id) => {
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchTables();
  };

  const toggleStatus = async (table) => {
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${table._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    fetchTables();
  };

  const assignWaiter = async (tableId, waiterIdOrNull) => {
    const token = getAdminToken();
    if (!token) return router.replace("/admin/login");
    setAssigningId(tableId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${tableId}/assign-waiter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ waiterId: waiterIdOrNull || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to assign waiter");
      setTables(prev => prev.map(t => t._id === tableId ? { ...t, assignedWaiterId: data?.table?.assignedWaiterId || null } : t));
    } catch (e) { alert(e.message); } finally { setAssigningId(null); }
  };

  const openQr = async (table) => {
    setQrModal(table); setQrLoading(true); setQrData(null);
    const token = getAdminToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/qr/tables/${table._id}/qr`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    setQrData(data); setQrLoading(false);
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .tp-row { transition: background 0.15s; }
        .tp-row:hover { background: rgba(245,240,232,0.02) !important; }
        .tp-btn { transition: all 0.2s; }
        .tp-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .tp-select { transition: border-color 0.2s; }
        .tp-select:focus { border-color: rgba(201,168,76,0.4) !important; outline: none; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "28px 24px", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Admin</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.5 }}>Table Management</h1>
              <p style={{ color: "#8a8070", fontSize: 13, margin: "6px 0 0", fontWeight: 300 }}>Manage tables, QR codes and waiter assignments</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#d4b460"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#c9a84c"; e.currentTarget.style.transform = "none"; }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Table
            </button>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 20 }} />
        </div>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Tables", value: tables.length, icon: "🪑", color: "#c9a84c" },
            { label: "Active", value: tables.filter(t => t.isActive).length, icon: "✅", color: "#10b981" },
            { label: "Inactive", value: tables.filter(t => !t.isActive).length, icon: "⏸", color: "#8a8070" },
            { label: "Assigned", value: tables.filter(t => t.assignedWaiterId).length, icon: "👤", color: "#818cf8" },
          ].map(s => (
            <div key={s.label} style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0, fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12, color: "#8a8070" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading tables...
          </div>
        ) : error ? (
          <div style={{ padding: "16px 20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, color: "#fca5a5", display: "flex", gap: 10 }}>
            <span>⚠</span>{error}
          </div>
        ) : tables.length === 0 ? (
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🪑</div>
            <p style={{ color: "#f5f0e8", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No tables yet</p>
            <p style={{ color: "#8a8070", fontSize: 13, marginBottom: 24 }}>Create your first table to generate a QR code</p>
            <button onClick={() => setShowCreateModal(true)} style={{ padding: "10px 24px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Create First Table
            </button>
          </div>
        ) : (
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 100px 140px 220px", gap: 16, padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(245,240,232,0.06)" }}>
              {["Table", "Assign Waiter", "Status", "Created", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {tables.map((t, i) => (
              <div key={t._id} className="tp-row" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 100px 140px 220px", gap: 16, padding: "14px 20px", borderBottom: i < tables.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none", alignItems: "center" }}>

                {/* Table name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#c9a84c" }}>{t.tableCode.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "#f5f0e8", fontSize: 14 }}>{t.tableCode}</span>
                </div>

                {/* Waiter assign */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select className="tp-select" value={t.assignedWaiterId || ""} onChange={e => assignWaiter(t._id, e.target.value || null)} disabled={assigningId === t._id}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", color: t.assignedWaiterId ? "#f5f0e8" : "#8a8070", padding: "7px 10px", borderRadius: 10, fontSize: 12, fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
                    <option value="">Unassigned</option>
                    {waiters.map(w => <option key={w._id} value={w._id}>{w.name} ({w.phone || "no phone"})</option>)}
                  </select>
                  {assigningId === t._id && <span style={{ fontSize: 11, color: "#8a8070", whiteSpace: "nowrap" }}>Saving...</span>}
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: t.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${t.isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: t.isActive ? "#10b981" : "#ef4444" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Created */}
                <span style={{ fontSize: 12, color: "#8a8070" }}>{new Date(t.createdAt).toLocaleDateString()}</span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="tp-btn" onClick={() => toggleStatus(t)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: t.isActive ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${t.isActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, color: t.isActive ? "#fca5a5" : "#6ee7b7" }}>
                    {t.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="tp-btn" onClick={() => openQr(t)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
                    QR Code
                  </button>
                  <button className="tp-btn" onClick={() => { if (!confirm("Delete this table?")) return; deleteTable(t._id); }}
                    style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setShowCreateModal(false); setTableCode(""); } }}>
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding: "28px 28px 20px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#f5f0e8", margin: "0 0 6px" }}>Create New Table</h2>
              <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Add a table and generate a QR code for it</p>
            </div>
            <div style={{ padding: "0 28px 24px" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Table Code</label>
              <input value={tableCode} onChange={e => setTableCode(e.target.value)} onKeyDown={e => e.key === "Enter" && createTable()} placeholder="e.g. T1, T2, A1..." autoFocus
                style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(245,240,232,0.08)"} />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "16px 28px 24px" }}>
              <button onClick={() => { setShowCreateModal(false); setTableCode(""); }}
                style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={createTable} disabled={creating || !tableCode.trim()}
                style={{ flex: 1, padding: "12px", background: tableCode.trim() ? "#c9a84c" : "rgba(201,168,76,0.2)", border: "none", borderRadius: 12, color: tableCode.trim() ? "#0e0e0e" : "#8a8070", fontSize: 14, fontWeight: 700, cursor: tableCode.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s" }}>
                {creating ? "Creating..." : "Create Table"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setQrModal(null); setQrData(null); } }}>
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding: "28px 28px 20px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#f5f0e8", margin: "0 0 4px" }}>QR Code</h2>
              <p style={{ color: "#8a8070", fontSize: 13, margin: 0 }}>Table <span style={{ color: "#c9a84c", fontWeight: 600 }}>{qrModal.tableCode}</span></p>
            </div>
            <div style={{ padding: "0 28px 24px", textAlign: "center" }}>
              {qrLoading ? (
                <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#8a8070" }}>
                  <svg style={{ animation: "spin 0.8s linear infinite" }} width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                  Generating QR code...
                </div>
              ) : qrData?.qrDataUrl ? (
                <>
                  <div style={{ background: "#fff", padding: 16, borderRadius: 16, display: "inline-block", marginBottom: 20 }}>
                    <img src={qrData.qrDataUrl} alt="QR Code" style={{ width: 220, height: 220, display: "block" }} />
                  </div>
                  <a href={qrData.qrDataUrl} download={`table-${qrModal.tableCode}.png`}
                    style={{ display: "block", padding: "12px", background: "#c9a84c", color: "#0e0e0e", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", marginBottom: 12 }}>
                    Download QR Code
                  </a>
                  <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.06)", borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: "#8a8070", wordBreak: "break-all", fontFamily: "monospace", margin: 0 }}>{qrData.qrUrl}</p>
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13 }}>
                  Failed to load QR code.
                </div>
              )}
            </div>
            <div style={{ padding: "0 28px 24px" }}>
              <button onClick={() => { setQrModal(null); setQrData(null); }}
                style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}