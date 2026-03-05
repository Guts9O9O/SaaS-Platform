"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/login`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to login");
      if (data?.user?.role !== "SUPER_ADMIN") throw new Error("This account is not a SUPER ADMIN");
      localStorage.setItem("superAdminToken", data.token);
      router.push("/super-admin/restaurants");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-input {
          width: 100%; padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,240,232,0.08);
          border-radius: 14px; color: #f5f0e8;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s, background 0.2s;
        }
        .login-input::placeholder { color: #4a4540; }
        .login-input:focus { border-color: rgba(201,168,76,0.4); background: rgba(255,255,255,0.05); }
        .login-btn {
          width: 100%; padding: 15px;
          background: #c9a84c; color: #0e0e0e;
          border: none; border-radius: 14px;
          font-size: 15px; font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
          letter-spacing: 0.3px;
        }
        .login-btn:hover:not(:disabled) { background: #d4b460; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,0.25); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pass-toggle { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#8a8070; padding:4px; }
        .pass-toggle:hover { color:#c9a84c; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"'DM Sans',sans-serif", position:"relative", overflow:"hidden" }}>

        {/* Background decoration */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"-20%", right:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)" }} />
          <div style={{ position:"absolute", bottom:"-20%", left:"-10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,0.03) 0%, transparent 70%)" }} />
          {/* Grid lines */}
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(245,240,232,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,232,0.015) 1px, transparent 1px)", backgroundSize:"60px 60px" }} />
        </div>

        <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>

          {/* Logo / Brand */}
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:56, height:56, borderRadius:16, background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.2)", marginBottom:20 }}>
              <svg width="24" height="24" fill="none" stroke="#c9a84c" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"#c9a84c", fontWeight:600, marginBottom:8 }}>DineFlow</p>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#f5f0e8", letterSpacing:-0.5 }}>Super Admin</h1>
            <p style={{ fontSize:13, color:"#8a8070", marginTop:6, fontWeight:300 }}>Platform control panel</p>
          </div>

          {/* Card */}
          <div style={{ background:"#161410", border:"1px solid rgba(245,240,232,0.07)", borderRadius:24, overflow:"hidden", boxShadow:"0 40px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ height:1, background:"linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
            <div style={{ padding:"32px 32px 36px" }}>

              {error && (
                <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, marginBottom:20, display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ color:"#ef4444", fontSize:14, flexShrink:0, marginTop:1 }}>⚠</span>
                  <p style={{ color:"#fca5a5", fontSize:13, lineHeight:1.5 }}>{error}</p>
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:500, color:"#8a8070", letterSpacing:0.8, textTransform:"uppercase", marginBottom:8 }}>Email Address</label>
                <input className="login-input" type="email" placeholder="admin@dineflow.co.in" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} autoComplete="email" />
              </div>

              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:500, color:"#8a8070", letterSpacing:0.8, textTransform:"uppercase", marginBottom:8 }}>Password</label>
                <div style={{ position:"relative" }}>
                  <input className="login-input" type={showPass ? "text" : "password"} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} autoComplete="current-password" style={{ paddingRight:44 }} />
                  <button className="pass-toggle" onClick={() => setShowPass(v => !v)} type="button">
                    {showPass
                      ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="login-btn" onClick={handleLogin} disabled={loading || !email.trim() || !password}>
                {loading
                  ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <svg style={{ animation:"spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                      Signing in...
                    </span>
                  : "Sign In to Platform"
                }
              </button>

            </div>
          </div>

          <p style={{ textAlign:"center", marginTop:24, fontSize:12, color:"#4a4540" }}>
            Restaurant admin?{" "}
            <a href="/admin/login" style={{ color:"#c9a84c", textDecoration:"none", fontWeight:500 }}>Sign in here</a>
          </p>
        </div>
      </div>
    </>
  );
}