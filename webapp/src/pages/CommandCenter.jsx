import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  LayoutDashboard, MapPin, Building2, Settings, Bell,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  RefreshCw, ChevronDown, Activity, Zap, Package,
  Clock, ShoppingBag, Bike, Star, Filter, X
} from 'lucide-react'

// ─── Swiggy Brand Colors ────────────────────────────────────────────────────
const OR = '#FC8019'
const OR_LIGHT = '#FFF0E6'

// ─── Mock Data Engine ────────────────────────────────────────────────────────
const STATES = ['All States', 'Tamil Nadu', 'Kerala', 'Karnataka', 'Maharashtra', 'Gujarat', 'Punjab', 'Rajasthan', 'Bihar', 'UP', 'MP & CG']

const CITIES_BY_STATE = {
  'All States': ['All Cities', 'Chennai', 'Thiruvananthapuram', 'Bengaluru', 'Mumbai', 'Surat', 'Ludhiana', 'Jaipur', 'Patna', 'Meerut', 'Bhopal'],
  'Tamil Nadu': ['All Cities', 'Chennai', 'Madurai', 'Coimbatore', 'Tirupati'],
  'Kerala': ['All Cities', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kottayam'],
  'Karnataka': ['All Cities', 'Bengaluru', 'Mysore', 'Mangaluru', 'Hubli'],
  'Maharashtra': ['All Cities', 'Mumbai', 'Pune', 'Nashik', 'Aurangabad'],
  'Gujarat': ['All Cities', 'Surat', 'Vadodara', 'Rajkot', 'Ahmedabad'],
  'Punjab': ['All Cities', 'Ludhiana', 'Jalandhar', 'Amritsar', 'Patiala'],
  'Rajasthan': ['All Cities', 'Jaipur', 'Kota', 'Udaipur', 'Jodhpur'],
  'Bihar': ['All Cities', 'Patna', 'Gaya', 'Ranchi', 'Bhagalpur'],
  'UP': ['All Cities', 'Meerut', 'Agra', 'Lucknow', 'Kanpur'],
  'MP & CG': ['All Cities', 'Bhopal', 'Indore', 'Raipur', 'Jabalpur'],
}

// Seed-based number generator for consistent mock data per city
function seed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return Math.abs(h)
}
function seededRand(s, min, max) {
  const x = Math.sin(s) * 10000
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
}

function getMockData(state, city, hour) {
  const key = `${state}-${city}-${hour}`
  const s = seed(key)
  const orders = seededRand(s, 800, 8000)
  const toing = seededRand(s + 1, 50, 400)
  const swiggy = orders - toing
  const cdpo = seededRand(s + 2, 70, 160)
  const sdpo = seededRand(s + 3, 12, 50)
  const rdpo = cdpo - sdpo
  const cvr = (seededRand(s + 4, 60, 95) / 10).toFixed(1)
  return { orders, toing, swiggy, cdpo, sdpo, rdpo: Math.max(rdpo, 20), cvr }
}

function getHourlyTrend(state, city) {
  return Array.from({ length: 24 }, (_, h) => {
    const d = getMockData(state, city, h)
    const peak = h >= 11 && h <= 14 || h >= 19 && h <= 22
    return {
      hr: `H${h}`,
      orders: d.orders,
      toing: d.toing,
      swiggy: d.swiggy,
      fulfilled: Math.floor(d.orders * (peak ? 0.82 : 0.93)),
      cdpo: d.cdpo,
    }
  })
}

function getCityRows(state, city, hour) {
  const cityList = city === 'All Cities'
    ? CITIES_BY_STATE[state]?.slice(1) ?? []
    : [city]
  return cityList.map(c => {
    const d = getMockData(state, c, hour)
    const wow = seededRand(seed(c), -12, 28)
    const toing_wow = seededRand(seed(c + '1'), -8, 42)
    const status = d.orders > 5000 ? 'CRITICAL' : d.orders > 3000 ? 'WARNING' : 'NORMAL'
    return { city: c, ...d, wow, toing_wow, status }
  })
}

const LIVE_QUEUE_STATUSES = [
  { label: 'Waiting for Driver', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  { label: 'Food Prepared — Delayed Pickup', color: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  { label: 'Driver Assigned', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  { label: 'Out for Delivery', color: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  { label: 'Payment Pending', color: 'bg-red-500/20 text-red-300 border border-red-500/30' },
]

function getLiveQueue(city, count = 12) {
  const s = seed(city)
  return Array.from({ length: count }, (_, i) => {
    const si = s + i * 7
    const statusIdx = seededRand(si, 0, 4)
    const backlog = seededRand(si + 1, 1, 18)
    const cities = city === 'All Cities'
      ? ['Patna', 'Surat', 'Thiruvananthapuram', 'Ludhiana', 'Bhopal', 'Mysore'][i % 6]
      : city
    return {
      id: `SW${(si % 9000000 + 1000000)}`,
      city: cities,
      backlog,
      restaurant: ['Domino\'s', 'Burger King', 'McDonald\'s', 'Pizza Hut', 'KFC', 'Subway', 'Haldiram\'s', 'Biryani Blues'][si % 8],
      status: LIVE_QUEUE_STATUSES[statusIdx],
      amt: seededRand(si + 2, 180, 1200),
    }
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, trend, trendLabel, color = 'orange', sparkData }) {
  const positive = trend >= 0
  const colorMap = {
    orange: 'from-orange-500/10 to-orange-500/5 border-orange-500/20',
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
  }
  const iconColor = { orange: 'text-orange-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400' }
  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${colorMap[color]} border p-5 flex flex-col gap-3 overflow-hidden`}>
      {/* Glow dot */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${color === 'orange' ? 'bg-orange-500' : color === 'green' ? 'bg-green-500' : color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`} />
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl bg-slate-800/60 ${iconColor[color]}`}>
          <Icon size={18} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {positive ? '+' : ''}{trend}%
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {/* Mini sparkline */}
      <div className="h-10 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color === 'orange' ? '#FC8019' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#a855f7'} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color === 'orange' ? '#FC8019' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#a855f7'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color === 'orange' ? '#FC8019' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#a855f7'} strokeWidth={1.5} fill={`url(#sg-${color})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    CRITICAL: 'bg-red-500/20 text-red-300 border border-red-500/30',
    WARNING: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    NORMAL: 'bg-green-500/20 text-green-300 border border-green-500/30',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status]}`}>{status}</span>
}

function Dropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg hover:border-orange-500/50 transition-colors min-w-[140px] justify-between"
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${value === o ? 'text-orange-400 bg-slate-700/50' : 'text-slate-300'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function CommandCenter() {
  const [selState, setSelState] = useState('All States')
  const [selCity, setSelCity]   = useState('All Cities')
  const [selHour, setSelHour]   = useState(13)
  const [refresh, setRefresh]   = useState(30)
  const [activePage, setActivePage] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  // Reset city when state changes
  const handleStateChange = (s) => { setSelState(s); setSelCity('All Cities') }

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setRefresh(r => {
        if (r <= 1) { setRefreshKey(k => k + 1); return 30 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const cityList = CITIES_BY_STATE[selState] ?? CITIES_BY_STATE['All States']
  const data = getMockData(selState, selCity, selHour)
  const hourlyData = getHourlyTrend(selState, selCity)
  const cityRows = getCityRows(selState, selCity, selHour)
  const liveQueue = getLiveQueue(selCity)

  // Sparkline data (last 7 hours)
  const sparkOrders = Array.from({ length: 7 }, (_, i) => ({ v: getMockData(selState, selCity, selHour - 6 + i).orders }))
  const sparkToing  = Array.from({ length: 7 }, (_, i) => ({ v: getMockData(selState, selCity, selHour - 6 + i).toing }))
  const sparkCdpo   = Array.from({ length: 7 }, (_, i) => ({ v: getMockData(selState, selCity, selHour - 6 + i).cdpo }))
  const sparkCvr    = Array.from({ length: 7 }, (_, i) => ({ v: parseFloat(getMockData(selState, selCity, selHour - 6 + i).cvr) }))

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Live Dashboard' },
    { id: 'geo', icon: MapPin, label: 'Geo View' },
    { id: 'ops', icon: Building2, label: 'Ops Health' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  const totalPeakHr = hourlyData.reduce((a, b) => a.orders > b.orders ? a : b)

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-16 lg:w-56 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 transition-all">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: OR }}>
            <Zap size={16} className="text-white" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-bold text-white leading-none">India Next</p>
            <p className="text-xs text-slate-500">Command Center</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActivePage(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                ${activePage === id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              style={activePage === id ? { background: `${OR}22`, color: OR } : {}}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </button>
          ))}
        </nav>

        {/* Live indicator */}
        <div className="p-4 border-t border-slate-800 hidden lg:block">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live · refreshes in {refresh}s
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3 px-6 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm shrink-0 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">Swiggy Food — Live Ops</h1>
            <p className="text-xs text-slate-500">H{selHour} snapshot · {selState} · {selCity}</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-500" />
            <Dropdown label="State" options={STATES} value={selState} onChange={handleStateChange} />
            <Dropdown label="City" options={cityList} value={selCity} onChange={setSelCity} />
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <Clock size={13} className="text-slate-400" />
              <span className="text-xs text-slate-400">H</span>
              <input type="range" min={0} max={23} value={selHour} onChange={e => setSelHour(+e.target.value)}
                className="w-24 accent-orange-500" />
              <span className="text-xs font-mono text-orange-400 w-5">{selHour}</span>
            </div>
            <button onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-orange-500/50 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={11} /> Systems OK
            </span>
            <button className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* ── Scrollable Body ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Hero KPI Cards ─────────────────────────────────────────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={ShoppingBag} label="Total Orders (H{selHour})" value={data.orders.toLocaleString()}
              sub={`Swiggy ${data.swiggy.toLocaleString()} · Toing ${data.toing.toLocaleString()}`}
              trend={seededRand(seed(selCity), -5, 18)} color="orange" sparkData={sparkOrders} />
            <MetricCard icon={Zap} label="Toing Orders" value={data.toing.toLocaleString()}
              sub={`${((data.toing / data.orders) * 100).toFixed(1)}% of total`}
              trend={seededRand(seed(selCity + 't'), -3, 35)} color="purple" sparkData={sparkToing} />
            <MetricCard icon={Star} label="CDPO (₹)" value={`₹${data.cdpo}`}
              sub={`SDPO ₹${data.sdpo} · RDPO ₹${data.rdpo}`}
              trend={seededRand(seed(selCity + 'c'), -4, 12)} color="blue" sparkData={sparkCdpo} />
            <MetricCard icon={Activity} label="Conv. Rate" value={`${data.cvr}%`}
              sub={`Peak hr: H${totalPeakHr.hr.replace('H', '')} — ${totalPeakHr.orders.toLocaleString()} orders`}
              trend={seededRand(seed(selCity + 'v'), -2, 8)} color="green" sparkData={sparkCvr} />
          </section>

          {/* ── Central Grid ───────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Left — City/State Table */}
            <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-white">City Performance</h2>
                  <p className="text-xs text-slate-500">{selState} · H{selHour}</p>
                </div>
                <span className="text-xs text-slate-500">{cityRows.length} cities</span>
              </div>
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left px-5 py-2 font-medium">City</th>
                      <th className="text-right px-3 py-2 font-medium">Orders</th>
                      <th className="text-right px-3 py-2 font-medium">WoW</th>
                      <th className="text-right px-3 py-2 font-medium">Toing WoW</th>
                      <th className="text-right px-5 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityRows.map(row => (
                      <tr key={row.city} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-200">{row.city}</td>
                        <td className="px-3 py-3 text-right text-slate-300">{row.orders.toLocaleString()}</td>
                        <td className={`px-3 py-3 text-right font-semibold ${row.wow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.wow >= 0 ? '+' : ''}{row.wow}%
                        </td>
                        <td className={`px-3 py-3 text-right font-semibold ${row.toing_wow >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {row.toing_wow >= 0 ? '+' : ''}{row.toing_wow}%
                        </td>
                        <td className="px-5 py-3 text-right">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right — Hourly Trend Chart */}
            <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">24-Hour Order Trend</h2>
                  <p className="text-xs text-slate-500">Swiggy vs Toing vs Fulfilled</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" />Swiggy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 inline-block rounded" />Toing</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-400 inline-block rounded" />Fulfilled</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSwiggy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FC8019" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FC8019" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gToing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFulfilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hr" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="swiggy" stroke="#FC8019" strokeWidth={2} fill="url(#gSwiggy)" dot={false} />
                  <Area type="monotone" dataKey="toing" stroke="#a855f7" strokeWidth={2} fill="url(#gToing)" dot={false} />
                  <Area type="monotone" dataKey="fulfilled" stroke="#22c55e" strokeWidth={1.5} fill="url(#gFulfilled)" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── CDPO Breakdown Bar ─────────────────────────────────────────── */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">CDPO Breakdown by Hour</h2>
                <p className="text-xs text-slate-500">SDPO (Swiggy) + RDPO (Restaurant) stacked</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hr" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="cdpo" name="CDPO (₹)" fill={OR} radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ── Live Order Queue ───────────────────────────────────────────── */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">Live Order Queue</h2>
                <span className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{liveQueue.filter(q => q.backlog > 10).length} delayed orders</span>
                <AlertTriangle size={13} className="text-amber-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900/95">
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left px-5 py-3 font-medium">Order ID</th>
                    <th className="text-left px-3 py-3 font-medium">City</th>
                    <th className="text-left px-3 py-3 font-medium">Restaurant</th>
                    <th className="text-right px-3 py-3 font-medium">Amount</th>
                    <th className="text-right px-3 py-3 font-medium">Backlog</th>
                    <th className="text-left px-5 py-3 font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {liveQueue.map(order => (
                    <tr key={order.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${order.backlog > 12 ? 'bg-red-500/3' : ''}`}>
                      <td className="px-5 py-3 font-mono text-orange-400 font-semibold">{order.id}</td>
                      <td className="px-3 py-3 text-slate-300">{order.city}</td>
                      <td className="px-3 py-3 text-slate-400">{order.restaurant}</td>
                      <td className="px-3 py-3 text-right text-slate-300">₹{order.amt}</td>
                      <td className={`px-3 py-3 text-right font-bold ${order.backlog > 12 ? 'text-red-400' : order.backlog > 8 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {order.backlog}m
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.status.color}`}>
                          {order.status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom padding */}
          <div className="h-4" />
        </main>
      </div>
    </div>
  )
}
