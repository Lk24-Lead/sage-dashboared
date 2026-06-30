import { Fragment } from 'react'
import { fmtNum, fmtL, fmtPct, fmtChg } from '../utils/fmt'
import './HourlyTable.css'

const HR_GROUPS = [
  { label: 'Late Night', hours: [0,1,2,3,4,5] },
  { label: 'Morning',    hours: [6,7,8,9,10,11] },
  { label: 'Lunch',      hours: [12,13,14] },
  { label: 'Afternoon',  hours: [15,16,17] },
  { label: 'Dinner',     hours: [18,19,20,21,22,23] },
]

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i)
const SEP_HOURS = new Set([6, 12, 15, 18])

function Chg({ val, fmt = 'abs', invert = false }) {
  const { text, dir } = fmtChg(val, fmt, invert)
  return <span className={`chg ${dir}`}>{text}</span>
}

const METRICS = [
  {
    key: 'orders', label: 'Orders',
    tw:    r => fmtNum(r.total_opd),
    lw:    r => fmtNum(r.lw_opd),
    delta: r => <Chg val={r.opd_gr} fmt="pct" />,
  },
  {
    key: 'sessions', label: 'Sessions',
    tw:    r => r.sessions    != null ? fmtL(r.sessions)    : <span className="na">—</span>,
    lw:    r => r.lw_sessions != null ? fmtL(r.lw_sessions) : <span className="na">—</span>,
    delta: r => r.traffic_gr  != null ? <Chg val={r.traffic_gr} fmt="pct" /> : <span className="na">—</span>,
  },
  {
    key: 'cvr', label: 'CVR',
    tw:    r => r.cvr     != null ? fmtPct(r.cvr)    : <span className="na">—</span>,
    lw:    r => r.lw_cvr  != null ? fmtPct(r.lw_cvr) : <span className="na">—</span>,
    delta: r => r.cvr_chg != null ? <Chg val={r.cvr_chg} fmt="pp" /> : <span className="na">—</span>,
  },
  {
    key: 'ob', label: 'OB%',
    tw:    r => fmtPct(r.ob_pct, 1),
    lw:    r => fmtPct(r.lw_ob_pct, 1),
    delta: r => <Chg val={r.ob_chg} fmt="pp" invert />,
  },
  {
    key: 'amv', label: 'AMV',
    tw:    r => fmtNum(r.amv, 0, '₹'),
    lw:    r => fmtNum(r.lw_amv, 0, '₹'),
    delta: r => <Chg val={r.amv_gr} fmt="pct" />,
  },
  {
    key: 'cdpo', label: 'CDPO',
    tw:    r => fmtNum(r.cdpo_po, 2, '₹'),
    lw:    r => fmtNum(r.lw_cdpo, 2, '₹'),
    delta: r => <Chg val={r.cdpo_chg} fmt="abs" />,
  },
  {
    key: 'sdpo', label: 'SDPO',
    tw:    r => fmtNum(r.sdpo_po, 2, '₹'),
    lw:    r => fmtNum(r.lw_sdpo, 2, '₹'),
    delta: r => <Chg val={r.sdpo_chg} fmt="abs" />,
  },
  {
    key: 'rdpo', label: 'RDPO',
    tw:    r => fmtNum(r.rdpo_po, 2, '₹'),
    lw:    r => fmtNum(r.lw_rdpo, 2, '₹'),
    delta: r => <Chg val={r.rdpo_chg} fmt="abs" />,
  },
  {
    key: 'ec', label: 'EC',
    tw:    r => fmtNum(r.ec_sdpo_po, 2, '₹'),
    lw:    r => fmtNum(r.lw_ec,      2, '₹'),
    delta: r => <Chg val={r.ec_chg} fmt="abs" />,
  },
  {
    key: 'str', label: 'STR',
    tw:    r => fmtNum(r.str_po, 2, '₹'),
    lw:    r => fmtNum(r.lw_str, 2, '₹'),
    delta: r => <Chg val={r.str_chg} fmt="abs" />,
  },
  {
    key: 'bc', label: 'Base Camp',
    tw:    r => fmtNum(r.bc,    2, '₹'),
    lw:    r => fmtNum(r.lw_bc, 2, '₹'),
    delta: r => <Chg val={r.bc_chg} fmt="abs" />,
  },
]

function Cell({ r, fn, cls }) {
  if (!r) return <td className={cls}><span className="na">—</span></td>
  return <td className={cls}>{fn(r)}</td>
}

export default function HourlyTable({ hourly, overall, latestHr }) {
  const byHr = Object.fromEntries(hourly.map(r => [parseInt(r.hr), r]))

  return (
    <div className="tbl-card">
      <div className="tbl-scroll">
        <table>
          <colgroup>
            <col style={{width:'100px'}} />
            <col style={{width:'40px'}} />
            <col style={{width:'76px'}} />
            {ALL_HOURS.map(h => <col key={h} style={{width:'56px'}} />)}
          </colgroup>
          <thead>
            <tr className="thead-groups">
              <th className="th-metric">Metric</th>
              <th className="th-sub"></th>
              <th className="th-overall sep">Overall</th>
              {ALL_HOURS.map(h => (
                <th key={h} className={SEP_HOURS.has(h) ? 'sep' : undefined}>
                  H{h}{latestHr != null && h === latestHr && <span className="partial-tag">~</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m, mi) => (
              <Fragment key={m.key}>
                <tr className="row-tw">
                  <td rowSpan={3} className="sticky-metric">{m.label}</td>
                  <td className="sticky-sub">TW</td>
                  <Cell r={overall} fn={m.tw} cls="td-overall sep" />
                  {ALL_HOURS.map(h => (
                    <Cell key={h} r={byHr[h]} fn={m.tw} cls={SEP_HOURS.has(h) ? 'sep' : undefined} />
                  ))}
                </tr>
                <tr className="row-lw">
                  <td className="sticky-sub sub-lw">LW</td>
                  <Cell r={overall} fn={m.lw} cls="td-overall sep row-lw-cell" />
                  {ALL_HOURS.map(h => (
                    <Cell key={h} r={byHr[h]} fn={m.lw} cls={`row-lw-cell${SEP_HOURS.has(h) ? ' sep' : ''}`} />
                  ))}
                </tr>
                <tr className="row-delta">
                  <td className="sticky-sub sub-delta">Δ</td>
                  <Cell r={overall} fn={m.delta} cls="td-overall sep" />
                  {ALL_HOURS.map(h => (
                    <Cell key={h} r={byHr[h]} fn={m.delta} cls={SEP_HOURS.has(h) ? 'sep' : undefined} />
                  ))}
                </tr>
                {mi < METRICS.length - 1 && (
                  <tr className="row-spacer">
                    <td className="spacer-metric" />
                    <td className="spacer-sub" />
                    <td className="spacer-overall" />
                    {ALL_HOURS.map(h => <td key={h} />)}
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tbl-legend">
        <span><b>CDPO</b> = Cart Disc + Rest Disc Hit + Swiggy Disc Hit</span>
        <span><b>SDPO</b> = Swiggy Disc + Swiggy Disc Hit + Alliance Disc</span>
        <span><b>RDPO</b> = Rest Disc Hit + Rest Offers Disc</span>
        <span><b>Base Camp</b> = SWGDISCOUNT − STR</span>
        <span><b>OB%</b> = banner_factor &gt; 1.6</span>
        <span><b>~</b> = partial hour</span>
      </div>
    </div>
  )
}
