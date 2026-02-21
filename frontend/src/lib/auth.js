// frontend/src/lib/auth.js

/* ===================== ADMIN ===================== */
export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

export function setAdminToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("adminToken", token);
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
}

/* ===================== WAITER ===================== */
export function getWaiterToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("waiterToken");
}

export function setWaiterToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("waiterToken", token);
}

export function clearWaiterToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("waiterToken");
}

/* ===================== HELPERS ===================== */
export function isAdminLoggedIn() {
  return !!getAdminToken();
}

export function isWaiterLoggedIn() {
  return !!getWaiterToken();
}
