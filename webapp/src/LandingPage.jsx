import './LandingPage.css'

const APPS = [
  {
    key: 'food',
    name: 'Swiggy Food',
    sub: 'India Next · Live Performance',
    offer: 'Real-time Analytics',
    img: '/food-splash.jfif',
  },
  {
    key: 'toing',
    name: 'Toing',
    sub: 'Loyalty · Rewards · Retention',
    offer: 'Coming Soon',
    img: '/toing-rider.png',
    disabled: true,
  },
]

export default function LandingPage({ onSelect }) {
  return (
    <div className="landing">

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <img src="/swiggy-brand.jfif" alt="Swiggy" className="nav-logo-img" />
          <span className="nav-logo-text">Swiggy</span>
        </div>
        <button className="nav-btn-solid">Sign in</button>
      </nav>

      {/* ── Hero ── */}
      <div className="landing-hero">
        <div className="hero-toing-bg" />
        <div className="hero-food-bg" />
        {/* Headline */}
        <h1 className="hero-headline">
          Swiggy &amp; Toing — Live Performance.
        </h1>

        {/* Cards + Toing side image */}
        <div className="landing-cards-row">
          <div className="landing-cards">
          {APPS.map(app => (
            <button
              key={app.key}
              className={`lc${app.disabled ? ' lc-disabled' : ''}`}
              onClick={() => !app.disabled && onSelect(app.key)}
            >
              <div className="lc-text">
                <div className="lc-name">{app.name}</div>
                <div className="lc-tagline">{app.sub}</div>
                <div className="lc-offer">{app.offer}</div>
              </div>
              <img src={app.img} alt="" className={`lc-food-img${app.key === 'toing' ? ' lc-mascot-img' : ''}`} />
              <div className="lc-arrow">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-left">
          <img src="/swiggy-brand.jfif" alt="Swiggy" className="footer-logo" />
          <span className="footer-brand">Swiggy</span>
        </div>
        <div className="footer-mid">
          <span>SAGE Analytics Platform</span>
          <span>·</span>
          <span>Food Business India Next Team</span>
          <span>·</span>
          <span>Internal Use Only</span>
        </div>
        <div className="footer-right">
          © 2026 Swiggy
        </div>
      </footer>

    </div>
  )
}
