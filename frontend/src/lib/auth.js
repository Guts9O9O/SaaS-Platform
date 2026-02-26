// frontend/src/lib/auth.js

/* ===================== ADMIN ===================== */
// Admins log in once on their own device and stay logged in across sessions.
// localStorage persists across browser restarts — correct for admins.

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
// ✅ FIX: Waiter token uses sessionStorage instead of localStorage.
//
// WHY: localStorage is shared across ALL tabs and windows on the same
// browser origin (localhost:3000 or your domain). This means if Waiter A
// logs in on their phone, and Waiter B opens the login page on the same
// browser, they'd be redirected straight to Waiter A's dashboard.
//
// sessionStorage is isolated per tab/window/device session:
// - Each waiter's phone has its own independent session
// - Closing the browser tab automatically logs out (no stale tokens)
// - Two waiters on different phones never share tokens
// - Two waiters testing on the same machine in different tabs also
//   get independent sessions

export function getWaiterToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("waiterToken"); // ✅ sessionStorage
}

export function setWaiterToken(token) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("waiterToken", token); // ✅ sessionStorage
}

export function clearWaiterToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("waiterToken"); // ✅ sessionStorage
}

/* ===================== SUPER ADMIN ===================== */
// Super admin stays on localStorage — logs in once from their own machine.

export function getSuperAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("superAdminToken");
}

export function setSuperAdminToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("superAdminToken", token);
}

export function clearSuperAdminToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("superAdminToken");
}

/* ===================== HELPERS ===================== */
export function isAdminLoggedIn() {
  return !!getAdminToken();
}

export function isWaiterLoggedIn() {
  return !!getWaiterToken();
}

export function isSuperAdminLoggedIn() {
  return !!getSuperAdminToken();
}