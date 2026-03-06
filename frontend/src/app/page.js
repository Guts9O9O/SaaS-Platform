"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState({ restaurants: 0, orders: 0, tables: 0 });
  const statsRef = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          animateCount("restaurants", 0, 500, 1800);
          animateCount("orders", 0, 12000, 2000);
          animateCount("tables", 0, 3200, 1600);
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  function animateCount(key, from, to, duration) {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount((prev) => ({ ...prev, [key]: Math.floor(from + (to - from) * ease) }));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --cream: #f5f0e8;
          --dark: #0e0e0e;
          --gold: #c9a84c;
          --gold-light: #e8c97a;
          --warm: #1a1612;
          --muted: #8a8070;
          --surface: #161410;
        }

        body { background: var(--dark); color: var(--cream); font-family: 'DM Sans', sans-serif; overflow-x: hidden; }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 24px 48px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.4s ease;
        }
        .nav.scrolled {
          background: rgba(14,14,14,0.92);
          backdrop-filter: blur(20px);
          padding: 16px 48px;
          border-bottom: 1px solid rgba(201,168,76,0.15);
        }
        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 24px; font-weight: 700;
          color: var(--cream);
          letter-spacing: -0.5px;
        }
        .nav-logo span { color: var(--gold); }
        .nav-links { display: flex; align-items: center; gap: 40px; }
        .nav-links a {
          color: var(--muted); font-size: 14px; font-weight: 400;
          text-decoration: none; letter-spacing: 0.3px;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--cream); }
        .nav-cta {
          padding: 10px 24px;
          background: var(--gold);
          color: var(--dark) !important;
          border-radius: 100px;
          font-weight: 500 !important;
          font-size: 14px !important;
          transition: background 0.2s, transform 0.2s !important;
        }
        .nav-cta:hover { background: var(--gold-light) !important; transform: translateY(-1px); }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(201,168,76,0.04) 0%, transparent 60%);
        }
        .hero-grid {
          position: absolute; inset: 0; opacity: 0.03;
          background-image: linear-gradient(var(--cream) 1px, transparent 1px), linear-gradient(90deg, var(--cream) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px;
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 100px;
          font-size: 12px; font-weight: 500;
          color: var(--gold); letter-spacing: 1.5px; text-transform: uppercase;
          margin-bottom: 32px;
          animation: fadeUp 0.8s ease both;
        }
        .hero-badge::before {
          content: '';
          width: 6px; height: 6px;
          background: var(--gold);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(52px, 8vw, 96px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -2px;
          color: var(--cream);
          margin-bottom: 8px;
          animation: fadeUp 0.8s 0.1s ease both;
        }
        .hero-title-italic {
          font-style: italic;
          color: var(--gold);
        }
        .hero-title-line2 {
          display: block;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .hero-sub {
          max-width: 520px;
          font-size: 17px; font-weight: 300;
          color: var(--muted);
          line-height: 1.7;
          margin: 32px auto 48px;
          animation: fadeUp 0.8s 0.3s ease both;
        }
        .hero-actions {
          display: flex; align-items: center; gap: 16px; justify-content: center;
          flex-wrap: wrap;
          animation: fadeUp 0.8s 0.4s ease both;
        }
        .btn-primary {
          padding: 16px 36px;
          background: var(--gold);
          color: var(--dark);
          border-radius: 100px;
          font-size: 15px; font-weight: 500;
          text-decoration: none;
          transition: all 0.25s;
          letter-spacing: 0.2px;
        }
        .btn-primary:hover { background: var(--gold-light); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(201,168,76,0.25); }
        .btn-secondary {
          padding: 16px 36px;
          border: 1px solid rgba(245,240,232,0.15);
          color: var(--cream);
          border-radius: 100px;
          font-size: 15px; font-weight: 400;
          text-decoration: none;
          transition: all 0.25s;
          display: flex; align-items: center; gap: 10px;
        }
        .btn-secondary:hover { border-color: rgba(245,240,232,0.35); background: rgba(245,240,232,0.04); }
        .btn-arrow { font-size: 18px; transition: transform 0.2s; }
        .btn-secondary:hover .btn-arrow { transform: translateX(4px); }

        /* SCROLL INDICATOR */
        .scroll-hint {
          position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          color: var(--muted); font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          animation: fadeUp 1s 0.8s ease both;
        }
        .scroll-line {
          width: 1px; height: 48px;
          background: linear-gradient(to bottom, var(--gold), transparent);
          animation: scrollDrop 1.5s ease infinite;
        }
        @keyframes scrollDrop {
          0% { transform: scaleY(0); transform-origin: top; opacity: 0; }
          50% { transform: scaleY(1); transform-origin: top; opacity: 1; }
          100% { transform: scaleY(1); transform-origin: bottom; opacity: 0; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* STATS */
        .stats {
          padding: 80px 48px;
          border-top: 1px solid rgba(245,240,232,0.06);
          border-bottom: 1px solid rgba(245,240,232,0.06);
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0;
        }
        .stat-item {
          text-align: center; padding: 40px 24px;
          border-right: 1px solid rgba(245,240,232,0.06);
        }
        .stat-item:last-child { border-right: none; }
        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 700; color: var(--gold);
          line-height: 1; margin-bottom: 8px;
        }
        .stat-label { font-size: 13px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; font-weight: 400; }

        /* FEATURES */
        .features { padding: 120px 48px; max-width: 1200px; margin: 0 auto; }
        .section-label {
          font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          color: var(--gold); font-weight: 500; margin-bottom: 20px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 700; line-height: 1.1;
          letter-spacing: -1px; color: var(--cream);
          max-width: 480px; margin-bottom: 80px;
        }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
        .feature-card {
          background: var(--surface);
          padding: 40px 36px;
          border: 1px solid rgba(245,240,232,0.05);
          transition: all 0.3s;
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover { border-color: rgba(201,168,76,0.15); background: #1a1814; }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width: 48px; height: 48px;
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 24px;
          background: rgba(201,168,76,0.05);
        }
        .feature-title { font-size: 17px; font-weight: 500; color: var(--cream); margin-bottom: 12px; }
        .feature-desc { font-size: 14px; color: var(--muted); line-height: 1.7; font-weight: 300; }

        /* HOW IT WORKS */
        .how { padding: 120px 48px; background: var(--surface); }
        .how-inner { max-width: 1000px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 80px; position: relative; }
        .steps::before {
          content: '';
          position: absolute; top: 28px; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
        }
        .step { text-align: center; padding: 0 16px; }
        .step-num {
          width: 56px; height: 56px;
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          font-family: 'Playfair Display', serif;
          font-size: 20px; color: var(--gold);
          background: var(--surface);
          position: relative; z-index: 1;
        }
        .step-title { font-size: 15px; font-weight: 500; color: var(--cream); margin-bottom: 10px; }
        .step-desc { font-size: 13px; color: var(--muted); line-height: 1.6; font-weight: 300; }

        /* CTA */
        .cta-section {
          padding: 160px 48px;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: '';
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(40px, 5vw, 72px);
          font-weight: 900; line-height: 1;
          letter-spacing: -2px; color: var(--cream);
          margin-bottom: 24px;
        }
        .cta-sub { font-size: 16px; color: var(--muted); margin-bottom: 48px; font-weight: 300; }

        /* FOOTER */
        .footer {
          border-top: 1px solid rgba(245,240,232,0.06);
          padding: 48px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 20px;
        }
        .footer-logo {
          font-family: 'Playfair Display', serif;
          font-size: 20px; color: var(--cream); font-weight: 700;
        }
        .footer-logo span { color: var(--gold); }
        .footer-links { display: flex; gap: 32px; }
        .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: var(--cream); }
        .footer-copy { font-size: 12px; color: var(--muted); }

        @media (max-width: 768px) {
          .nav { padding: 20px 24px; }
          .nav.scrolled { padding: 14px 24px; }
          .nav-links { display: none; }
          .stats { grid-template-columns: 1fr; }
          .stat-item { border-right: none; border-bottom: 1px solid rgba(245,240,232,0.06); }
          .features { padding: 80px 24px; }
          .features-grid { grid-template-columns: 1fr; }
          .how { padding: 80px 24px; }
          .steps { grid-template-columns: repeat(2, 1fr); gap: 40px; }
          .steps::before { display: none; }
          .footer { flex-direction: column; align-items: flex-start; padding: 40px 24px; }
          .cta-section { padding: 100px 24px; }
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-logo">Dine<span>Flow</span></div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <Link href="/admin/login" className="nav-cta">Admin Login</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-badge">QR-Powered Restaurant Platform</div>
        <h1 className="hero-title">
          The Future of<br />
          <span className="hero-title-italic">Dining</span>
          <span className="hero-title-line2"> Is Here</span>
        </h1>
        <p className="hero-sub">
          Give your guests a seamless digital dining experience. QR menus, live order tracking, waiter calls — all in one elegant platform.
        </p>
        <div className="hero-actions">
          <Link href="/admin/login" className="btn-primary">Get Started</Link>
          <Link href="/super-admin/login" className="btn-secondary">
            Super Admin <span className="btn-arrow">→</span>
          </Link>
        </div>
        <div className="scroll-hint">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef} className="stats">
        <div className="stat-item">
          <div className="stat-number">{count.restaurants.toLocaleString()}+</div>
          <div className="stat-label">Restaurants</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{count.orders.toLocaleString()}+</div>
          <div className="stat-label">Orders Processed</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{count.tables.toLocaleString()}+</div>
          <div className="stat-label">Tables Active</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-label">Why DineFlow</div>
        <h2 className="section-title">Everything your restaurant needs</h2>
        <div className="features-grid">
          {[
            { icon: "📱", title: "QR Menu", desc: "Customers scan and browse your full menu instantly. No app download required." },
            { icon: "🔔", title: "Waiter Calls", desc: "One tap to call a waiter or request the bill. Reduce wait times effortlessly." },
            { icon: "📦", title: "Live Orders", desc: "Kitchen receives orders instantly. Track status from pending to served in real time." },
            { icon: "🎬", title: "Video Menu", desc: "Showcase your dishes with video previews that make customers hungry before they order." },
            { icon: "🔐", title: "Secure Auth", desc: "OTP-based customer login, JWT admin sessions, and per-table session isolation." },
            { icon: "📊", title: "Analytics", desc: "Track revenue, popular items, and table performance from one dashboard." },
          ].map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="how-inner">
          <div className="section-label">Simple Setup</div>
          <h2 className="section-title">Live in minutes</h2>
          <div className="steps">
            {[
              { n: "01", title: "Add Restaurant", desc: "Register via super admin panel in under 2 minutes." },
              { n: "02", title: "Create Tables", desc: "Add tables and generate unique QR codes for each." },
              { n: "03", title: "Build Menu", desc: "Add categories, items, images and videos easily." },
              { n: "04", title: "Go Live", desc: "Customers scan QR, order, and you manage everything live." },
            ].map((s) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to transform<br /><em style={{fontFamily:"'Playfair Display',serif", color:"var(--gold)"}}>your restaurant?</em></h2>
        <p className="cta-sub">Join hundreds of restaurants already using DineFlow.</p>
        <Link href="/admin/login" className="btn-primary" style={{fontSize:"16px", padding:"18px 48px"}}>
          Start Now — It's Free
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">Dine<span>Flow</span></div>
        <div className="footer-links">
          <Link href="/admin/login">Admin</Link>
          <Link href="/super-admin/login">Super Admin</Link>
          <Link href="/waiter/login">Waiter</Link>
        </div>
        <div className="footer-copy">© 2026 DineFlow. All rights reserved.</div>
      </footer>
    </>
  );
}