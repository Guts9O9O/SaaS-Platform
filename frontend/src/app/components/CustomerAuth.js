"use client";
import { useState } from "react";

export default function CustomerAuth({ restaurantName, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const purpose = mode === "login" ? "LOGIN" : "REGISTER";

  async function requestOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/request-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, purpose }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const payload =
        purpose === "REGISTER"
          ? { name, phone, otp, purpose }
          : { phone, otp, purpose };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/verify-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "OTP verification failed");
      onSuccess(data.customer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetToPhoneStep() {
    setStep("phone");
    setOtp("");
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
            <input
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-neutral-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 transition"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Request OTP"}
            </button>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="w-full text-sm text-gray-400 hover:text-white transition"
            >
              {mode === "login" ? "New here? Register" : "Already have an account? Login"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Enter the OTP sent to <span className="text-white font-medium">{phone}</span>
            </p>
            <input
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-neutral-700/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 transition text-center text-xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
            <button
              onClick={resetToPhoneStep}
              className="w-full text-sm text-gray-400 hover:text-white transition"
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}