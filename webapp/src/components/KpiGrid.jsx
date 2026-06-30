import { fmtNum, fmtL, fmtPct, fmtChg } from '../utils/fmt'
import './KpiGrid.css'

const DEMAND = [
  { label: 'Orders',   val: o => fmtNum(o.total_opd),   lw: o => fmtNum(o.lw_opd),        wow: o => o.opd_gr,    fmt: 'pct', invert: false, accent: '#FC8019' },
  { label: 'Sessions', val: o => fmtL(o.sessions),      lw: o => fmtL(o.lw_sessions),      wow: o => o.traffic_gr,fmt: 'pct', invert: false, accent: '#2563EB' },
  { label: 'CVR',      val: o => fmtPct(o.cvr),         lw: o => fmtPct(o.lw_cvr),         wow: o => o.cvr_chg,   fmt: 'pp',  invert: false, accent: '#16A34A' },
  { label: 'AMV',      val: o => fmtNum(o.amv,0,'₹'),   lw: o => fmtNum(o.lw_amv,0,'₹'),   wow: o => o.amv_gr,    fmt: 'pct', invert: false, accent: '#7C3AED' },
  { label: 'OB %',     val: o => fmtPct(o.ob_pct,1),    lw: o => fmtPct(o.lw_ob_pct,1),    wow: o => o.ob_chg,    fmt: 'pp',  invert: true,  accent: '#DC2626' },
]

const COST = [
  { label: 'CDPO',      val: o => fmtNum(o.cdpo_po,2,'₹'),    lw: o => fmtNum(o.lw_cdpo,2,'₹'),   wow: o => o.cdpo_chg,  fmt: 'abs', invert: false, accent: '#D97706' },
  { label: 'SDPO',      val: o => fmtNum(o.sdpo_po,2,'₹'),    lw: o => fmtNum(o.lw_sdpo,2,'₹'),   wow: o => o.sdpo_chg,  fmt: 'abs', invert: false, accent: '#D97706' },
  { label: 'RDPO',      val: o => fmtNum(o.rdpo_po,2,'₹'),    lw: o => fmtNum(o.lw_rdpo,2,'₹'),   wow: o => o.rdpo_chg,  fmt: 'abs', invert: false, accent: '#D97706' },
  { label: 'EC SDPO',   val: o => fmtNum(o.ec_sdpo_po,2,'₹'), lw: o => fmtNum(o.lw_ec,2,'₹'),     wow: o => o.ec_chg,    fmt: 'abs', invert: false, accent: '#6B7280' },
  { label: 'STR Burn',  val: o => fmtNum(o.str_po,2,'₹'),     lw: o => fmtNum(o.lw_str,2,'₹'),    wow: o => o.str_chg,   fmt: 'abs', invert: false, accent: '#6B7280' },
  { label: 'Base Camp', val: o => fmtNum(o.bc,2,'₹'),         lw: o => fmtNum(o.lw_bc,2,'₹'),     wow: o => o.bc_chg,    fmt: 'abs', invert: false, accent: '#0369A1' },
]

function KpiCard({ label, value, lw, wow, wowFmt, invertWow, accent }) {
  const { text, dir } = wow != null ? fmtChg(wow, wowFmt, invertWow) : { text: null, dir: 'na' }
  const arrow = dir === 'pos' ? '▲' : dir === 'neg' ? '▼' : ''
  return (
    <div className="kpi-card" style={{ '--accent': accent }}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        {text && dir !== 'na' && (
          <span className={`kpi-pill kpi-pill-${dir}`}>{arrow} {text}</span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-lw">LW&nbsp; {lw}</div>
    </div>
  )
}

export default function KpiGrid({ overall: o }) {
  if (!o) return null
  return (
    <div className="kpi-grid">
      <div className="kpi-section-label">Demand</div>
      {DEMAND.map(c => (
        <KpiCard key={c.label} label={c.label} value={c.val(o)} lw={c.lw(o)}
          wow={c.wow(o)} wowFmt={c.fmt} invertWow={c.invert} accent={c.accent} />
      ))}
      <div className="kpi-section-label">Discounts &amp; Savings per Order</div>
      {COST.map(c => (
        <KpiCard key={c.label} label={c.label} value={c.val(o)} lw={c.lw(o)}
          wow={c.wow(o)} wowFmt={c.fmt} invertWow={c.invert} accent={c.accent} />
      ))}
    </div>
  )
}
