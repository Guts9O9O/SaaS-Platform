"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

function InputField({ label, type = "text", placeholder, value, onChange, hint }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const inputType = type === "password" ? (showPwd ? "text" : "password") : type;
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>{label}{hint && <span style={{ color: "#4a4540", fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: 6 }}>{hint}</span>}</label>}
      <div style={{ position: "relative" }}>
        <input type={inputType} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", padding: type === "password" ? "12px 42px 12px 14px" : "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : "rgba(245,240,232,0.08)"}`, borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
        {type === "password" && (
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8a8070", display: "flex", alignItems: "center", padding: 0 }}>
            {showPwd
              ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
              : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminWaitersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => setMounted(true), []);

  const fetchWaiters = async () => {
    const token = getAdminToken();
    if (!token) return router.push("/admin/login");
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load waiters");
      setWaiters(Array.isArray(data.waiters) ? data.waiters : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (mounted) fetchWaiters(); }, [mounted]);

  const createWaiter = async () => {
    if (!name || !phone || !password) return;
    const token = getAdminToken();
    try {
      setCreating(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone: phone.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create waiter");
      setName(""); setPhone(""); setPassword(""); setShowCreate(false);
      fetchWaiters();
    } catch (e) { alert(e.message); } finally { setCreating(false); }
  };

  const openEdit = (w) => { setEditingWaiter(w); setEditName(w.name || ""); setEditPhone(w.phone || ""); setEditPassword(""); };

  const saveEdit = async () => {
    if (!editName || !editPhone) return;
    const token = getAdminToken();
    try {
      setSaving(true);
      const body = { name: editName, phone: editPhone.trim() };
      if (editPassword.trim()) body.password = editPassword.trim();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters/${editingWaiter._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update waiter");
      setEditingWaiter(null); fetchWaiters();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const deleteWaiter = async (id) => {
    if (!confirm("Delete this waiter? This cannot be undone.")) return;
    const token = getAdminToken();
    try {
      setDeletingId(id);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      fetchWaiters();
    } catch (e) { alert(e.message); } finally { setDeletingId(null); }
  };

  if (!mounted) return null;

  const initials = (n) => n?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarColor = (n) => { const colors = ["#c9a84c","#10b981","#818cf8","#f472b6","#38bdf8"]; return colors[(n?.charCodeAt(0) || 0) % colors.length]; };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .wt-row { transition: background 0.15s; }
        .wt-row:hover { background: rgba(245,240,232,0.02) !important; }
        .wt-btn { transition: all 0.2s; font-family: inherit; }
        .wt-btn:hover { transform: translateY(-1px); opacity: 0.9; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "28px 24px", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Admin</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#f5f0e8", margin: 0, letterSpacing: -0.5 }}>Waiters & Staff</h1>
              <p style={{ color: "#8a8070", fontSize: 13, margin: "6px 0 0", fontWeight: 300 }}>Create and manage waiter login accounts</p>
            </div>
            <button className="wt-btn" onClick={() => setShowCreate(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Waiter
            </button>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 20 }} />
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Staff", value: waiters.length, icon: "👥" },
          ].map(s => (
            <div key={s.label} style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#c9a84c", margin: 0, fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ERROR */}
        {error && <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

        {/* LOADING */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a8070", padding: "60px 0", justifyContent: "center" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading waiters...
          </div>
        ) : waiters.length === 0 ? (
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
            <p style={{ color: "#f5f0e8", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No waiters yet</p>
            <p style={{ color: "#8a8070", fontSize: 13, marginBottom: 24 }}>Add your first waiter to assign them to tables</p>
            <button className="wt-btn" onClick={() => setShowCreate(true)}
              style={{ padding: "10px 24px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Add First Waiter
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {waiters.map((w, i) => (
              <div key={w._id} className="wt-row" style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}>

                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${avatarColor(w.name)}18`, border: `1px solid ${avatarColor(w.name)}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: avatarColor(w.name) }}>{initials(w.name)}</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>{w.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: "#8a8070", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {w.phone}
                    </span>
                    <span style={{ fontSize: 12, color: "#4a4540", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Joined {new Date(w.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>Active</span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="wt-btn" onClick={() => openEdit(w)}
                    style={{ padding: "7px 16px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, color: "#c9a84c", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button className="wt-btn" onClick={() => deleteWaiter(w._id)} disabled={deletingId === w._id}
                    style={{ padding: "7px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#f87171", fontSize: 13, cursor: "pointer", opacity: deletingId === w._id ? 0.5 : 1 }}>
                    {deletingId === w._id ? "..." : <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowCreate(false); setName(""); setPhone(""); setPassword(""); } }}>
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 440, overflow: "hidden", animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding: "28px 28px 8px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#f5f0e8", margin: "0 0 4px" }}>Add New Waiter</h2>
              <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Create a login account for your staff member</p>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <InputField label="Full Name" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} />
              <InputField label="Phone Number" type="tel" placeholder="10-digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} />
              <InputField label="Password" type="password" placeholder="Set a login password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 28px 28px" }}>
              <button className="wt-btn" onClick={() => { setShowCreate(false); setName(""); setPhone(""); setPassword(""); }}
                style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button className="wt-btn" onClick={createWaiter} disabled={creating || !name || !phone || !password}
                style={{ flex: 1, padding: "12px", background: name && phone && password ? "#c9a84c" : "rgba(201,168,76,0.2)", border: "none", borderRadius: 12, color: name && phone && password ? "#0e0e0e" : "#8a8070", fontSize: 14, fontWeight: 700, cursor: name && phone && password ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                {creating ? "Creating..." : "Create Waiter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingWaiter && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setEditingWaiter(null); }}>
          <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 440, overflow: "hidden", animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding: "28px 28px 8px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#f5f0e8", margin: "0 0 4px" }}>Edit Waiter</h2>
              <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Update details for <span style={{ color: "#c9a84c" }}>{editingWaiter.name}</span></p>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <InputField label="Full Name" placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} />
              <InputField label="Phone Number" type="tel" placeholder="Phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              <InputField label="New Password" type="password" placeholder="Leave blank to keep current" value={editPassword} onChange={e => setEditPassword(e.target.value)} hint="(optional)" />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 28px 28px" }}>
              <button className="wt-btn" onClick={() => setEditingWaiter(null)}
                style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button className="wt-btn" onClick={saveEdit} disabled={saving || !editName || !editPhone}
                style={{ flex: 1, padding: "12px", background: "#c9a84c", border: "none", borderRadius: 12, color: "#0e0e0e", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}