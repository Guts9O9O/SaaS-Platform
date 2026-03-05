"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setWaiterToken, getWaiterToken } from "@/lib/auth";

export default function WaiterLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const token = getWaiterToken();
    if (token) router.replace("/waiter/dashboard");
  }, [mounted, router]);

  const onSubmit = async (e) => {
    e?.preventDefault();
    if (!phone.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/waiter/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");
      if (!data?.token) throw new Error("Token missing in response");
      setWaiterToken(data.token);
      router.replace("/waiter/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") onSubmit(); };
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ringPulse { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.15); opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .wl-input {
          width:100%; padding:14px 16px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(245,240,232,0.08);
          border-radius:14px; color:#f5f0e8;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:border-color 0.2s, background 0.2s;
        }
        .wl-input::placeholder { color:#4a4540; }
        .wl-input:focus { border-color:rgba(201,168,76,0.4); background:rgba(255,255,255,0.05); }
        .wl-btn {
          width:100%; padding:15px;
          background:#c9a84c; color:#0e0e0e;
          border:none; border-radius:14px;
          font-size:15px; font-weight:700;
          font-family:'DM Sans',sans-serif;
          cursor:pointer; transition:all 0.2s; letter-spacing:0.3px;
        }
        .wl-btn:hover:not(:disabled) { background:#d4b460; transform:translateY(-1px); box-shadow:0 8px 24px rgba(201,168,76,0.25); }
        .wl-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .wl-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#8a8070; padding:4px; transition:color 0.2s; }
        .wl-eye:hover { color:#c9a84c; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"'DM Sans',sans-serif", position:"relative", overflow:"hidden" }}>

        {/* Background */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,0.03) 0%, transparent 65%)" }} />
          {/* Concentric ring decoration */}
          {[200, 320, 440].map((size, i) => (
            <div key={i} style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:size, height:size, borderRadius:"50%", border:"1px solid rgba(201,168,76,0.04)", animation:`ringPulse ${4 + i}s ease-in-out infinite ${i * 0.7}s` }} />
          ))}
        </div>

        <div style={{ width:"100%", maxWidth:400, animation:"fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both", position:"relative" }}>

          {/* Brand */}
          <div style={{ textAlign:"center", marginBottom:36 }}>
            {/* Bell icon */}
            <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:"50%", background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.15)", marginBottom:20 }}>
              <svg width="26" height="26" fill="none" stroke="#c9a84c" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification dot */}
              <div style={{ position:"absolute", top:10, right:10, width:10, height:10, borderRadius:"50%", background:"#c9a84c", border:"2px solid #0e0e0e" }} />
            </div>
            <p style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"#c9a84c", fontWeight:600, marginBottom:8 }}>DineFlow</p>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#f5f0e8", letterSpacing:-0.5 }}>Waiter Portal</h1>
            <p style={{ fontSize:13, color:"#8a8070", marginTop:6, fontWeight:300 }}>Receive live table call notifications</p>
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
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#8a8070", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Phone Number</label>
                <input className="wl-input" type="tel" placeholder="Enter your phone number" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={handleKeyDown} autoComplete="tel" />
              </div>

              <div style={{ marginBottom:28 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#8a8070", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Password</label>
                <div style={{ position:"relative" }}>
                  <input className="wl-input" type={showPass ? "text" : "password"} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} autoComplete="current-password" style={{ paddingRight:44 }} />
                  <button className="wl-eye" type="button" onClick={() => setShowPass(v => !v)}>
                    {showPass
                      ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="wl-btn" onClick={onSubmit} disabled={loading || !phone.trim() || !password}>
                {loading
                  ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <svg style={{ animation:"spin 0.8s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                      Signing in...
                    </span>
                  : "Sign In"
                }
              </button>

              <div style={{ height:1, background:"rgba(245,240,232,0.05)", margin:"24px 0" }} />

              <p style={{ fontSize:12, color:"#4a4540", textAlign:"center", lineHeight:1.6 }}>
                No access? Ask your restaurant admin<br />to create a waiter account for you.
              </p>
            </div>
          </div>

          <p style={{ textAlign:"center", marginTop:24, fontSize:12, color:"#4a4540" }}>
            Admin?{" "}
            <a href="/admin/login" style={{ color:"#c9a84c", textDecoration:"none", fontWeight:500 }}>Sign in here</a>
          </p>
        </div>
      </div>
    </>
  );
}