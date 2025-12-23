const API_BASE_URL = "http://localhost:4000";

export async function fetchMenuByRestaurantSlug(slug) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/menu/${slug}`, {
      cache: "no-store", // important for dev
    });

    if (!res.ok) {
      throw new Error("Failed to fetch menu");
    }

    return await res.json();
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
}
