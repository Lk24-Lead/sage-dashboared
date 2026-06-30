import { useState, useEffect, useCallback } from 'react'
import HourlyTable from './components/HourlyTable'
import StatePage from './pages/StatePage'
import CityPage from './pages/CityPage'
import './App.css'

const REFRESH_MS = 30 * 60 * 1000

const CLUSTERS = [
  { key: 'india_next', label: 'India Next' },
  { key: 'india_2',    label: 'India 2' },
  { key: 'india_3',    label: 'India 3' },
  { key: 'india_1',    label: 'India 1' },
]

export default function App({ onBack }) {
  const [page, setPage]           = useState('dashboard')
  const [cluster, setCluster]     = useState('india_next')
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_MS)
  const [pageLoading, setPageLoading] = useState(false)

  const refreshPage = useCallback(async (pageKey) => {
    setPageLoading(true)
    try {
      await fetch(`/api/refresh?cluster=${cluster}`, { method: 'POST' })
    } catch(e) { /* ignore */ }
    setTimeout(() => setPageLoading(false), 2000)
  }, [cluster])

  const fetchData = useCallback(async (cl = cluster, forceRefresh = false, prevGeneratedAt = null) => {
    setLoading(true)
    setError(null)
    try {
      if (forceRefresh) {
        await fetch(`/api/refresh?cluster=${cl}`, { method: 'POST' })
      }
      const res = await fetch(`/api/data?cluster=${cl}`)
      if (res.status === 202) {
        setTimeout(() => fetchData(cl, false, prevGeneratedAt), 15000)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const json = await res.json()
      // If we forced a refresh, keep polling until generated_at actually changes
      if (forceRefresh && prevGeneratedAt && json.generated_at === prevGeneratedAt) {
        setTimeout(() => fetchData(cl, false, prevGeneratedAt), 15000)
        return
      }
      setData(json)
      setLastFetch(new Date())
      setCountdown(REFRESH_MS)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [cluster])

  useEffect(() => {
    fetchData(cluster)
    const interval = setInterval(() => fetchData(cluster), REFRESH_MS)
    return () => clearInterval(interval)
  }, [cluster])

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => Math.max(0, c - 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

  const mins = String(Math.floor(countdown / 60000)).padStart(2, '0')
  const secs = String(Math.floor((countdown % 60000) / 1000)).padStart(2, '0')

  return (
    <div className="app">
      {/* ── Hero banner — all pages ── */}
      <div className="dashboard-hero">
        <div className="hero-left">
          <img src="/swiggy-brand.jfif" alt="Swiggy" className="hero-logo" />
          <span className="hero-logo-text">Swiggy</span>
          <span className="hero-logo-sep">|</span>
          <div className="hero-title">
            {page === 'dashboard' ? 'Hr Level Performance' : page === 'state' ? 'State Level Performance' : 'City Level Performance'}
          </div>
        </div>
        <div className="hero-right">
          {page === 'dashboard' && (
            <>
              {loading ? <span className="hero-spinner" /> : <span className={`hero-dot${error ? ' error' : ''}`} />}
              {data      && <span className="hero-stat">Live up to <strong>H{data.latest_hr}</strong></span>}
              {lastFetch && <span className="hero-stat">{lastFetch.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>}
              <span className="hero-countdown">⟳ {mins}:{secs}</span>
              <button className="hero-btn" onClick={() => fetchData(cluster, true, data?.generated_at)}>Refresh</button>
            </>
          )}
          {page !== 'dashboard' && (
            <>
              {pageLoading ? <span className="hero-spinner" /> : <span className="hero-dot" />}
              <button className="hero-btn" onClick={() => refreshPage(page)} disabled={pageLoading}>
                {pageLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Sub-bar ── */}
      <div className="sub-bar">
        <div className="sub-bar-left">
          {onBack && (
            <button className="sub-back" onClick={onBack} title="Back to home">← Home</button>
          )}
          {onBack && <span className="sub-bar-sep" />}
          <button className={`sub-tab${page === 'dashboard' ? ' active' : ''}`} onClick={() => setPage('dashboard')}>Hour Level</button>
          <button className={`sub-tab${page === 'state'     ? ' active' : ''}`} onClick={() => setPage('state')}>State View</button>
          <button className={`sub-tab${page === 'city'      ? ' active' : ''}`} onClick={() => setPage('city')}>City View</button>
        </div>
        <div className="sub-bar-right">
          <span className="sub-bar-label">Cluster</span>
          {CLUSTERS.map(c => (
            <button
              key={c.key}
              className={`cluster-btn${cluster === c.key ? ' active' : ''}`}
              onClick={() => setCluster(c.key)}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* ── Dashboard page ── */}
      <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
        <div className="page">
          {error && (
            <div className="error-banner">
              <strong>Query failed:</strong> {error}
              <button onClick={() => fetchData(cluster)} className="btn-retry">Retry</button>
            </div>
          )}
          {loading && data && (
            <div style={{ height: 3, background: 'var(--or)', borderRadius: 2, marginBottom: 8,
              animation: 'progress-bar 1.5s ease-in-out infinite' }} />
          )}
          {data && (
            <>
              <div className="sec-head"><h2>Hour-level Breakdown &mdash; TW vs LW</h2></div>
              <div style={{padding: '0 40px'}}>
                <HourlyTable hourly={data.hourly} overall={data.overall} latestHr={data.latest_hr} />
              </div>
              <div className="footer">
                <strong>Swiggy</strong> · SAGE OS Food Analytics · {CLUSTERS.find(c=>c.key===cluster)?.label} · Excl. Toing · Generated {data.generated_at}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── State page ── */}
      <div style={{ display: page === 'state' ? 'block' : 'none' }}>
        <StatePage cluster={cluster} />
      </div>

      {/* ── City page ── */}
      <div style={{ display: page === 'city' ? 'block' : 'none' }}>
        <CityPage cluster={cluster} />
      </div>

    </div>
  )
}
