import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import './StatePage.css'

const REFRESH_MS = 30 * 60 * 1000

const CLUSTERS = [
  { key: 'india_next', label: 'India Next' },
  { key: 'india_2',    label: 'India 2' },
  { key: 'india_3',    label: 'India 3' },
  { key: 'india_1',    label: 'India 1' },
]

const GROWTH_KEYS = new Set(['orders', 'sessions'])
const PP_KEYS     = new Set(['cvr', 'oc_pct'])

const METRICS = [
  { key: 'orders',    label: 'Orders',    fmt: v => v == null ? '—' : Number(v).toLocaleString('en-IN'), invert: false },
  { key: 'sessions',  label: 'Traffic',   fmt: v => v == null ? '—' : Number(v).toLocaleString('en-IN'), invert: false },
  { key: 'cvr',       label: 'CVR%',      fmt: v => v == null ? '—' : Number(v).toFixed(2) + '%',        invert: false },
  { key: 'oc_pct',    label: 'OC%',       fmt: v => v == null ? '—' : Number(v).toFixed(1) + '%',        invert: true  },
  { key: 'cdpo',      label: 'CDPO',      fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'rdpo',      label: 'RDPO',      fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'sdpo',      label: 'SDPO',      fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'ephemeral', label: 'Ephemeral', fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'str',       label: 'STR Burn',  fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'ec',        label: 'EC',        fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
  { key: 'camp',      label: 'Campaign',  fmt: v => v == null ? '—' : '₹' + Number(v).toFixed(2),        invert: false },
]
const EC_KEYS = new Set(['ephemeral','str','ec','camp'])

function grpClass(key) {
  if (key === 'orders')                                   return 'g-orders'
  if (key === 'sessions' || key === 'cvr')                return 'g-traffic'
  if (key === 'oc_pct')                                   return 'g-quality'
  if (key === 'cdpo' || key === 'rdpo' || key === 'sdpo') return 'g-discount'
  return 'g-ec'
}

function fmtDelta(val, key, invert) {
  if (val == null) return <span className="chg na">—</span>
  const n = Number(val)
  if (Math.abs(n) < 0.005) return <span className="chg neu">0</span>
  const good = invert ? n < 0 : n > 0
  const cls  = good ? 'chg pos' : 'chg neg'
  const sign = n > 0 ? '+' : ''
  if (GROWTH_KEYS.has(key)) return <span className={cls}>{sign}{n.toFixed(1)}%</span>
  if (PP_KEYS.has(key))     return <span className={cls}>{sign}{n.toFixed(2)} pp</span>
  return <span className={cls}>{sign}₹{Math.abs(n).toFixed(2)}{n < 0 ? '' : ''}</span>
}

// ── Multi-select dropdown ────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(x => x !== val))
    else onChange([...selected, val])
  }
  const allSelected = selected.length === 0

  const displayLabel = allSelected
    ? `All ${label}s`
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${label}s`

  return (
    <div className="ms-wrap" ref={ref}>
      <div className="ms-trigger" onClick={() => setOpen(o => !o)}>
        <span className="ms-label-tag">{label}</span>
        <span className="ms-value">{displayLabel}</span>
        <span className="ms-chevron">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="ms-dropdown">
          <div
            className={`ms-option${allSelected ? ' selected' : ''}`}
            onClick={() => { onChange([]); setOpen(false) }}
          >
            <span className="ms-check">{allSelected ? '✓' : ''}</span> All {label}s
          </div>
          <div className="ms-divider" />
          {options.map(opt => (
            <div
              key={opt}
              className={`ms-option${selected.includes(opt) ? ' selected' : ''}`}
              onClick={() => toggle(opt)}
            >
              <span className="ms-check">{selected.includes(opt) ? '✓' : ''}</span> {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Filter bar ───────────────────────────────────────────────────
function FilterBar({ states, selectedStates, onStates, hours, selectedHrs, onHrs, showHr, metricOptions, activeMetric, onMetric, lastFetch, loading, onRefresh }) {
  return (
    <div className="filter-bar">
      {metricOptions && (
        <div className="filter-view-wrap">
          <span className="ms-label-tag">View</span>
          <div className="ftb-select-wrap">
            <select className="ftb-select filter-metric-select" value={activeMetric} onChange={e => onMetric(e.target.value)}>
              {metricOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <span className="ftb-chevron">▾</span>
          </div>
        </div>
      )}
      <div className="filter-bar-sep" />
      <MultiSelect
        label="State"
        options={states}
        selected={selectedStates}
        onChange={onStates}
      />
      {showHr && (
        <MultiSelect
          label="Hour"
          options={hours.map(h => `H${h}`)}
          selected={selectedHrs.map(h => `H${h}`)}
          onChange={vals => onHrs(vals.map(v => parseInt(v.replace('H',''))))}
        />
      )}
    </div>
  )
}

// ── Summary table ────────────────────────────────────────────────
function SummaryTable({ summary, states, hours, hourly, metricOptions, activeMetric, onMetric, lastFetch, loading, onRefresh }) {
  const [sortKey, setSortKey]     = useState('tw_orders')
  const [sortDir, setSortDir]     = useState('desc')
  const [selStates, setSelStates] = useState([])
  const [selHrs, setSelHrs]       = useState([])

  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  let rows = summary
  if (selStates.length) rows = rows.filter(r => selStates.includes(r.state))

  if (selHrs.length) {
    rows = (selStates.length ? selStates : states).map(state => {
      const stateHrs = (hourly[state] || []).filter(h => selHrs.includes(h.hr))
      if (!stateHrs.length) return null
      const sumKey = (getter) => stateHrs.reduce((a, h) => a + (getter(h) ?? 0), 0)
      const twOrd  = sumKey(h => h.tw.orders)
      const lwOrd  = sumKey(h => h.lw.orders)
      const twSess = sumKey(h => h.tw.sessions)
      const lwSess = sumKey(h => h.lw.sessions)
      const twCvr  = twSess ? stateHrs.reduce((a,h) => a + (h.tw.cvr ?? 0) * (h.tw.sessions ?? 0), 0) / twSess : null
      const lwCvr  = lwSess ? stateHrs.reduce((a,h) => a + (h.lw.cvr ?? 0) * (h.lw.sessions ?? 0), 0) / lwSess : null
      const metricDelta = (twV, lwV, key) => {
        if (twV == null || lwV == null) return null
        if (GROWTH_KEYS.has(key)) return lwV ? round2((twV - lwV) / lwV * 100) : null
        return round2(twV - lwV)
      }
      const build = (k, twV, lwV) => ({
        [`tw_${k}`]: twV == null ? null : round2(twV),
        [`lw_${k}`]: lwV == null ? null : round2(lwV),
        [`d_${k}`]:  metricDelta(twV, lwV, k)
      })
      return {
        state,
        ...build('orders',  twOrd,  lwOrd),
        ...build('sessions', twSess, lwSess),
        tw_cvr: twCvr ? round2(twCvr) : null,
        lw_cvr: lwCvr ? round2(lwCvr) : null,
        d_cvr:  twCvr && lwCvr ? round2(twCvr - lwCvr) : null,
        ...build('oc_pct', null, null),
      }
    }).filter(Boolean)
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
    const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  function SortTh({ col, label, cls }) {
    const active = sortKey === col
    return (
      <th className={cls} onClick={() => toggleSort(col)}>
        {label}<span className="sort-icon">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </th>
    )
  }

  return (
    <>
      <FilterBar states={states} selectedStates={selStates} onStates={setSelStates}
                 hours={hours} selectedHrs={selHrs} onHrs={setSelHrs} showHr
                 metricOptions={metricOptions} activeMetric={activeMetric} onMetric={onMetric}
                 lastFetch={lastFetch} loading={loading} onRefresh={onRefresh} />
      <div className="state-tbl-card">
        <div className="tbl-scroll">
          <table className="state-tbl">
            <thead>
              <tr className="thead-groups">
                <th className="th-state" rowSpan={2}>State</th>
                {METRICS.map(m => (
                  <th key={m.key} className={`sep ${grpClass(m.key)}`} colSpan={3}>{m.label}</th>
                ))}
              </tr>
              <tr className="thead-sub">
                {METRICS.map(m => (
                  <Fragment key={m.key}>
                    <SortTh col={`tw_${m.key}`} label="TW"    cls="sep" />
                    <SortTh col={`lw_${m.key}`} label="LW"    cls="lw-th" />
                    <SortTh col={`d_${m.key}`}  label="Δ"     cls="delta-th" />
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.state || i}>
                  <td className="sticky-col td-state">{r.state || '—'}</td>
                  {METRICS.map(m => {
                    const ec = EC_KEYS.has(m.key)
                    return (
                      <Fragment key={m.key}>
                        <td className={`sep tw-val${ec ? ' ec-col' : ''}`}>{m.fmt(r[`tw_${m.key}`])}</td>
                        <td className={`lw${ec ? ' ec-col' : ''}`}>{m.fmt(r[`lw_${m.key}`])}</td>
                        <td className={ec ? 'ec-col' : ''}>{fmtDelta(r[`d_${m.key}`], m.key, m.invert)}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tbl-legend">
          <span><b>Orders / Traffic Δ</b> = growth %</span>
          <span><b>CVR Δ</b> = pp</span>
          <span><b>Discount Δ</b> = ₹ abs · red = worse</span>
          <span><b>Ephemeral</b> = SwgDiscount − STR</span>
        </div>
      </div>
    </>
  )
}

// ── Pivot table ──────────────────────────────────────────────────
function round2(x) { return Math.round(x * 100) / 100 }

function PivotTable({ metric, states, hours, hourly, metricOptions, activeMetric, onMetric, lastFetch, loading, onRefresh }) {
  const m = METRICS.find(x => x.key === metric) || METRICS[0]
  const [selStates, setSelStates] = useState([])

  const visStates = selStates.length ? states.filter(s => selStates.includes(s)) : states

  function heatClass(val, stateRows) {
    if (val == null || !stateRows.length) return ''
    const vals = stateRows.map(h => h.tw[m.key]).filter(v => v != null && v > 0)
    if (!vals.length) return ''
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    if (avg === 0) return ''
    const diff = val - avg
    if (Math.abs(diff) < avg * 0.05) return ''
    if (m.invert) return diff > 0 ? 'heat-bad' : 'heat-good'
    return diff > 0 ? 'heat-good' : 'heat-bad'
  }

  return (
    <>
      <FilterBar states={states} selectedStates={selStates} onStates={setSelStates}
                 hours={[]} selectedHrs={[]} onHrs={() => {}} showHr={false}
                 metricOptions={metricOptions} activeMetric={activeMetric} onMetric={onMetric}
                 lastFetch={lastFetch} loading={loading} onRefresh={onRefresh} />
      <div className="state-tbl-card">
        <div className="pivot-header">
          <span className="pivot-title">{m.label} &mdash; State × Hour &nbsp;<span className="pivot-sub">TW · LW · Delta</span></span>
          <span className="pivot-hint">Shading = vs state's own hourly avg</span>
        </div>
        <div className="tbl-scroll">
          <table className="state-tbl pivot-tbl">
            <thead>
              <tr className="thead-groups">
                <th className="th-state" rowSpan={2}>State</th>
                {hours.map(hr => (
                  <th key={hr} className={`sep ${grpClass(m.key)}`} colSpan={3}>H{hr}</th>
                ))}
              </tr>
              <tr className="thead-sub">
                {hours.map(hr => (
                  <Fragment key={hr}>
                    <th className="sep">TW</th>
                    <th className="lw-th">LW</th>
                    <th className="delta-th">Δ</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {visStates.map(state => {
                const stateRows = hourly[state] || []
                return (
                  <tr key={state}>
                    <td className="sticky-col td-state">{state}</td>
                    {hours.map(hr => {
                      const row = stateRows.find(h => h.hr === hr)
                      const tw  = row?.tw[m.key] ?? null
                      const lw  = row?.lw[m.key] ?? null
                      let   d   = null
                      if (tw != null && lw != null) {
                        d = GROWTH_KEYS.has(m.key) && lw
                          ? round2((tw - lw) / lw * 100)
                          : round2(tw - lw)
                      }
                      const heat = heatClass(tw, stateRows)
                      return (
                        <Fragment key={hr}>
                          <td className={`sep tw-val ${heat}`}>{m.fmt(tw)}</td>
                          <td className="lw">{m.fmt(lw)}</td>
                          <td>{fmtDelta(d, m.key, m.invert)}</td>
                        </Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function StatePage({ cluster = 'india_next' }) {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [activeMetric, setActiveMetric] = useState('summary')

  const fetchData = useCallback(async (cl) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/state-data?cluster=${cl}`)
      if (res.status === 202) {
        setTimeout(() => fetchData(cl), 15000)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      setData(await res.json())
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(cluster)
    const iv = setInterval(() => fetchData(cluster), REFRESH_MS)
    return () => clearInterval(iv)
  }, [cluster])

  const metricOptions = [{ key: 'summary', label: 'Summary (All Metrics)' }, ...METRICS]

  return (
    <div className="state-page">
      {/* Content */}
      <div className="state-content">
        {error && (
          <div className="error-banner">
            <strong>Query failed:</strong> {error}
            <button onClick={() => fetchData(cluster)} className="btn-retry">Retry</button>
          </div>
        )}
        {loading && !data && (
          <div className="loading-state">
            <div className="spinner-lg" />
            <p>Querying Databricks…</p>
            <p className="hint">State-level query takes ~45s on first load</p>
          </div>
        )}
        {loading && data && (
          <div style={{ height: 3, background: 'var(--or)', borderRadius: 2, marginBottom: 8,
            animation: 'progress-bar 1.5s ease-in-out infinite' }} />
        )}

        {data && activeMetric === 'summary' && (
          <SummaryTable summary={data.summary} states={data.states} hours={data.hours} hourly={data.hourly}
            metricOptions={metricOptions} activeMetric={activeMetric} onMetric={setActiveMetric}
            lastFetch={lastFetch} loading={loading} onRefresh={() => fetchData(cluster)} />
        )}
        {data && activeMetric !== 'summary' && (
          <PivotTable metric={activeMetric} states={data.states} hours={data.hours} hourly={data.hourly}
            metricOptions={metricOptions} activeMetric={activeMetric} onMetric={setActiveMetric}
            lastFetch={lastFetch} loading={loading} onRefresh={() => fetchData(cluster)} />
        )}

        {data && (
          <div className="footer">
            <strong>Swiggy</strong> · SAGE OS · {CLUSTERS.find(c => c.key === cluster)?.label} State View · {data.generated_at}
          </div>
        )}
      </div>
    </div>
  )
}
