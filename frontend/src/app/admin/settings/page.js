"use client";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
}

export default function AdminSettingsPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [logoUrl, setLogoUrl]       = useState(null);
  const [saved, setSaved]           = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API}/api/admin/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        // me returns admin user — get restaurantId then fetch restaurant
        const rId = data.user?.restaurantId || data.admin?.restaurantId;
        if (!rId) return;
        const rRes = await fetch(`${API}/api/admin/restaurant`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const rData = await rRes.json();
        if (rRes.ok) {
          setRestaurant(rData.restaurant || rData);
          setLogoUrl(rData.restaurant?.logoUrl || rData.logoUrl || null);
        }
      } catch (err) {
        console.error("settings fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select an image file.");
    if (file.size > 2 * 1024 * 1024) return alert("Image must be under 2MB.");

    setUploading(true);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      // restaurantId not needed — backend reads it from auth token for RESTAURANT_ADMIN

      const res = await fetch(`${API}/api/admin/upload/restaurant-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setLogoUrl(data.logoUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fullLogoUrl = logoUrl
    ? logoUrl.startsWith("http") ? logoUrl : `${API}${logoUrl}`
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin   { to{transform:rotate(360deg);} }
      `}</style>
      <div style={{ minHeight:"100vh", background:"#0e0e0e", color:"#f5f0e8", fontFamily:"'DM Sans',sans-serif", padding:"32px 24px" }}>
        <div style={{ maxWidth:560, margin:"0 auto", animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>

          {/* Header */}
          <p style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:"#c9a84c", fontWeight:600, marginBottom:6 }}>Restaurant</p>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#f5f0e8", margin:"0 0 4px", letterSpacing:-0.5 }}>Settings</h1>
          <p style={{ color:"#8a8070", fontSize:13, margin:"0 0 28px", fontWeight:300 }}>Manage your restaurant profile</p>
          <div style={{ height:1, background:"linear-gradient(90deg,rgba(201,168,76,0.3),transparent)", marginBottom:28 }} />

          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, color:"#8a8070", fontSize:13 }}>
              <svg style={{ animation:"spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
              Loading settings...
            </div>
          ) : (
            <>
              {/* ── LOGO CARD ─────────────────────────────────────────── */}
              <div style={{ background:"#161410", border:"1px solid rgba(245,240,232,0.07)", borderRadius:16, padding:"24px", marginBottom:16 }}>
                <p style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"#8a8070", fontWeight:600, marginBottom:16 }}>Restaurant Logo</p>

                <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                  {/* Preview circle */}
                  <div style={{ width:88, height:88, borderRadius:16, border:"1.5px solid rgba(201,168,76,0.2)", background:"rgba(201,168,76,0.05)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                    {fullLogoUrl ? (
                      <img src={fullLogoUrl} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    ) : (
                      <span style={{ fontSize:36 }}>🍽️</span>
                    )}
                  </div>

                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:"#f5f0e8", marginBottom:4 }}>
                      {fullLogoUrl ? "Change logo" : "Upload your logo"}
                    </p>
                    <p style={{ fontSize:12, color:"#8a8070", marginBottom:14, fontWeight:300 }}>
                      PNG, JPG or WebP · Max 2MB<br />Recommended: 256×256px square
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display:"none" }}
                      onChange={handleLogoUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ padding:"9px 20px", background: uploading ? "rgba(201,168,76,0.1)" : "#c9a84c", border:"none", borderRadius:10, color: uploading ? "#c9a84c" : "#0e0e0e", fontSize:13, fontWeight:700, cursor: uploading ? "not-allowed" : "pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:8 }}>
                      {uploading ? (
                        <>
                          <svg style={{ animation:"spin 0.8s linear infinite" }} width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                          Uploading…
                        </>
                      ) : fullLogoUrl ? "Change Logo" : "Upload Logo"}
                    </button>

                    {saved && (
                      <p style={{ fontSize:12, color:"#10b981", marginTop:10, fontWeight:500 }}>✓ Logo updated successfully</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── RESTAURANT INFO (read-only) ───────────────────────── */}
              {restaurant && (
                <div style={{ background:"#161410", border:"1px solid rgba(245,240,232,0.07)", borderRadius:16, padding:"24px" }}>
                  <p style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"#8a8070", fontWeight:600, marginBottom:16 }}>Restaurant Info</p>
                  {[
                    { label:"Name",   value: restaurant.name },
                    { label:"Slug",   value: restaurant.slug },
                    { label:"Plan",   value: restaurant.plan || "FREE" },
                    { label:"Status", value: restaurant.subscriptionStatus || "TRIAL" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(245,240,232,0.05)" }}>
                      <span style={{ fontSize:13, color:"#8a8070" }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"#f5f0e8" }}>{value}</span>
                    </div>
                  ))}
                  <p style={{ fontSize:11, color:"#4a4540", marginTop:14, fontWeight:300 }}>
                    To change plan or limits, contact your Super Admin.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}