"use client";

import { useState } from "react";

export default function CustomerAuth({ restaurantName, onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [step, setStep] = useState("phone"); // phone | otp

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">{restaurantName}</h2>

        <p className="text-sm text-zinc-400 mb-4">
          {mode === "login" ? "Login to continue" : "Register to continue"}
        </p>

        {step === "phone" && (
          <>
            {mode === "register" && (
              <input
                className="w-full mb-3 px-3 py-2 rounded bg-zinc-800"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              className="w-full mb-3 px-3 py-2 rounded bg-zinc-800"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full bg-emerald-500 text-black py-2 rounded font-semibold"
            >
              {loading ? "Please wait..." : "Request OTP"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-zinc-400 mb-3">
              Enter the OTP sent to <span className="text-zinc-200">{phone}</span>
            </p>

            <input
              className="w-full mb-3 px-3 py-2 rounded bg-zinc-800"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-emerald-500 text-black py-2 rounded font-semibold"
            >
              {loading ? "Please wait..." : "Verify & Continue"}
            </button>

            <button
              onClick={resetToPhoneStep}
              className="w-full text-sm text-zinc-400 mt-3"
            >
              Change phone
            </button>
          </>
        )}

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setStep("phone");
            setOtp("");
            setError(null);
          }}
          className="w-full text-sm text-zinc-400 mt-3"
        >
          {mode === "login" ? "New here? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}
