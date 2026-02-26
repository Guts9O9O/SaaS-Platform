"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const RESEND_COOLDOWN = 30;

export default function CustomerAuth({ restaurantName, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const purpose = mode === "login" ? "LOGIN" : "REGISTER";

  // ✅ FIX: Session is already created by useMenuContext before this component
  // renders. Just check if customer is already logged in (returning visitor).
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`${API}/api/customer/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.customer) onSuccess(data.customer);
        }
      } catch { /* not logged in, show auth screen */ }
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
    try {
      const payload = purpose === "REGISTER"
        ? { name, phone, otp, purpose }
        : { phone, otp, purpose };
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

  function resetToPhoneStep() {
    setStep("phone"); setOtp(""); setError(null); setResendTimer(0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 backdrop-blur-sm border border-neutral-700/40 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">Welcome</h1>
          <p className="text-sm text-gray-400">{restaurantName}</p>
        </div>

        {step === "phone" && (
          <div className="space-y-4">
            {mode === "register" && (
              <input
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-neutral-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 transition"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-neutral-700/50 focus-within:border-amber-500/50 transition">
              <span className="text-gray-400 text-sm font-medium">+91</span>
              <input
                type="tel" maxLength={10}
                className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && phone.length === 10 && requestOtp()}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={requestOtp}
              disabled={loading || phone.length !== 10}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Request OTP"}
            </button>
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
              className="w-full text-sm text-gray-400 hover:text-white transition"
            >
              {mode === "login" ? "New here? Create an account" : "Already have an account? Login"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              OTP sent to <span className="text-white font-medium">+91 {phone}</span>
            </p>
            <input
              type="tel" maxLength={6} autoFocus
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-neutral-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 transition text-center text-2xl tracking-widest"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && verifyOtp()}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
            <button
              onClick={() => { if (resendTimer > 0 || loading) return; setOtp(""); setError(null); requestOtp(); }}
              disabled={resendTimer > 0 || loading}
              className="w-full text-sm text-gray-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
            </button>
            <button onClick={resetToPhoneStep} className="w-full text-sm text-gray-500 hover:text-gray-300 transition">
              ← Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}