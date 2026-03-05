"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Cart from "../../../../components/Cart";
import CartDrawer from "../../../../components/CartDrawer";
import { io } from "socket.io-client";
import useMenuContext from "./hooks/useMenuContext";
import CustomerAuth from "../../../../components/CustomerAuth";
import FeedbackScreen from "../../../../components/FeedbackScreen";

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
const BILL_COOLDOWN_MS = 2 * 60 * 1000;
const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ClientMenu({ restaurantSlug, tableCode }) {
  const { loading, error, context } = useMenuContext({ restaurantSlug, tableCode });
  const [menuData, setMenuData] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null); // { grandTotal, restaurantName }
  const [activeTab, setActiveTab] = useState("menu");
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [billRequested, setBillRequested] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("ALL");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [videoModal, setVideoModal] = useState({ open: false, url: "", title: "" });
  const billCooldownTimerRef = useRef(null);
  const socketRef = useRef(null);
  const joinedOrdersRef = useRef(new Set());
  const waiterCooldownRef = useRef(null);
  const waiterIntervalRef = useRef(null);

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
          const catKeyId = catRealId || `cat_${ci}`;
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

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/auth/me`, { credentials: "include" });
        if (res.ok) { const data = await res.json(); if (!cancelled) setCustomer(data.customer || null); }
        else if (!cancelled) setCustomer(null);
      } catch { if (!cancelled) setCustomer(null); }
      finally { if (!cancelled) setAuthChecked(true); }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [context?.restaurant?._id]);

  // ✅ Listen for bill_closed from backend → show feedback screen
  useEffect(() => {
    if (!customer) return;
    let socket;

    async function setupSocket() {
      // ✅ FIX: cookie is httpOnly — can't read from JS
      // Instead fetch sessionId from the session check API
      let sessionId = null;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/session/check`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          sessionId = data?.sessionId || data?.session?.sessionId || null;
        }
      } catch {}

      if (!sessionId) {
        console.warn("[CUSTOMER SOCKET] Could not get sessionId — bill_closed won't work");
        return;
      }

      socket = io(process.env.NEXT_PUBLIC_API_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("[CUSTOMER SOCKET] connected, joining session_" + sessionId);
        socket.emit("join_customer_session", { sessionId });
      });

      socket.on("bill_closed", ({ grandTotal, restaurantName }) => {
        console.log("[CUSTOMER SOCKET] bill_closed received!", { grandTotal });
        setFeedbackData({
          grandTotal,
          restaurantName: restaurantName || context?.restaurant?.name,
        });
      });
    }

    setupSocket();
    return () => { if (socket) socket.disconnect(); };
  }, [customer]);

  async function refreshTableOrders() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders/my`, { credentials: "include" });
      const data = await res.json();
      setTableOrders(Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : []);
    } catch { setTableOrders([]); }
  }

  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadingOrders(true);
    refreshTableOrders().finally(() => setLoadingOrders(false));
  }, [activeTab]);

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
  useEffect(() => () => { if (waiterCooldownRef.current) clearTimeout(waiterCooldownRef.current); if (waiterIntervalRef.current) clearInterval(waiterIntervalRef.current); }, []);

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
  }
  useEffect(() => () => { if (billCooldownTimerRef.current) clearTimeout(billCooldownTimerRef.current); }, []);

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

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const categories = useMemo(() => { const cats = Array.isArray(menuData) ? menuData : []; return [{ _keyId: "ALL", name: "All", items: [] }, ...cats.map((c) => ({ _keyId: c._keyId, name: c.name, items: c.items }))]; }, [menuData]);
  const filteredMenu = useMemo(() => { const q = search.trim().toLowerCase(); const cats = Array.isArray(menuData) ? menuData : []; const by = activeCategoryKey === "ALL" ? cats : cats.filter((c) => c._keyId === activeCategoryKey); if (!q) return by; return by.map((cat) => ({ ...cat, items: (cat.items || []).filter((it) => String(it.name || "").toLowerCase().includes(q)) })).filter((cat) => (cat.items || []).length > 0); }, [menuData, search, activeCategoryKey]);
  const waiterProgress = waiterCooldown / WAITER_COOLDOWN_SECONDS;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"16px" }}>
      <div style={{ width:48, height:48, border:"3px solid #2a2520", borderTopColor:"#c9a84c", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"#8a8070", fontSize:14, fontFamily:"sans-serif" }}>Loading menu...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", color:"#f87171", padding:24, textAlign:"center", fontFamily:"sans-serif" }}>{error}</div>;
  if (!authChecked) return <div style={{ minHeight:"100vh", background:"#0e0e0e", display:"flex", alignItems:"center", justifyContent:"center", color:"#8a8070", fontFamily:"sans-serif" }}>Loading...</div>;
  if (!customer) return <CustomerAuth restaurantName={context?.restaurant?.name} restaurantSlug={restaurantSlug} tableCode={tableCode} onSuccess={(cust) => setCustomer(cust)} />;

  // ✅ Bill closed → show feedback screen, then log out
  if (feedbackData) {
    return (
      <FeedbackScreen
        restaurantName={feedbackData.restaurantName}
        grandTotal={feedbackData.grandTotal}
        tableCode={tableCode}
        onDone={async () => {
          // Clear customer session then redirect to a thank-you page
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

        /* HEADER */
        .menu-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;}
        .menu-header-left{flex:1;}
        .menu-venue{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border:1px solid rgba(201,168,76,0.2);border-radius:100px;font-size:11px;color:#c9a84c;background:rgba(201,168,76,0.05);margin-bottom:12px;letter-spacing:0.3px;}
        .menu-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.1;letter-spacing:-0.5px;color:#f5f0e8;}
        .menu-title em{font-style:italic;color:#c9a84c;}
        .menu-welcome{font-size:12px;color:#c9a84c;font-weight:500;margin-top:6px;}
        .menu-avatar{width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(201,168,76,0.3);background:linear-gradient(135deg,#1a1612,#2a2018);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#c9a84c;flex-shrink:0;}

        /* SEARCH */
        .search-wrap{position:relative;margin-bottom:24px;}
        .search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#8a8070;}
        .search-input{width:100%;padding:14px 16px 14px 46px;background:rgba(255,255,255,0.04);border:1px solid rgba(245,240,232,0.07);border-radius:16px;color:#f5f0e8;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
        .search-input::placeholder{color:#4a4540;}
        .search-input:focus{border-color:rgba(201,168,76,0.35);box-shadow:0 0 0 3px rgba(201,168,76,0.06);}

        /* TABS */
        .tab-switcher{display:flex;gap:8px;margin-bottom:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(245,240,232,0.06);border-radius:16px;padding:4px;}
        .tab-btn{flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;border:none;font-family:'DM Sans',sans-serif;color:#8a8070;background:transparent;}
        .tab-btn.active{background:#c9a84c;color:#0e0e0e;box-shadow:0 2px 12px rgba(201,168,76,0.25);}

        /* CATEGORIES */
        .cat-section{margin-bottom:24px;}
        .cat-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a8070;font-weight:500;margin-bottom:12px;}
        .cat-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
        .cat-scroll::-webkit-scrollbar{display:none;}
        .cat-pill{flex-shrink:0;padding:8px 18px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;border:1px solid rgba(245,240,232,0.08);background:rgba(255,255,255,0.03);color:#8a8070;font-family:'DM Sans',sans-serif;}
        .cat-pill.active{background:#c9a84c;color:#0e0e0e;border-color:#c9a84c;box-shadow:0 4px 16px rgba(201,168,76,0.2);}

        /* MENU GRID */
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

        /* ORDERS */
        .order-card{background:#161410;border:1px solid rgba(245,240,232,0.06);border-radius:20px;padding:20px;margin-bottom:12px;}
        .order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
        .order-id{font-size:12px;color:#8a8070;letter-spacing:0.5px;}
        .order-items{display:flex;flex-direction:column;gap:8px;}
        .order-item-row{display:flex;justify-content:space-between;align-items:center;}
        .order-item-name{font-size:13px;color:#c8bfb0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-right:8px;}
        .order-item-qty{font-size:13px;font-weight:600;color:#f5f0e8;}

        /* BOTTOM BAR */
        .bottom-bar{position:fixed;bottom:0;left:0;right:0;background:rgba(14,14,14,0.97);backdrop-filter:blur(20px);border-top:1px solid rgba(201,168,76,0.1);padding:16px 20px;z-index:100;}
        .bottom-bar-inner{max-width:430px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:12px;}
        .bottom-bar-info{}
        .bottom-bar-hint{font-size:11px;color:#8a8070;letter-spacing:0.3px;}
        .bottom-bar-total{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#c9a84c;}
        .bottom-bar-actions{display:flex;gap:8px;align-items:center;}
        .waiter-btn{display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;border:1px solid rgba(245,240,232,0.1);background:rgba(255,255,255,0.04);color:#f5f0e8;}
        .waiter-btn:hover:not(:disabled){border-color:rgba(201,168,76,0.3);background:rgba(201,168,76,0.06);}
        .waiter-btn:disabled{cursor:not-allowed;}
        .waiter-btn.active{border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);}
        .bill-btn{padding:11px 18px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;border:1px solid rgba(201,168,76,0.3);background:rgba(201,168,76,0.08);color:#c9a84c;}
        .bill-btn:hover:not(:disabled){background:rgba(201,168,76,0.15);}
        .bill-btn.requested{background:#c9a84c;color:#0e0e0e;border-color:#c9a84c;cursor:not-allowed;}

        /* CART FLOAT */
        .cart-float{position:fixed;bottom:90px;right:20px;width:58px;height:58px;border-radius:50%;background:#c9a84c;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(201,168,76,0.4);transition:all 0.2s;z-index:99;}
        .cart-float:hover{background:#e8c97a;transform:scale(1.08);}
        .cart-badge{position:absolute;top:-4px;right:-4px;width:22px;height:22px;background:#0e0e0e;border:1.5px solid #c9a84c;border-radius:50%;font-size:11px;font-weight:700;color:#c9a84c;display:flex;align-items:center;justify-content:center;}

        /* EMPTY */
        .empty-state{text-align:center;padding:60px 20px;color:#8a8070;}
        .empty-state p{font-size:15px;color:#c8bfb0;font-weight:500;margin-bottom:6px;}
        .empty-state span{font-size:13px;}

        /* SKELETONS */
        .skeleton-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
        .skeleton-card{background:#161410;border-radius:20px;height:200px;border:1px solid rgba(245,240,232,0.04);animation:shimmer 1.5s infinite;}
        .skeleton-order{background:#161410;border-radius:20px;height:90px;margin-bottom:12px;animation:shimmer 1.5s infinite;}
        @keyframes shimmer{0%,100%{opacity:0.5;}50%{opacity:1;}}

        /* MODALS */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:200;}
        .order-placed-card{background:#161410;border:1px solid rgba(201,168,76,0.15);border-radius:28px;padding:48px 36px;text-align:center;max-width:320px;width:100%;}
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
              {customer && <p className="menu-welcome">Welcome back, {customer.name} ✦</p>}
            </div>
            <div className="menu-avatar">{customer?.name?.charAt(0)?.toUpperCase() || "U"}</div>
          </div>

          {/* SEARCH */}
          {activeTab === "menu" && (
            <div className="search-wrap">
              <div className="search-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes..." />
            </div>
          )}

          {/* TAB SWITCHER */}
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
                tableOrders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">Order #{order._id.slice(-5).toUpperCase()}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="order-items">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="order-item-row">
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-qty">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* CART FLOAT */}
        {activeTab === "menu" && cartItems.length > 0 && !isCartOpen && (
          <button className="cart-float" onClick={() => setIsCartOpen(true)}>
            <svg width="24" height="24" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        )}

        {/* BOTTOM BAR */}
        {activeTab === "menu" && !isCartOpen && (
          <div className="bottom-bar">
            <div className="bottom-bar-inner">
              <div className="bottom-bar-info">
                {cartItems.length > 0 ? (
                  <>
                    <div className="bottom-bar-hint">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</div>
                    <div className="bottom-bar-total">{moneyINR(cartTotal)}</div>
                  </>
                ) : (
                  <>
                    <div className="bottom-bar-hint">Need help?</div>
                    <div style={{ fontSize: 13, color: "#c8bfb0", fontWeight: 500 }}>We're here for you</div>
                  </>
                )}
              </div>
              <div className="bottom-bar-actions">
                {/* WAITER BTN WITH RING */}
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
                      <span style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
                        <svg style={{ width: 20, height: 20, transform: "rotate(-90deg)" }} viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="#1f3028" strokeWidth="2" />
                          <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="#10b981" strokeWidth="2"
                            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - waiterProgress)}
                            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
                        </svg>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "#10b981" }}>
                          {waiterCooldown >= 60 ? `${Math.floor(waiterCooldown / 60)}m` : `${waiterCooldown}s`}
                        </span>
                      </span>
                      <span style={{ color: "#10b981" }}>Called!</span>
                    </>
                  ) : "🔔 Waiter"}
                </button>

                {/* BILL BTN */}
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
                  {billRequested ? "✓ Bill Sent" : "💳 Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CART DRAWER */}
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <Cart
            cartItems={cartItems}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
            onPlaceOrder={placeOrder}
            cartTotal={cartTotal}
            cartCount={cartCount}
          />
        </CartDrawer>

        {/* ORDER PLACED MODAL */}
        {showOrderPlacedModal && (
          <div className="modal-overlay">
            <div className="order-placed-card">
              <div className="order-placed-icon">
                <svg width="32" height="32" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
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
              <div style={{ padding: 12 }}>
                <video src={videoModal.url} controls autoPlay playsInline style={{ width: "100%", borderRadius: 16, background: "#000" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MenuCard({ item, qty, onAdd, onInc, onDec, onViewVideo }) {
  const img = getItemImage(item) || "/cold-coffee.jpg";
  const isVeg = item.isVeg === true;
  const videoUrl = getItemVideo(item);
  return (
    <div className="menu-card">
      <div className="menu-card-img">
        <img src={img} alt={item?.name || "Item"} loading="lazy" onError={(e) => { e.currentTarget.src = "/cold-coffee.jpg"; }} />
        <div className="menu-card-overlay" />
        <div className="menu-veg-dot" style={{ borderColor: isVeg ? "#16a34a" : "#dc2626" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isVeg ? "#16a34a" : "#dc2626" }} />
        </div>
        {videoUrl && (
          <button className="menu-video-btn" onClick={() => onViewVideo(videoUrl, item?.name || "Video")}>▶</button>
        )}
      </div>
      <div className="menu-card-body">
        <div className="menu-card-name">{item.name}</div>
        <div className="menu-card-footer">
          <span className="menu-price">{moneyINR(item.price)}</span>
          {qty === 0 ? (
            <button className="add-btn" onClick={onAdd}>
              <svg width="16" height="16" fill="none" stroke="#0e0e0e" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
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
    ACCEPTED: { background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)" },
    PREPARING: { background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" },
    SERVED: { background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" },
  };
  const s = styles[status] || { background: "rgba(255,255,255,0.05)", color: "#8a8070", border: "1px solid rgba(255,255,255,0.06)" };
  return <span style={{ ...s, padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>{status}</span>;
}