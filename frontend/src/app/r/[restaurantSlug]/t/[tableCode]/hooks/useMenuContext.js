"use client";

import { useEffect, useState } from "react";

export default function useMenuContext({ restaurantSlug, tableCode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (!restaurantSlug || !tableCode) return;

    let cancelled = false;

    const startSession = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/customer/session/start`,
          {
            method: "POST",
            credentials: "include", // 🔑 REQUIRED
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ restaurantSlug, tableCode }),
          }
        );

        if (!res.ok) {
          throw new Error("Failed to start session");
        }

        const data = await res.json();

        if (!cancelled) {
          setContext(data); // { restaurant, table }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Invalid or inactive table QR");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    startSession();

    return () => {
      cancelled = true;
    };
  }, [restaurantSlug, tableCode]);

  return { loading, error, context };
}
