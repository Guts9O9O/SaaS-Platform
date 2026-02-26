"use client";
import { useEffect, useState } from "react";

export default function useMenuContext({ restaurantSlug, tableCode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (!restaurantSlug || !tableCode) return;
    let cancelled = false;

    const initSession = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;

        // ✅ STEP 1: Check if a valid session cookie already exists
        // This is called on every page load including reloads.
        // If session is still valid (within 6hr window), use it directly
        // and DON'T create a new one — preserving the customer's login state.
        const checkRes = await fetch(`${API}/api/customer/session/check`, {
          method: "GET",
          credentials: "include",
        });

        if (checkRes.ok) {
          const existing = await checkRes.json();
          // ✅ Valid session found — set context and done
          // CustomerAuth will then call /api/customer/auth/me which will
          // find the customerId linked to this session and skip login screen
          if (!cancelled) {
            setContext(existing);
            setLoading(false);
          }
          return;
        }

        // ✅ STEP 2: No valid session — create a fresh one
        // This only happens on first scan or after 6hr expiry
        const res = await fetch(`${API}/api/customer/session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantSlug, tableCode }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Invalid or inactive table QR"
              : data?.message || "Failed to start session"
          );
        }

        if (!cancelled) setContext(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Invalid or inactive table QR");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initSession();
    return () => { cancelled = true; };
  }, [restaurantSlug, tableCode]);

  return { loading, error, context };
}