"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getWaiterToken, clearWaiterToken } from "@/lib/auth";
import { io } from "socket.io-client";

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // iPhone "Tri-tone" is essentially 3 quick sine bursts at these frequencies
    const notes = [
      { freq: 1046.5, start: 0.0,  dur: 0.12 },  // C6 — high & bright
      { freq: 1318.5, start: 0.13, dur: 0.12 },  // E6
      { freq: 1567.98,start: 0.26, dur: 0.22 },  // G6 — held slightly longer
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      // Add a subtle compressor so it punches without distorting
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-10, ctx.currentTime);
      compressor.knee.setValueAtTime(3, ctx.currentTime);
      compressor.ratio.setValueAtTime(6, ctx.currentTime);
      compressor.attack.setValueAtTime(0.001, ctx.currentTime);
      compressor.release.setValueAtTime(0.1, ctx.currentTime);

      osc.connect(gain);
      gain.connect(compressor);
      compressor.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      const t0 = ctx.currentTime + start;
      const t1 = t0 + dur;

      // Sharp attack (0.008s), then exponential decay — like a struck bell
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.95, t0 + 0.008); // ✅ louder: 0.95 vs old 0.4
      gain.gain.exponentialRampToValueAtTime(0.001, t1);

      osc.start(t0);
      osc.stop(t1 + 0.05);
    });
  } catch (err) {
    console.warn("[CHIME] Could not play notification sound:", err);
  }
}

export default function WaiterDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("disconnected");
  const socketRef = useRef(null);

  const token = useMemo(() => (mounted ? getWaiterToken() : null), [mounted]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.push("/waiter/login");
  }, [mounted, token, router]);

  const fetchMyTables = async () => {
    const t = getWaiterToken();
    if (!t) return;
    try {
      setLoadingTables(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/waiter/tables/my-tables`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load tables");
      setTables(Array.isArray(data?.tables) ? data.tables : []);
    } catch (e) {
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (!mounted || !token) return;
    fetchMyTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  useEffect(() => {
    if (!mounted || !token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("join_waiter_room", { token });
    });

    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    socket.on("waiter:called", (payload) => {
      setEvents((prev) => {
        const alreadyPending = prev.some(
          (ev) => !ev.blurred && ev.payload?.tableCode === payload?.tableCode
        );
        if (alreadyPending) return prev;

        // ✅ Play chime when a new notification arrives
        playNotificationChime();

        return [
          {
            id: `${Date.now()}_${Math.random()}`,
            type: "WAITER_CALLED",
            payload,
            ts: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    });

    socket.on("service_request", ({ request }) => {
      if (!request) return;
      if (request.type !== "WAITER") return;
      // ✅ Also chime for service_request events
      playNotificationChime();
      setEvents((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          type: "SERVICE_REQUEST",
          payload: request,
          ts: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mounted, token]);

  const logout = () => {
    clearWaiterToken();
    try { socketRef.current?.disconnect(); } catch {}
    router.push("/waiter/login");
  };

  const handleAccept = (eventId, payload) => {
    const { orderId, tableCode, waiterUserId, restaurantId } = payload;

    socketRef.current?.emit("waiter:accepted", {
      restaurantId,
      tableCode,
      waiterUserId,
      payload: { orderId, status: "accepted", waiterUserId, tableCode },
    });

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              type: "WAITER_ACCEPTED",
              payload: { ...ev.payload, status: "accepted" },
              blurred: true,
            }
          : ev
      )
    );

    setTimeout(() => {
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    }, 60000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Waiter Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Live customer calls • Status:{" "}
              <span
                className={
                  status === "connected"
                    ? "text-green-400"
                    : status === "error"
                    ? "text-red-400"
                    : "text-gray-400"
                }
              >
                {status}
              </span>
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition"
          >
            Logout
          </button>
        </div>

        {/* Assigned Tables */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My Assigned Tables</h2>
            <button
              onClick={fetchMyTables}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-sm"
            >
              Refresh
            </button>
          </div>
          {loadingTables ? (
            <p className="text-gray-400 mt-3">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="text-gray-400 mt-3">
              No tables assigned yet. Ask admin to assign you to tables.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-3">
              {tables.map((t) => (
                <span
                  key={t._id}
                  className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-200 text-sm"
                >
                  {t.tableCode}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-white">Live Notifications</h2>
            <button
              onClick={() => setEvents([])}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-sm"
            >
              Clear
            </button>
          </div>
          {events.length === 0 ? (
            <div className="text-gray-400 py-10 text-center">
              No calls yet. Waiting for customers…
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const p = ev.payload || {};
                const tableCode = p.tableCode || p?.payload?.tableCode;
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl bg-gray-950/40 border border-gray-800 flex items-start justify-between gap-4 transition-opacity ${
                      ev.blurred ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <div className="text-white font-semibold">
                        Customer called waiter{" "}
                        {tableCode ? (
                          <span className="text-blue-300">({tableCode})</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(ev.ts).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs border ${
                          ev.blurred
                            ? "bg-gray-600 border-gray-700 text-gray-400"
                            : "bg-green-500/15 border-green-500/25 text-green-200"
                        }`}
                      >
                        {ev.blurred ? "Accepted" : "NEW"}
                      </span>
                      {!ev.blurred && (
                        <button
                          onClick={() => handleAccept(ev.id, ev.payload)}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}