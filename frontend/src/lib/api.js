// frontend/src/lib/api.js
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path, options = {}) {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is not set");

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "API error");
  }

  return data;
}
export async function updateRestaurantDetails(restaurantId, details) {
  const response = await apiFetch(`/restaurants/${restaurantId}`, {
    method: "PUT",
    body: JSON.stringify(details),
  });

  return response; // or adjust based on your actual API response structure
}