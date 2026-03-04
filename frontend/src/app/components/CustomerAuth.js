"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const RESEND_COOLDOWN = 30;

export default function CustomerAuth({ restaurantName, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const purpose = mode === "login" ? "LOGIN" : "REGISTER";

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`${API}/api/customer/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.customer) onSuccess(data.customer);
        }
      } catch { /* not logged in */ }
    };
    checkExisting();
  }, [onSuccess]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  async function requestOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/customer/auth/request-otp`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setStep("otp");
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    const otpString = otp.join("");
    try {
      const payload = purpose === "REGISTER"
        ? { name, phone, otp: otpString, purpose }
        : { phone, otp: otpString, purpose };
      const res = await fetch(`${API}/api/customer/auth/verify-otp`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "OTP verification failed");
      onSuccess(data.customer);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) verifyOtp();
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      document.getElementById("otp-5")?.focus();
    }
  }

  function resetToPhoneStep() {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    setResendTimer(0);
  }

  const otpComplete = otp.join("").length === 6;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        .auth-root {
          min-height: 100vh; background: #0e0e0e;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; font-family: 'DM Sans', sans-serif;
          position: relative; overflow: hidden;
        }
        .auth-glow {
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%);
          pointer-events: none;
        }
        .auth-grid {
          position: absolute; inset: 0; opacity: 0.025;
          background-image: linear-gradient(#f5f0e8 1px, transparent 1px), linear-gradient(90deg, #f5f0e8 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none;
        }
        .auth-card {
          width: 100%; max-width: 400px;
          background: #161410;
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 28px; padding: 44px 40px;
          position: relative; z-index: 1;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6);
          animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-card::before {
          content: '';
          position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent);
        }
        .auth-logo {
          text-align: center;
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: #f5f0e8;
          letter-spacing: -0.5px; margin-bottom: 16px;
        }
        .auth-logo span { color: #c9a84c; }
        .auth-venue {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-bottom: 28px;
        }
        .auth-venue-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px;
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 100px; font-size: 12px; color: #c9a84c;
          background: rgba(201,168,76,0.05); letter-spacing: 0.3px;
        }
        .auth-heading {
          text-align: center; margin-bottom: 32px;
        }
        .auth-title {
          font-family: 'Playfair Display', serif;
          font-size: 30px; font-weight: 700; line-height: 1.1;
          letter-spacing: -1px; color: #f5f0e8; margin-bottom: 8px;
        }
        .auth-title em { font-style: italic; color: #c9a84c; }
        .auth-subtitle { font-size: 13px; color: #8a8070; font-weight: 300; }
        .auth-tabs {
          display: flex; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,240,232,0.06);
          border-radius: 14px; padding: 4px; margin-bottom: 24px;
        }
        .auth-tab {
          flex: 1; padding: 10px; border-radius: 10px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.2s; color: #8a8070;
          border: none; background: transparent;
          font-family: 'DM Sans', sans-serif;
        }
        .auth-tab.active {
          background: #c9a84c; color: #0e0e0e;
          box-shadow: 0 2px 12px rgba(201,168,76,0.2);
        }
        .auth-field { margin-bottom: 14px; }
        .auth-label {
          display: block; font-size: 11px; letter-spacing: 1.5px;
          text-transform: uppercase; color: #8a8070;
          font-weight: 500; margin-bottom: 8px;
        }
        .auth-input-wrap {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,240,232,0.08);
          border-radius: 14px; padding: 0 18px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input-wrap:focus-within {
          border-color: rgba(201,168,76,0.4);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.06);
        }
        .auth-prefix {
          font-size: 14px; color: #8a8070; font-weight: 500;
          padding: 16px 12px 16px 0;
          border-right: 1px solid rgba(245,240,232,0.08); margin-right: 12px;
        }
        .auth-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #f5f0e8; font-size: 15px; font-family: 'DM Sans', sans-serif;
          padding: 16px 0;
        }
        .auth-input::placeholder { color: #3a3530; }
        .auth-input-plain {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,240,232,0.08);
          border-radius: 14px; padding: 16px 18px;
          color: #f5f0e8; font-size: 15px;
          font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input-plain::placeholder { color: #3a3530; }
        .auth-input-plain:focus {
          border-color: rgba(201,168,76,0.4);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.06);
        }
        .otp-hint { text-align: center; margin-bottom: 20px; }
        .otp-hint p { font-size: 14px; color: #8a8070; }
        .otp-hint strong { color: #f5f0e8; font-weight: 500; }
        .otp-row {
          display: flex; gap: 8px; justify-content: center; margin-bottom: 8px;
        }
        .otp-box {
          width: 50px; height: 58px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,240,232,0.08);
          border-radius: 14px; text-align: center;
          font-size: 24px; font-weight: 700;
          color: #f5f0e8; font-family: 'Playfair Display', serif;
          outline: none; caret-color: #c9a84c;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .otp-box:focus {
          border-color: rgba(201,168,76,0.5);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.08);
          transform: translateY(-2px);
        }
        .otp-box.filled {
          border-color: rgba(201,168,76,0.3);
          background: rgba(201,168,76,0.06);
        }
        .auth-error {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px;
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 12px; font-size: 13px; color: #f87171;
          margin-bottom: 14px;
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .auth-btn {
          width: 100%; padding: 16px; background: #c9a84c;
          color: #0e0e0e; border: none; border-radius: 14px;
          font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: all 0.25s; position: relative; overflow: hidden;
          margin-top: 8px;
        }
        .auth-btn:hover:not(:disabled) {
          background: #e8c97a; transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(201,168,76,0.3);
        }
        .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .auth-btn .spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2px solid rgba(0,0,0,0.2); border-top-color: #0e0e0e;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-ghost {
          width: 100%; padding: 12px; background: transparent; border: none;
          font-size: 13px; color: #8a8070; font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: color 0.2s; margin-top: 4px;
        }
        .auth-ghost:hover:not(:disabled) { color: #f5f0e8; }
        .auth-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-divider {
          display: flex; align-items: center; gap: 14px; margin: 16px 0;
        }
        .auth-divider-line { flex: 1; height: 1px; background: rgba(245,240,232,0.06); }
        .auth-divider-text { font-size: 12px; color: #4a4540; }
      `}</style>

      <div className="auth-root">
        <div className="auth-glow" />
        <div className="auth-grid" />

        <div className="auth-card">
          {/* LOGO */}
          <div className="auth-logo">Dine<span>Flow</span></div>

          {/* RESTAURANT BADGE */}
          {restaurantName && (
            <div className="auth-venue">
              <span className="auth-venue-badge">📍 {restaurantName}</span>
            </div>
          )}

          {/* HEADING */}
          <div className="auth-heading">
            {step === "phone" ? (
              <>
                <h1 className="auth-title">
                  {mode === "login" ? <>Welcome <em>back</em></> : <>Create <em>account</em></>}
                </h1>
                <p className="auth-subtitle">
                  {mode === "login" ? "Sign in to order and track your food" : "Join in seconds to start ordering"}
                </p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Verify <em>OTP</em></h1>
                <p className="auth-subtitle">Enter the 6-digit code we sent you</p>
              </>
            )}
          </div>

          {/* PHONE STEP */}
          {step === "phone" && (
            <>
              <div className="auth-tabs">
                <button className={`auth-tab ${mode === "login" ? "active" : ""}`}
                  onClick={() => { setMode("login"); setError(null); }}>Sign In</button>
                <button className={`auth-tab ${mode === "register" ? "active" : ""}`}
                  onClick={() => { setMode("register"); setError(null); }}>Register</button>
              </div>

              {mode === "register" && (
                <div className="auth-field">
                  <label className="auth-label">Your Name</label>
                  <input className="auth-input-plain" placeholder="Full name"
                    value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Mobile Number</label>
                <div className="auth-input-wrap">
                  <span className="auth-prefix">+91</span>
                  <input className="auth-input" type="tel" maxLength={10}
                    placeholder="10-digit number" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && phone.length === 10 && requestOtp()}
                    autoComplete="tel" />
                  {phone.length === 10 && <span style={{ color: "#c9a84c", fontSize: "16px" }}>✓</span>}
                </div>
              </div>

              {error && <div className="auth-error">⚠ {error}</div>}

              <button className="auth-btn" onClick={requestOtp}
                disabled={loading || phone.length !== 10 || (mode === "register" && !name.trim())}>
                {loading ? <span className="spinner" /> : "Send OTP →"}
              </button>
            </>
          )}

          {/* OTP STEP */}
          {step === "otp" && (
            <>
              <div className="otp-hint">
                <p>Code sent to <strong>+91 {phone}</strong></p>
              </div>

              <div className="auth-field">
                <label className="auth-label" style={{ textAlign: "center" }}>6-Digit Code</label>
                <div className="otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i} id={`otp-${i}`}
                      className={`otp-box ${digit ? "filled" : ""}`}
                      type="tel" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {error && <div className="auth-error">⚠ {error}</div>}

              <button className="auth-btn" onClick={verifyOtp} disabled={loading || !otpComplete}>
                {loading ? <span className="spinner" /> : "Verify & Continue →"}
              </button>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <button className="auth-ghost"
                onClick={() => { if (resendTimer > 0 || loading) return; setOtp(["","","","","",""]); setError(null); requestOtp(); }}
                disabled={resendTimer > 0 || loading}>
                {resendTimer > 0 ? `⏱ Resend OTP in ${resendTimer}s` : "Resend OTP"}
              </button>

              <button className="auth-ghost" onClick={resetToPhoneStep} style={{ color: "#4a4540" }}>
                ← Change number
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}