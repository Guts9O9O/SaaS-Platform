"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Cart from "../../../../components/Cart";
import CartDrawer from "../../../../components/CartDrawer";
import { io } from "socket.io-client";
import useMenuContext from "./hooks/useMenuContext";
import FeedbackScreen from "../../../../components/FeedbackScreen";
// CustomerAuth is kept but NOT used — hidden for now, OTP flow preserved
// import CustomerAuth from "../../../../components/CustomerAuth";

function getItemImage(item) {
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const img = item.images[0];
    if (img.startsWith("http")) return img;
    return `${process.env.NEXT_PUBLIC_API_URL}${img}`;
  }
  return item?.imageUrl || item?.image || item?.photo || item?.photoUrl || item?.thumbnail || "";
}
function getItemVideo(item) {
  if (Array.isArray(item?.videos) && item.videos.length > 0) {
    const v = item.videos[0];
    if (!v) return "";
    if (v.startsWith("http")) return v;
    return `${process.env.NEXT_PUBLIC_API_URL}${v}`;
  }
  return "";
}
function moneyINR(n) { return `₹${Number(n || 0).toFixed(2)}`; }

const WAITER_COOLDOWN_SECONDS = 120;
const BILL_COOLDOWN_MS        = 2 * 60 * 1000;
const SESSION_TIMEOUT_MS      = 2 * 60 * 60 * 1000;
const RADIUS                  = 8;
const CIRCUMFERENCE           = 2 * Math.PI * RADIUS;

// ─── SPLASH SCREEN ───────────────────────────────────────────────────────────
function SplashScreen({ restaurantName }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes splashFadeIn  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes splashPulse   { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }
        @keyframes splashBar     { from { width:0%; } to { width:100%; } }
        @keyframes shimmerGold   { 0% { background-position:200% center; } 100% { background-position:-200% center; } }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "#0e0e0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Decorative ring */}
        <div style={{
          width: 96, height: 96,
          borderRadius: "50%",
          border: "1.5px solid rgba(201,168,76,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 32,
          animation: "splashPulse 2s ease-in-out infinite",
          position: "relative",
        }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
            border: "1px solid rgba(201,168,76,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>
            🍽️
          </div>
        </div>

        {/* Welcome */}
        <p style={{
          fontSize: 12,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#c9a84c",
          fontWeight: 600,
          marginBottom: 10,
          animation: "splashFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both",
        }}>
          Welcome
        </p>

        {/* DineFlow */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: -1,
          margin: "0 0 12px",
          background: "linear-gradient(90deg, #c9a84c, #f0d98a, #c9a84c)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "splashFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both, shimmerGold 3s linear infinite",
        }}>
          DineFlow
        </h1>

        {/* Restaurant name */}
        <p style={{
          fontSize: 15,
          color: "#8a8070",
          fontWeight: 400,
          margin: "0 0 48px",
          letterSpacing: 0.3,
          animation: "splashFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both",
        }}>
          {restaurantName || "Loading..."}
        </p>

        {/* Progress bar */}
        <div style={{
          width: 120,
          height: 2,
          background: "rgba(201,168,76,0.15)",
          borderRadius: 999,
          overflow: "hidden",
          animation: "splashFadeIn 0.4s 0.4s both",
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #c9a84c, #f0d98a)",
            borderRadius: 999,
            animation: "splashBar 3s cubic-bezier(0.4,0,0.2,1) forwards",
          }} />
        </div>
      </div>
    </>
  );
}

export default function ClientMenu({ restaurantSlug, tableCode }) {
  const { loading, error, context } = useMenuContext({ restaurantSlug, tableCode });
  const [menuData, setMenuData]               = useState(null);
  const [menuError, setMenuError]             = useState(null);
  const [cartItems, setCartItems]             = useState([]);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
  const [isCartOpen, setIsCartOpen]           = useState(false);
  const [showFeedback, setShowFeedback]       = useState(false);
  const [activeTab, setActiveTab]             = useState("menu");
  const [tableOrders, setTableOrders]         = useState([]);
  const [loadingOrders, setLoadingOrders]     = useState(false);
  const [authChecked, setAuthChecked]         = useState(false);
  const [customer, setCustomer]               = useState(null);
  const [billRequested, setBillRequested]     = useState(false);
  const [search, setSearch]                   = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("ALL");
  const [waiterCalled, setWaiterCalled]       = useState(false);
  const [waiterCooldown, setWaiterCooldown]   = useState(0);
  const [videoModal, setVideoModal]           = useState({ open: false, url: "", title: "" });

  // ── SPLASH: show for 3.5s then reveal menu ───────────────────────────────
  const [showSplash, setShowSplash]           = useState(true);

  const billCooldownTimerRef  = useRef(null);
  const feedbackTimerRef      = useRef(null);
  const sessionTimerRef       = useRef(null);
  const socketRef             = useRef(null);
  const joinedOrdersRef       = useRef(new Set());
  const waiterCooldownRef     = useRef(null);
  const waiterIntervalRef     = useRef(null);

  // ── Splash timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Session timeout ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!customer) return;
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/logout`, {
        method: "POST", credentials: "include",
      }).catch(() => {});
      window.location.href = `/r/${restaurantSlug}/t/${tableCode}`;
    }, SESSION_TIMEOUT_MS);
    return () => { if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current); };
  }, [customer]);

  // ── Fetch menu ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!context?.restaurant?.slug) return;
    let cancelled = false;
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu-context/context?restaurantSlug=${restaurantSlug}&tableCode=${tableCode}`);
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        const normalized = (data.categories || []).map((cat, ci) => {
          const catRealId = cat._id || cat.id;
          const catKeyId  = catRealId || `cat_${ci}`;
          const items = (cat.items || []).map((item, ii) => {
            const realId = item._id || item.id || item.itemId;
            return { ...item, _id: realId, _keyId: realId || `item_${ci}_${ii}` };
          });
          return { ...cat, _id: catRealId, _keyId: catKeyId, items };
        });
        if (!cancelled) setMenuData(normalized);
      } catch (err) { if (!cancelled) setMenuError(err.message); }
    };
    fetchMenu();
    return () => { cancelled = true; };
  }, [context?.restaurant?.slug, restaurantSlug, tableCode]);

  // ── Auth: check session, then auto guest-login if not linked ─────────────
  useEffect(() => {
    let cancelled = false;
    async function autoLogin() {
      try {
        // 1. Check if session already has a customer
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/me`, { credentials: "include" });
        if (meRes.ok) {
          const data = await meRes.json();
          if (!cancelled) setCustomer(data.customer || null);
          if (!cancelled) setAuthChecked(true);
          return;
        }
        // 2. Not logged in — auto guest login (OTP hidden)
        const guestRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/guest`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (guestRes.ok) {
          const data = await guestRes.json();
          if (!cancelled) setCustomer(data.customer || null);
        } else {
          if (!cancelled) setCustomer(null);
        }
      } catch {
        if (!cancelled) setCustomer(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    if (context?.restaurant?._id) autoLogin();
    return () => { cancelled = true; };
  }, [context?.restaurant?._id]);

  // ── Orders refresh ────────────────────────────────────────────────────────
  async function refreshTableOrders() {
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders/my`, { credentials: "include" });
      const data = await res.json();
      setTableOrders(Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : []);
    } catch { setTableOrders([]); }
  }
  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadingOrders(true);
    refreshTableOrders().finally(() => setLoadingOrders(false));
  }, [activeTab]);

  // ── Order status socket ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "orders") return;
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, { withCredentials: true, transports: ["websocket", "polling"] });
      socketRef.current.on("order_status", ({ order }) => {
        if (!order?._id) return;
        setTableOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: order.status } : o));
      });
    }
    for (const o of tableOrders) {
      const id = o?._id;
      if (!id || joinedOrdersRef.current.has(id)) continue;
      socketRef.current.emit("join_order_room", { orderId: id });
      joinedOrdersRef.current.add(id);
    }
  }, [activeTab, tableOrders]);

  // ── Waiter call ───────────────────────────────────────────────────────────
  async function callWaiter() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: context.restaurant._id || context.restaurant.id, tableId: context.table._id || context.table.id, tableCode: context.table.tableCode, type: "WAITER" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to call waiter");
  }
  function startWaiterCooldown(seconds = WAITER_COOLDOWN_SECONDS) {
    setWaiterCalled(true); setWaiterCooldown(seconds);
    if (waiterCooldownRef.current) clearTimeout(waiterCooldownRef.current);
    if (waiterIntervalRef.current) clearInterval(waiterIntervalRef.current);
    waiterIntervalRef.current = setInterval(() => {
      setWaiterCooldown((prev) => { if (prev <= 1) { clearInterval(waiterIntervalRef.current); waiterIntervalRef.current = null; return 0; } return prev - 1; });
    }, 1000);
    waiterCooldownRef.current = setTimeout(() => { setWaiterCalled(false); setWaiterCooldown(0); waiterCooldownRef.current = null; }, seconds * 1000);
  }

  // ── Bill request ──────────────────────────────────────────────────────────
  async function requestBill() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests/bill`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: context.restaurant._id || context.restaurant.id, tableId: context.table._id || context.table.id, tableCode: context.table.tableCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to request bill");
  }
  function startBillCooldown(ms = BILL_COOLDOWN_MS) {
    setBillRequested(true);
    if (billCooldownTimerRef.current) clearTimeout(billCooldownTimerRef.current);
    billCooldownTimerRef.current = setTimeout(() => { setBillRequested(false); billCooldownTimerRef.current = null; }, ms);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => { setShowFeedback(true); }, 7000);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (waiterCooldownRef.current) clearTimeout(waiterCooldownRef.current);
    if (waiterIntervalRef.current) clearInterval(waiterIntervalRef.current);
    if (billCooldownTimerRef.current) clearTimeout(billCooldownTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
  }, []);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function getItemQty(itemId) { if (!itemId) return 0; const found = cartItems.find((i) => String(i.itemId) === String(itemId)); return found ? found.quantity : 0; }
  function addToCart(item) { setCartItems((prev) => { const ex = prev.find((i) => String(i.itemId) === String(item._id)); if (ex) return prev.map((i) => String(i.itemId) === String(item._id) ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { itemId: item._id, name: item.name, price: item.price, quantity: 1 }]; }); }
  function increaseQty(itemId) { setCartItems((prev) => prev.map((i) => String(i.itemId) === String(itemId) ? { ...i, quantity: i.quantity + 1 } : i)); }
  function decreaseQty(itemId) { setCartItems((prev) => prev.map((i) => String(i.itemId) === String(itemId) ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0)); }
  async function placeOrder() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: context.restaurant._id || context.restaurant.id, tableId: context.table._id || context.table.id, items: cartItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Order failed"); }
      setCartItems([]); setIsCartOpen(false); setActiveTab("orders"); setShowOrderPlacedModal(true);
    } catch (err) { alert(err.message); }
  }

  const cartTotal  = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount  = cartItems.reduce((s, i) => s + i.quantity, 0);
  const filteredMenu = useMemo(() => {
    const q   = search.trim().toLowerCase();
    const cats = Array.isArray(menuData) ? menuData : [];
    const by  = activeCategoryKey === "ALL" ? cats : cats.filter((c) => c._keyId === activeCategoryKey);
    if (!q) return by;
    return by.map((cat) => ({ ...cat, items: (cat.items || []).filter((it) => String(it.name || "").toLowerCase().includes(q)) })).filter((cat) => (cat.items || []).length > 0);
  }, [menuData, search, activeCategoryKey]);

  const waiterProgress = waiterCooldown / WAITER_COOLDOWN_SECONDS;

  // ─── GUARDS ───────────────────────────────────────────────────────────────

  // Show splash for first 3.5s regardless
  if (showSplash) {
    return <SplashScreen restaurantName={context?.restaurant?.name} />;
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"3px solid #2a2520", borderTopColor:"#c9a84c", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"#8a8070", fontSize:14, fontFamily:"sans-serif" }}>Loading menu...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", color:"#f87171", padding:24, textAlign:"center", fontFamily:"sans-serif" }}>{error}</div>;
  if (!authChecked) return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", color:"#8a8070", fontFamily:"sans-serif" }}>
      <div style={{ width:32, height:32, border:"2px solid #2a2520", borderTopColor:"#c9a84c", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // OTP gate hidden — guest session is auto-created above
  // When OTP is re-enabled: uncomment CustomerAuth import and replace the authChecked guard with:
  // if (!customer) return <CustomerAuth ... onSuccess={(cust) => setCustomer(cust)} />;

  if (showFeedback) {
    return (
      <FeedbackScreen
        restaurantName={context?.restaurant?.name || ""}
        grandTotal={null}
        tableCode={tableCode}
        onDone={async () => {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
          window.location.href = `/r/${restaurantSlug}/t/${tableCode}?goodbye=1`;
        }}
      />
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .menu-root{min-height:100vh;background:#0e0e0e;color:#f5f0e8;font-family:'DM Sans',sans-serif;}
        .menu-inner{width:100%;max-width:430px;margin:0 auto;padding:24px 20px 120px;}
        .menu-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;}
        .menu-header-left{flex:1;}
        .menu-venue{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border:1px solid rgba(201,168,76,0.2);border-radius:100px;font-size:11px;color:#c9a84c;background:rgba(201,168,76,0.05);margin-bottom:12px;letter-spacing:0.3px;}
        .menu-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.1;letter-spacing:-0.5px;color:#f5f0e8;}
        .menu-title em{font-style:italic;color:#c9a84c;}
        .menu-welcome{font-size:12px;color:#c9a84c;font-weight:500;margin-top:6px;}
        .menu-avatar{width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(201,168,76,0.3);background:linear-gradient(135deg,#1a1612,#2a2018);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#c9a84c;flex-shrink:0;}
        .search-wrap{position:relative;margin-bottom:24px;}
        .search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#8a8070;}
        .search-input{width:100%;padding:14px 16px 14px 46px;background:rgba(255,255,255,0.04);border:1px solid rgba(245,240,232,0.07);border-radius:16px;color:#f5f0e8;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
        .search-input::placeholder{color:#4a4540;}
        .search-input:focus{border-color:rgba(201,168,76,0.35);box-shadow:0 0 0 3px rgba(201,168,76,0.06);}
        .tab-switcher{display:flex;gap:8px;margin-bottom:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(245,240,232,0.06);border-radius:16px;padding:4px;}
        .tab-btn{flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;border:none;font-family:'DM Sans',sans-serif;color:#8a8070;background:transparent;}
        .tab-btn.active{background:#c9a84c;color:#0e0e0e;box-shadow:0 2px 12px rgba(201,168,76,0.25);}
        .cat-section{margin-bottom:24px;}
        .cat-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a8070;font-weight:500;margin-bottom:12px;}
        .cat-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
        .cat-scroll::-webkit-scrollbar{display:none;}
        .cat-pill{flex-shrink:0;padding:8px 18px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;border:1px solid rgba(245,240,232,0.08);background:rgba(255,255,255,0.03);color:#8a8070;font-family:'DM Sans',sans-serif;}
        .cat-pill.active{background:#c9a84c;color:#0e0e0e;border-color:#c9a84c;box-shadow:0 4px 16px rgba(201,168,76,0.2);}
        .menu-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
        .menu-card{border-radius:20px;overflow:hidden;background:#161410;border:1px solid rgba(245,240,232,0.06);transition:all 0.25s;cursor:default;}
        .menu-card:hover{border-color:rgba(201,168,76,0.15);transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,0.4);}
        .menu-card-img{position:relative;height:130px;overflow:hidden;background:#1a1612;}
        .menu-card-img img{width:100%;height:100%;object-fit:cover;transition:transform 0.5s;}
        .menu-card:hover .menu-card-img img{transform:scale(1.06);}
        .menu-card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.6),transparent);}
        .menu-veg-dot{position:absolute;top:10px;left:10px;width:18px;height:18px;border-radius:3px;border:1.5px solid;display:flex;align-items:center;justify-content:center;background:white;}
        .menu-video-btn{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background 0.2s;}
        .menu-video-btn:hover{background:rgba(0,0,0,0.7);}
        .menu-card-body{padding:12px;}
        .menu-card-name{font-size:13px;font-weight:600;color:#f5f0e8;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .menu-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;}
        .menu-price{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#c9a84c;}
        .add-btn{width:34px;height:34px;border-radius:50%;background:#c9a84c;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
        .add-btn:hover{background:#e8c97a;transform:scale(1.1);}
        .qty-ctrl{display:flex;align-items:center;gap:6px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);border-radius:100px;padding:4px 10px;}
        .qty-btn{background:none;border:none;color:#c9a84c;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;padding:0;}
        .qty-num{font-size:13px;font-weight:700;color:#f5f0e8;min-width:16px;text-align:center;}
        .order-card{background:#161410;border:1px solid rgba(245,240,232,0.06);border-radius:20px;padding:20px;margin-bottom:12px;}
        .order-header{display:flex;justify-content:flex-end;margin-bottom:14px;}
        .order-items{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
        .order-item-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
        .order-item-left{display:flex;align-items:center;gap:6px;flex:1;min-width:0;}
        .order-item-name{font-size:13px;color:#c8bfb0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .order-item-qty{font-size:12px;color:#4a4540;flex-shrink:0;}
        .order-item-price{font-size:13px;font-weight:600;color:#c9a84c;flex-shrink:0;}
        .bottom-bar{position:fixed;bottom:0;left:0;right:0;background:rgba(14,14,14,0.97);backdrop-filter:blur(20px);border-top:1px solid rgba(201,168,76,0.1);padding:16px 20px;z-index:100;}
        .bottom-bar-inner{max-width:430px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:12px;}
        .bottom-bar-hint{font-size:11px;color:#8a8070;letter-spacing:0.3px;}
        .bottom-bar-total{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#c9a84c;}
        .bottom-bar-actions{display:flex;gap:8px;align-items:center;}
        .waiter-btn{display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;border:1px solid rgba(245,240,232,0.1);background:rgba(255,255,255,0.04);color:#f5f0e8;white-space:nowrap;}
        .waiter-btn:hover:not(:disabled){border-color:rgba(201,168,76,0.3);background:rgba(201,168,76,0.06);}
        .waiter-btn:disabled{cursor:not-allowed;}
        .waiter-btn.active{border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);}
        .bill-btn{padding:11px 18px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;border:1px solid rgba(201,168,76,0.3);background:rgba(201,168,76,0.08);color:#c9a84c;white-space:nowrap;}
        .bill-btn:hover:not(:disabled){background:rgba(201,168,76,0.15);}
        .bill-btn.requested{background:#c9a84c;color:#0e0e0e;border-color:#c9a84c;cursor:not-allowed;}
        .cart-float{position:fixed;bottom:90px;right:20px;width:58px;height:58px;border-radius:50%;background:#c9a84c;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(201,168,76,0.4);transition:all 0.2s;z-index:99;}
        .cart-float:hover{background:#e8c97a;transform:scale(1.08);}
        .cart-badge{position:absolute;top:-4px;right:-4px;width:22px;height:22px;background:#0e0e0e;border:1.5px solid #c9a84c;border-radius:50%;font-size:11px;font-weight:700;color:#c9a84c;display:flex;align-items:center;justify-content:center;}
        .empty-state{text-align:center;padding:60px 20px;color:#8a8070;}
        .empty-state p{font-size:15px;color:#c8bfb0;font-weight:500;margin-bottom:6px;}
        .empty-state span{font-size:13px;}
        .skeleton-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
        .skeleton-card{background:#161410;border-radius:20px;height:200px;border:1px solid rgba(245,240,232,0.04);animation:shimmer 1.5s infinite;}
        .skeleton-order{background:#161410;border-radius:20px;height:100px;margin-bottom:12px;animation:shimmer 1.5s infinite;}
        @keyframes shimmer{0%,100%{opacity:0.5;}50%{opacity:1;}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:200;}
        .order-placed-card{position:relative;background:#161410;border:1px solid rgba(201,168,76,0.15);border-radius:28px;padding:48px 36px 36px;text-align:center;max-width:320px;width:100%;}
        .order-placed-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(245,240,232,0.08);color:#8a8070;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all 0.2s;line-height:1;}
        .order-placed-x:hover{background:rgba(255,255,255,0.1);color:#f5f0e8;}
        .order-placed-icon{width:72px;height:72px;background:linear-gradient(135deg,#c9a84c,#e8c97a);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
        .order-placed-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#f5f0e8;margin-bottom:8px;}
        .order-placed-sub{font-size:14px;color:#8a8070;margin-bottom:28px;font-weight:300;}
        .order-placed-btn{width:100%;padding:15px;background:#c9a84c;color:#0e0e0e;border:none;border-radius:14px;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;}
        .order-placed-btn:hover{background:#e8c97a;}
        .video-modal-card{background:#161410;border:1px solid rgba(201,168,76,0.15);border-radius:24px;overflow:hidden;width:100%;max-width:400px;}
        .video-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(245,240,232,0.06);}
        .video-modal-title{font-size:15px;font-weight:600;color:#f5f0e8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:12px;}
        .video-close-btn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.06);border:none;cursor:pointer;color:#f5f0e8;font-size:16px;display:flex;align-items:center;justify-content:center;}
        .video-close-btn:hover{background:rgba(255,255,255,0.1);}
      `}</style>
      <div className="menu-root">
        <div className="menu-inner">
          {/* HEADER */}
          <div className="menu-header">
            <div className="menu-header-left">
              <div className="menu-venue">📍 {context.restaurant.name} · Table {context.table.tableCode}</div>
              <h1 className="menu-title">What are you<br /><em>craving?</em></h1>
              {customer && <p className="menu-welcome">Welcome ✦</p>}
            </div>
            <div className="menu-avatar">🍽️</div>
          </div>
          {/* SEARCH */}
          {activeTab === "menu" && (
            <div className="search-wrap">
              <div className="search-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes..." />
            </div>
          )}
          {/* TABS */}
          <div className="tab-switcher">
            <button className={`tab-btn ${activeTab === "menu" ? "active" : ""}`} onClick={() => setActiveTab("menu")}>Menu</button>
            <button className={`tab-btn ${activeTab === "orders" ? "active" : ""}`} onClick={() => setActiveTab("orders")}>My Orders</button>
          </div>
          {/* CATEGORIES */}
          {activeTab === "menu" && (
            <div className="cat-section">
              <div className="cat-label">Categories</div>
              <div className="cat-scroll">
                {[{ _keyId: "ALL", name: "All" }, ...((Array.isArray(menuData) ? menuData : []).map((c) => ({ _keyId: c._keyId, name: c.name })))].map((c) => (
                  <button key={c._keyId} className={`cat-pill ${activeCategoryKey === c._keyId ? "active" : ""}`} onClick={() => setActiveCategoryKey(c._keyId)}>{c.name}</button>
                ))}
              </div>
            </div>
          )}
          {/* MENU GRID */}
          {activeTab === "menu" && (
            <div>
              {!menuData && !menuError ? (
                <div className="skeleton-grid">{[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton-card" />)}</div>
              ) : Array.isArray(menuData) && menuData.length === 0 ? (
                <div className="empty-state"><p>Menu unavailable</p><span>Check back soon</span></div>
              ) : (
                <div className="menu-grid">
                  {filteredMenu.flatMap((cat) => (cat.items || []).map((item) => (
                    <MenuCard
                      key={item._keyId} item={item}
                      qty={getItemQty(item._id)}
                      onAdd={() => { if (!item._id) return alert("Item id missing."); addToCart(item); }}
                      onInc={() => increaseQty(item._id)}
                      onDec={() => decreaseQty(item._id)}
                      onViewVideo={(url, title) => setVideoModal({ open: true, url, title })}
                    />
                  )))}
                </div>
              )}
              {Array.isArray(filteredMenu) && filteredMenu.length === 0 && menuData?.length > 0 && (
                <div className="empty-state"><p>No matches found</p><span>Try a different keyword</span></div>
              )}
            </div>
          )}
          {/* ORDERS */}
          {activeTab === "orders" && (
            <div>
              {loadingOrders ? (
                [1,2,3].map((i) => <div key={i} className="skeleton-order" />)
              ) : tableOrders.length === 0 ? (
                <div className="empty-state"><p>No orders yet</p><span>Add items from the menu to get started</span></div>
              ) : (
                <>
                  {tableOrders.map((order) => (
                    <div key={order._id} className="order-card">
                      <div className="order-header"><StatusBadge status={order.status} /></div>
                      <div className="order-items">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <div className="order-item-left">
                              <span className="order-item-name">{item.name}</span>
                              <span className="order-item-qty">×{item.quantity}</span>
                            </div>
                            <span className="order-item-price">{moneyINR((item.price || 0) * (item.quantity || 1))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const grand = tableOrders.reduce((sum, order) =>
                      sum + (order.items || []).reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0), 0);
                    if (grand <= 0) return null;
                    return (
                      <div style={{ background:"#161410", border:"1px solid rgba(201,168,76,0.2)", borderRadius:20, padding:"18px 20px", marginTop:4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <span style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:"#8a8070", fontWeight:600 }}>Total Orders</span>
                          <span style={{ fontSize:11, color:"#4a4540" }}>{tableOrders.length} order{tableOrders.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div style={{ height:1, background:"linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginBottom:14 }} />
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:14, color:"#c8bfb0", fontWeight:500 }}>Grand Total</span>
                          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, color:"#c9a84c" }}>{moneyINR(grand)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* CART FLOAT */}
        {activeTab === "menu" && cartItems.length > 0 && !isCartOpen && (
          <button className="cart-float" onClick={() => setIsCartOpen(true)}>
            <svg width="24" height="24" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        )}

        {/* BOTTOM BAR */}
        {activeTab === "menu" && !isCartOpen && (
          <div className="bottom-bar">
            <div className="bottom-bar-inner">
              <div>
                {cartItems.length > 0 ? (
                  <>
                    <div className="bottom-bar-hint">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</div>
                    <div className="bottom-bar-total">{moneyINR(cartTotal)}</div>
                  </>
                ) : (
                  <div className="bottom-bar-hint">Table {context.table.tableCode}</div>
                )}
              </div>
              <div className="bottom-bar-actions">
                <button
                  className={`waiter-btn ${waiterCalled ? "active" : ""}`}
                  disabled={waiterCalled}
                  onClick={async () => {
                    try {
                      const ok = window.confirm(`Call waiter for Table ${context.table.tableCode}?`);
                      if (!ok) return;
                      await callWaiter();
                      startWaiterCooldown();
                    } catch (e) { alert(e?.message || "Failed to call waiter"); }
                  }}
                >
                  {waiterCalled ? (
                    <>
                      <span style={{ position:"relative", width:20, height:20, flexShrink:0 }}>
                        <svg style={{ width:20, height:20, transform:"rotate(-90deg)" }} viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="#1f3028" strokeWidth="2" />
                          <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="#10b981" strokeWidth="2"
                            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - waiterProgress)}
                            strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }} />
                        </svg>
                        <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:700, color:"#10b981" }}>
                          {waiterCooldown >= 60 ? `${Math.floor(waiterCooldown / 60)}m` : `${waiterCooldown}s`}
                        </span>
                      </span>
                      <span style={{ color:"#10b981" }}>Called!</span>
                    </>
                  ) : "🔔 Call Waiter"}
                </button>
                <button
                  className={`bill-btn ${billRequested ? "requested" : ""}`}
                  disabled={billRequested}
                  onClick={async () => {
                    try {
                      const ok = window.confirm(`Request bill for Table ${context.table.tableCode}?`);
                      if (!ok) return;
                      await requestBill();
                      startBillCooldown();
                    } catch (e) { alert(e?.message || "Failed to request bill"); }
                  }}
                >
                  {billRequested ? "✓ Bill Sent" : "💳 Request Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CART DRAWER */}
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart cartItems={cartItems} onIncrease={increaseQty} onDecrease={decreaseQty} onPlaceOrder={placeOrder} cartTotal={cartTotal} cartCount={cartCount} />
        </CartDrawer>

        {/* ORDER PLACED MODAL */}
        {showOrderPlacedModal && (
          <div className="modal-overlay">
            <div className="order-placed-card">
              <button className="order-placed-x" onClick={() => { setShowOrderPlacedModal(false); setActiveTab("menu"); }}>✕</button>
              <div className="order-placed-icon">
                <svg width="32" height="32" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="order-placed-title">Order Placed!</h3>
              <p className="order-placed-sub">Your food is being prepared with care</p>
              <button className="order-placed-btn" onClick={() => setShowOrderPlacedModal(false)}>Track Order →</button>
            </div>
          </div>
        )}

        {/* VIDEO MODAL */}
        {videoModal.open && (
          <div className="modal-overlay" onClick={() => setVideoModal({ open: false, url: "", title: "" })}>
            <div className="video-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="video-modal-header">
                <span className="video-modal-title">{videoModal.title}</span>
                <button className="video-close-btn" onClick={() => setVideoModal({ open: false, url: "", title: "" })}>✕</button>
              </div>
              <div style={{ padding:12 }}>
                <video src={videoModal.url} controls autoPlay playsInline style={{ width:"100%", borderRadius:16, background:"#000" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MenuCard({ item, qty, onAdd, onInc, onDec, onViewVideo }) {
  const img      = getItemImage(item) || "/cold-coffee.jpg";
  const isVeg    = item.isVeg === true;
  const videoUrl = getItemVideo(item);
  return (
    <div className="menu-card">
      <div className="menu-card-img">
        <img src={img} alt={item?.name || "Item"} loading="lazy" onError={(e) => { e.currentTarget.src = "/cold-coffee.jpg"; }} />
        <div className="menu-card-overlay" />
        <div className="menu-veg-dot" style={{ borderColor: isVeg ? "#16a34a" : "#dc2626" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: isVeg ? "#16a34a" : "#dc2626" }} />
        </div>
        {videoUrl && <button className="menu-video-btn" onClick={() => onViewVideo(videoUrl, item?.name || "Video")}>▶</button>}
      </div>
      <div className="menu-card-body">
        <div className="menu-card-name">{item.name}</div>
        <div className="menu-card-footer">
          <span className="menu-price">{moneyINR(item.price)}</span>
          {qty === 0 ? (
            <button className="add-btn" onClick={onAdd}>
              <svg width="16" height="16" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
          ) : (
            <div className="qty-ctrl">
              <button className="qty-btn" onClick={onDec}>−</button>
              <span className="qty-num">{qty}</span>
              <button className="qty-btn" onClick={onInc}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACCEPTED:  { background:"rgba(234,179,8,0.1)",   color:"#eab308", border:"1px solid rgba(234,179,8,0.2)" },
    PREPARING: { background:"rgba(59,130,246,0.1)",  color:"#60a5fa", border:"1px solid rgba(59,130,246,0.2)" },
    SERVED:    { background:"rgba(201,168,76,0.1)",  color:"#c9a84c", border:"1px solid rgba(201,168,76,0.2)" },
    PENDING:   { background:"rgba(255,255,255,0.05)", color:"#8a8070", border:"1px solid rgba(255,255,255,0.06)" },
  };
  const s = styles[status] || styles.PENDING;
  return <span style={{ ...s, padding:"4px 12px", borderRadius:100, fontSize:11, fontWeight:700, letterSpacing:"0.5px" }}>{status}</span>;
}