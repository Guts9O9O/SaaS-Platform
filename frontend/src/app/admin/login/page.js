"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminToken, getAdminToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const token = getAdminToken();
    if (token) router.replace("/admin/live-orders");
  }, [mounted, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");
      if (!data?.token) throw new Error("Token missing in response");
      setAdminToken(data.token);
      if (data?.user?.restaurantId) localStorage.setItem("restaurantId", data.user.restaurantId);
      else localStorage.removeItem("restaurantId");
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      if (data?.user?.role === "SUPER_ADMIN") { router.replace("/super-admin/restaurants"); return; }
      router.replace("/admin/live-orders");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatA { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-12px) rotate(3deg); } }
        @keyframes floatB { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-8px) rotate(-2deg); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .al-input {
          width:100%; padding:14px 16px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(245,240,232,0.08);
          border-radius:14px; color:#f5f0e8;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:border-color 0.2s, background 0.2s;
        }
        .al-input::placeholder { color:#4a4540; }
        .al-input:focus { border-color:rgba(201,168,76,0.4); background:rgba(255,255,255,0.05); }
        .al-btn {
          width:100%; padding:15px;
          background:#c9a84c; color:#0e0e0e;
          border:none; border-radius:14px;
          font-size:15px; font-weight:700;
          font-family:'DM Sans',sans-serif;
          cursor:pointer; transition:all 0.2s; letter-spacing:0.3px;
        }
        .al-btn:hover:not(:disabled) { background:#d4b460; transform:translateY(-1px); box-shadow:0 8px 24px rgba(201,168,76,0.25); }
        .al-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .al-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#8a8070; padding:4px; transition:color 0.2s; }
        .al-eye:hover { color:#c9a84c; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"'DM Sans',sans-serif", position:"relative", overflow:"hidden" }}>

        {/* Floating decorative shapes */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"8%", left:"6%", width:80, height:80, border:"1px solid rgba(201,168,76,0.08)", borderRadius:16, animation:"floatA 7s ease-in-out infinite" }} />
          <div style={{ position:"absolute", top:"15%", right:"8%", width:48, height:48, border:"1px solid rgba(201,168,76,0.06)", borderRadius:"50%", animation:"floatB 5s ease-in-out infinite" }} />
          <div style={{ position:"absolute", bottom:"12%", left:"10%", width:32, height:32, background:"rgba(201,168,76,0.04)", borderRadius:8, animation:"floatB 6s ease-in-out infinite 1s" }} />
          <div style={{ position:"absolute", bottom:"20%", right:"6%", width:64, height:64, border:"1px solid rgba(201,168,76,0.05)", borderRadius:16, animation:"floatA 8s ease-in-out infinite 0.5s" }} />
          <div style={{ position:"absolute", top:"45%", left:"3%", width:1, height:120, background:"linear-gradient(transparent, rgba(201,168,76,0.15), transparent)" }} />
          <div style={{ position:"absolute", top:"30%", right:"3%", width:1, height:80, background:"linear-gradient(transparent, rgba(201,168,76,0.1), transparent)" }} />
        </div>

        <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>

          {/* Brand */}
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:16, padding:"8px 20px", background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.12)", borderRadius:100 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
              <span style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:"#c9a84c", fontWeight:600 }}>DineFlow</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:"#f5f0e8", letterSpacing:-0.5, lineHeight:1.2 }}>
              Restaurant Admin
            </h1>
            <p style={{ fontSize:13, color:"#8a8070", marginTop:8, fontWeight:300 }}>Manage your restaurant operations</p>
          </div>

          {/* Card */}
          <div style={{ background:"#161410", border:"1px solid rgba(245,240,232,0.07)", borderRadius:24, overflow:"hidden", boxShadow:"0 40px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ height:1, background:"linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding:"32px 32px 36px" }}>

              {error && (
                <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ color:"#ef4444", fontSize:15, flexShrink:0 }}>⚠</span>
                  <p style={{ color:"#fca5a5", fontSize:13, lineHeight:1.5 }}>{error}</p>
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#8a8070", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Email</label>
                <input className="al-input" type="email" placeholder="admin@yourrestaurant.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} autoComplete="email" />
              </div>

              <div style={{ marginBottom:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"#8a8070", letterSpacing:1, textTransform:"uppercase" }}>Password</label>
                </div>
                <div style={{ position:"relative" }}>
                  <input className="al-input" type={showPass ? "text" : "password"} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} autoComplete="current-password" style={{ paddingRight:44 }} />
                  <button className="al-eye" type="button" onClick={() => setShowPass(v => !v)}>
                    {showPass
                      ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="al-btn" onClick={handleLogin} disabled={loading || !email.trim() || !password}>
                {loading
                  ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <svg style={{ animation:"spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                      Signing in...
                    </span>
                  : "Sign In"
                }
              </button>

              <div style={{ height:1, background:"rgba(245,240,232,0.05)", margin:"24px 0" }} />

              <p style={{ fontSize:12, color:"#4a4540", textAlign:"center" }}>
                Waiter?{" "}
                <a href="/waiter/login" style={{ color:"#c9a84c", textDecoration:"none", fontWeight:500 }}>Use waiter login</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}