"use client";

import { useEffect, useState } from "react";

export default function useMenuContext({ restaurantSlug, tableCode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (!restaurantSlug || !tableCode) return;

    let cancelled = false;

    const fetchContext = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/menu-context/context?restaurantSlug=${restaurantSlug}&tableCode=${tableCode}`
        );

        if (!res.ok) {
          throw new Error("Invalid context");
        }

        const data = await res.json();
        if (!cancelled) setContext(data);
      } catch (err) {
        if (!cancelled) setError("Invalid or inactive table QR");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContext();

    return () => {
      cancelled = true;
    };
  }, [restaurantSlug, tableCode]);

  return { loading, error, context };
}
