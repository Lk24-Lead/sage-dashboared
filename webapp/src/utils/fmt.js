export function fmtNum(val, decimals = 0, prefix = '') {
  if (val == null || isNaN(val)) return '—'
  if (decimals === 0) return prefix + Math.round(val).toLocaleString('en-IN')
  return prefix + Number(val).toFixed(decimals)
}

export function fmtL(val) {
  if (val == null || isNaN(val)) return '—'
  return (val / 1e5).toFixed(2) + 'L'
}

export function fmtPct(val, dec = 2) {
  if (val == null || isNaN(val)) return '—'
  return Number(val).toFixed(dec) + '%'
}

// Returns { text, dir } where dir = 'pos' | 'neg' | 'neu' | 'na'
export function fmtChg(val, fmt = 'abs', invert = false) {
  if (val == null || isNaN(val)) return { text: '—', dir: 'na' }
  let text
  if (fmt === 'pct') text = (val >= 0 ? '+' : '') + Number(val).toFixed(1) + '%'
  else if (fmt === 'pp') text = (val >= 0 ? '+' : '') + Number(val).toFixed(2) + 'pp'
  else text = (val >= 0 ? '+' : '') + Number(val).toFixed(2)
  const good = invert ? val < 0 : val > 0
  const bad  = invert ? val > 0 : val < 0
  const dir  = good ? 'pos' : bad ? 'neg' : 'neu'
  return { text, dir }
}
