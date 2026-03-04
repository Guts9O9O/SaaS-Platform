"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

function apiFetch(url, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("superAdminToken") : null;
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

const SECTION = ({ title, children }) => (
  <div style={{ background: "#161410", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 20, overflow: "hidden", marginBottom: 20 }}>
    <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(201,168,76,0.08)", background: "rgba(201,168,76,0.03)" }}>
      <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600 }}>{title}</span>
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(245,240,232,0.05)" }}>
    <span style={{ fontSize: 13, color: "#8a8070", minWidth: 160 }}>{label}</span>
    <span style={{ fontSize: 13, color: "#f5f0e8", fontWeight: 500, textAlign: "right" }}>{children || "—"}</span>
  </div>
);

const Input = ({ label, hint, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#8a8070", marginBottom: 8 }}>{label}</label>
    <input style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "inherit", outline: "none" }}
      onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
      onBlur={e => e.target.style.borderColor = "rgba(245,240,232,0.08)"}
      {...props} />
    {hint && <p style={{ fontSize: 11, color: "#4a4540", marginTop: 4 }}>{hint}</p>}
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#8a8070", marginBottom: 8 }}>{label}</label>
    <select style={{ width: "100%", padding: "12px 16px", background: "#1a1612", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "inherit", outline: "none" }} {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const StatusBadge = ({ value }) => {
  const colors = { ACTIVE: { bg: "rgba(16,185,129,0.1)", color: "#10b981", border: "rgba(16,185,129,0.2)" }, SUSPENDED: { bg: "rgba(239,68,68,0.1)", color: "#f87171", border: "rgba(239,68,68,0.2)" }, TRIAL: { bg: "rgba(234,179,8,0.1)", color: "#eab308", border: "rgba(234,179,8,0.2)" } };
  const s = colors[value] || colors.TRIAL;
  return <span style={{ padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{value}</span>;
};

const PlanBadge = ({ value }) => {
  const colors = { PRO: "#c9a84c", BASIC: "#60a5fa", FREE: "#8a8070" };
  return <span style={{ padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: colors[value] || "#8a8070", border: "1px solid rgba(255,255,255,0.08)" }}>{value}</span>;
};

export default function SuperAdminRestaurantDetailPage() {
  const { restaurantId } = useParams();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [activePanel, setActivePanel] = useState(null); // "details" | "subscription" | "limits" | "password"
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Details form
  const [form, setForm] = useState({ name: "", ownerName: "", ownerEmail: "", contact: "", isActive: true });
  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Subscription form
  const [subForm, setSubForm] = useState({ subscriptionStatus: "TRIAL", plan: "FREE", subscriptionEnd: "" });
  const setSub = (k) => (e) => setSubForm(p => ({ ...p, [k]: e.target.value }));

  // Limits form
  const [limitsForm, setLimitsForm] = useState({ menuItemVideoLimit: 1, restaurantVideoLimit: 2 });
  const setLim = (k) => (e) => setLimitsForm(p => ({ ...p, [k]: e.target.value }));

  // Password form
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const setPw = (k) => (e) => setPwForm(p => ({ ...p, [k]: e.target.value }));

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const fetchDetails = async () => {
    try {
      setLoading(true); setError(null);
      const [rRes, uRes] = await Promise.all([
        apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}`),
        apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}/admin-user`),
      ]);
      const rData = await rRes.json();
      if (!rRes.ok) throw new Error(rData.message || "Failed to load");
      const r = rData.restaurant;
      setRestaurant(r);
      setForm({ name: r.name || "", ownerName: r.ownerName || "", ownerEmail: r.ownerEmail || "", contact: r.contact || "", isActive: r.isActive ?? true });
      setSubForm({ subscriptionStatus: r.subscriptionStatus || "TRIAL", plan: r.plan || "FREE", subscriptionEnd: r.subscriptionEnd ? r.subscriptionEnd.slice(0, 10) : "" });
      setLimitsForm({ menuItemVideoLimit: r.menuItemVideoLimit ?? 1, restaurantVideoLimit: r.restaurantVideoLimit ?? 2 });
      if (uRes.ok) { const uData = await uRes.json(); setAdminUser(uData.user || null); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDetails(); }, [restaurantId]);

  const saveDetails = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}`, {
        method: "PUT",
        body: JSON.stringify({ name: form.name, contact: form.contact, ownerName: form.ownerName, ownerEmail: form.ownerEmail, isActive: form.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRestaurant(data.restaurant);
      setActivePanel(null);
      showSuccess("Restaurant details updated ✓");
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const saveSubscription = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}/subscription`, {
        method: "PUT",
        body: JSON.stringify({ subscriptionStatus: subForm.subscriptionStatus, plan: subForm.plan, subscriptionEnd: subForm.subscriptionEnd || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRestaurant(data.restaurant);
      setActivePanel(null);
      showSuccess("Subscription updated ✓");
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const saveLimits = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}`, {
        method: "PUT",
        body: JSON.stringify({ menuItemVideoLimit: Number(limitsForm.menuItemVideoLimit), restaurantVideoLimit: Number(limitsForm.restaurantVideoLimit) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRestaurant(data.restaurant);
      setActivePanel(null);
      showSuccess("Video limits updated ✓");
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) return alert("Password must be at least 6 characters");
    if (pwForm.newPassword !== pwForm.confirmPassword) return alert("Passwords do not match");
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}/reset-admin-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwForm({ newPassword: "", confirmPassword: "" });
      setActivePanel(null);
      showSuccess("Admin password changed ✓");
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const Btn = ({ onClick, disabled, children, variant = "gold" }) => {
    const styles = {
      gold: { background: "#c9a84c", color: "#0e0e0e" },
      ghost: { background: "rgba(255,255,255,0.04)", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.1)" },
      danger: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
    };
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, border: "none", fontFamily: "inherit", transition: "all 0.2s", ...styles[variant] }}>
        {children}
      </button>
    );
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a8070" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #2a2520", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 14 }}>Loading restaurant...</p>
      </div>
    </div>
  );
  if (error) return <div style={{ color: "#f87171", padding: 24 }}>{error}</div>;
  if (!restaurant) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", color: "#f5f0e8" }}>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button onClick={() => router.push("/super-admin/restaurants")}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", cursor: "pointer", color: "#8a8070", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>{restaurant.name}</h1>
          <p style={{ fontSize: 12, color: "#8a8070", marginTop: 4 }}>/{restaurant.slug}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <StatusBadge value={restaurant.subscriptionStatus} />
          <PlanBadge value={restaurant.plan} />
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div style={{ padding: "12px 20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, color: "#10b981", fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* RESTAURANT DETAILS */}
      <SECTION title="Restaurant Details">
        {activePanel !== "details" ? (
          <>
            <Field label="Name">{restaurant.name}</Field>
            <Field label="Contact">{restaurant.contact}</Field>
            <Field label="Owner Name">{restaurant.ownerName}</Field>
            <Field label="Owner Email">{restaurant.ownerEmail}</Field>
            <Field label="Active Status">
              <span style={{ padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: restaurant.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: restaurant.isActive ? "#10b981" : "#f87171", border: `1px solid ${restaurant.isActive ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                {restaurant.isActive ? "Active" : "Inactive"}
              </span>
            </Field>
            <Field label="Created">{new Date(restaurant.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Field>
            <div style={{ marginTop: 16 }}><Btn onClick={() => setActivePanel("details")}>Edit Details</Btn></div>
          </>
        ) : (
          <>
            <Input label="Restaurant Name" value={form.name} onChange={setF("name")} placeholder="e.g. The Grand Spice" />
            <Input label="Contact" value={form.contact} onChange={setF("contact")} placeholder="Phone or email" />
            <Input label="Owner Name" value={form.ownerName} onChange={setF("ownerName")} placeholder="Owner's full name" />
            <Input label="Owner Email" type="email" value={form.ownerEmail} onChange={setF("ownerEmail")} placeholder="owner@restaurant.com" />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#8a8070" }}>Active</label>
              <input type="checkbox" checked={form.isActive} onChange={setF("isActive")} style={{ width: 18, height: 18, accentColor: "#c9a84c", cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: form.isActive ? "#10b981" : "#f87171" }}>{form.isActive ? "Restaurant is active" : "Restaurant is inactive"}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveDetails} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Btn>
              <Btn variant="ghost" onClick={() => { setActivePanel(null); setForm({ name: restaurant.name || "", ownerName: restaurant.ownerName || "", ownerEmail: restaurant.ownerEmail || "", contact: restaurant.contact || "", isActive: restaurant.isActive ?? true }); }}>Cancel</Btn>
            </div>
          </>
        )}
      </SECTION>

      {/* SUBSCRIPTION */}
      <SECTION title="Subscription & Plan">
        {activePanel !== "subscription" ? (
          <>
            <Field label="Plan"><PlanBadge value={restaurant.plan} /></Field>
            <Field label="Status"><StatusBadge value={restaurant.subscriptionStatus} /></Field>
            <Field label="Subscription End">{restaurant.subscriptionEnd ? new Date(restaurant.subscriptionEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not set"}</Field>
            <div style={{ marginTop: 16 }}><Btn onClick={() => setActivePanel("subscription")}>Edit Subscription</Btn></div>
          </>
        ) : (
          <>
            <Select label="Plan" value={subForm.plan} onChange={setSub("plan")} options={[{ value: "FREE", label: "FREE" }, { value: "BASIC", label: "BASIC" }, { value: "PRO", label: "PRO" }]} />
            <Select label="Subscription Status" value={subForm.subscriptionStatus} onChange={setSub("subscriptionStatus")} options={[{ value: "TRIAL", label: "TRIAL" }, { value: "ACTIVE", label: "ACTIVE" }, { value: "SUSPENDED", label: "SUSPENDED" }]} />
            <Input label="Subscription End Date" type="date" value={subForm.subscriptionEnd} onChange={setSub("subscriptionEnd")} hint="Leave blank for no expiry" />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveSubscription} disabled={saving}>{saving ? "Saving..." : "Save Subscription"}</Btn>
              <Btn variant="ghost" onClick={() => setActivePanel(null)}>Cancel</Btn>
            </div>
          </>
        )}
      </SECTION>

      {/* VIDEO LIMITS */}
      <SECTION title="Video Limits">
        {activePanel !== "limits" ? (
          <>
            <Field label="Per-Item Video Limit">
              <span style={{ color: "#c9a84c", fontWeight: 700 }}>{restaurant.menuItemVideoLimit ?? 1}</span>
              <span style={{ color: "#8a8070" }}> / 10 max</span>
            </Field>
            <Field label="Restaurant Video Limit">
              <span style={{ color: "#c9a84c", fontWeight: 700 }}>{restaurant.restaurantVideoLimit ?? 2}</span>
              <span style={{ color: "#8a8070" }}> / 20 max</span>
            </Field>
            <div style={{ marginTop: 16 }}><Btn onClick={() => setActivePanel("limits")}>Edit Limits</Btn></div>
          </>
        ) : (
          <>
            <Input label="Per-Item Video Limit (0–10)" type="number" min="0" max="10" value={limitsForm.menuItemVideoLimit} onChange={setLim("menuItemVideoLimit")} hint="Max videos the admin can upload per menu item" />
            <Input label="Restaurant Video Limit (0–20)" type="number" min="0" max="20" value={limitsForm.restaurantVideoLimit} onChange={setLim("restaurantVideoLimit")} hint="Total videos allowed across the entire restaurant" />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveLimits} disabled={saving}>{saving ? "Saving..." : "Save Limits"}</Btn>
              <Btn variant="ghost" onClick={() => setActivePanel(null)}>Cancel</Btn>
            </div>
          </>
        )}
      </SECTION>

      {/* ADMIN USER */}
      <SECTION title="Restaurant Admin Account">
        {adminUser ? (
          <>
            <Field label="Name">{adminUser.name}</Field>
            <Field label="Email">{adminUser.email}</Field>
            <Field label="Phone">{adminUser.phone}</Field>
            <Field label="Role"><span style={{ color: "#c9a84c", fontSize: 12, fontWeight: 600 }}>{adminUser.role}</span></Field>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#8a8070", padding: "8px 0" }}>No admin account linked to this restaurant yet.</p>
        )}

        {/* CHANGE PASSWORD */}
        {adminUser && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(245,240,232,0.05)" }}>
            {activePanel !== "password" ? (
              <Btn variant="danger" onClick={() => setActivePanel("password")}>🔑 Change Admin Password</Btn>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#8a8070", marginBottom: 16 }}>Set a new password for <strong style={{ color: "#f5f0e8" }}>{adminUser.email}</strong></p>
                <Input label="New Password" type="password" value={pwForm.newPassword} onChange={setPw("newPassword")} placeholder="Min 6 characters" />
                <Input label="Confirm Password" type="password" value={pwForm.confirmPassword} onChange={setPw("confirmPassword")} placeholder="Re-enter password" />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>⚠ Passwords do not match</p>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={savePassword} disabled={saving || pwForm.newPassword !== pwForm.confirmPassword}>{saving ? "Updating..." : "Update Password"}</Btn>
                  <Btn variant="ghost" onClick={() => { setActivePanel(null); setPwForm({ newPassword: "", confirmPassword: "" }); }}>Cancel</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </SECTION>
    </div>
  );
}