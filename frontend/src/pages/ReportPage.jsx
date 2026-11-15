import { useId, useState } from 'react'
import Footer from '../components/Footer'
import './ReportPage.css'
import SAMPLE_REPORT from "../data/FReport_Multiple_disease.json";

// Demo only. Pass the real backend response as <ReportPage report={response} />.
const STATUS = { high_risk: 'High risk', caution: 'Caution', suitable: 'Suitable' }
const format = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value) : '—'
const TITLES = { pm25: 'PM2.5', hot_days: 'Days per year at or above 95°F', heavy_rain_days: 'Days per year with at least 0.8 in of rain', dry_days: 'Very dry days per year' }
const AGES = { '65_plus': 'Adults 65+', '18_64': 'Adults 18–64', children: 'Children' }
const CONDITIONS = { asthma_copd: 'asthma / COPD', asthma: 'asthma', copd: 'COPD' }

// Put your exported PNG assets in public/images/people/, or edit these URLs.
const PERSON_ASSETS = {
  '65_plus': ['/images/people/senior-man.png', '/images/people/senior-woman.png'],
  '18_64': ['/images/people/adult-man.png', '/images/people/adult-woman.png'],
  teens: ['/images/people/teen-boy.png', '/images/people/teen-girl.png'],
  children: ['/images/people/child-boy.png', '/images/people/child-girl.png'],
}

function getAvatarGroup(value) {
  const text = String(value ?? '').toLowerCase().trim()
  if (/65|senior|elder|older/.test(text)) return '65_plus'
  if (/teen|13.?17/.test(text)) return 'teens'
  if (/child|0.?12/.test(text)) return 'children'
  if (/adult|18.?64/.test(text)) return '18_64'
  return null
}

function PersonAvatar({ ageGroup, assets }) {
  // Decorative variant only: this does not assign gender to the user's profile.
  const [variant] = useState(() => Math.random())
  const [failedSrc, setFailedSrc] = useState(null)
  const candidates = assets[getAvatarGroup(ageGroup)] || []
  const src = candidates.length ? candidates[Math.floor(variant * candidates.length)] : null
  return <span className="report-avatar" aria-hidden="true">
    {src && src !== failedSrc
      ? <img src={src} alt="" onError={() => setFailedSrc(src)} />
      : <svg viewBox="0 0 64 80" fill="none"><circle cx="32" cy="23" r="16" fill="#ddd9ed" /><path d="M6 78V65a26 26 0 0 1 52 0v13" fill="#a99bc9" /></svg>}
  </span>
}

function TrendChart({ factor }) {
  const id = useId().replace(/:/g, '')
  const [hover, setHover] = useState(null)
  const points = (factor.points || []).filter(p => Number.isFinite(p.value))
  if (!points.length) return <p>No historical data available for this factor.</p>
  const W = 560, H = 270, left = 48, right = 12, top = 24, bottom = 38
  const limit = factor.limits?.high_from
  const hasLimit = Number.isFinite(limit)
  const values = points.map(p => p.value)
  const min = Math.min(0, ...values)
  const max = Math.max(...values, hasLimit ? limit : 0, min + 1) * 1.12
  const x = i => left + (points[i].year - points[0].year) * (W - left - right) / Math.max(1, points[points.length - 1].year - points[0].year)
  const y = v => top + (max - v) / (max - min) * (H - top - bottom)
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ')
  const active = hover === null ? null : points[hover]
  return <>
    <svg className="report-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${factor.label}, annual history. Unit: ${factor.unit}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#11c8ff" stopOpacity=".24" /><stop offset="1" stopColor="#11c8ff" stopOpacity="0" /></linearGradient></defs>
      {[0,1,2,3,4].map(i => { const v = min + (max - min) * i / 4; return <g key={i}><line x1={left} x2={W-right} y1={y(v)} y2={y(v)} stroke="#ffffff0b" /><text x={left-10} y={y(v)+4} textAnchor="end">{format(v)}</text></g> })}
      <path d={`${path} L ${x(points.length-1)} ${y(min)} L ${x(0)} ${y(min)} Z`} fill={`url(#${id})`} />
      {hasLimit && <line x1={left} x2={W-right} y1={y(limit)} y2={y(limit)} stroke="#f04459" strokeWidth="2" strokeDasharray="6 4" />}
      <path d={path} fill="none" stroke="#14c9ff" strokeWidth="2" />
      {points.map((p,i) => <g key={p.year}>
        {(i === 0 || i === points.length-1 || i % 5 === 0) && <text x={x(i)} y={H-10} textAnchor="middle">{p.year}</text>}
        <circle cx={x(i)} cy={y(p.value)} r="8" fill="transparent" tabIndex="0" aria-label={`${p.year}: ${format(p.value)} ${factor.unit}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}><title>{p.year}: {format(p.value)} {factor.unit}</title></circle>
      </g>)}
      {active && <g pointerEvents="none"><circle cx={x(hover)} cy={y(active.value)} r="4" fill="#fff" /><text x={Math.max(130,Math.min(W-130,x(hover)))} y="14" textAnchor="middle">{active.year}: {format(active.value)} {factor.unit_short || factor.unit}</text></g>}
    </svg>
    <div className="report-chart-legend"><span>Annual value · {factor.unit}</span>{hasLimit && <span className="report-limit">High risk cutoff: {format(limit)} · {factor.limits.high_source || factor.limits.source}</span>}</div>
  </>
}


const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_UNITS = {
  hot_days: 'days / month', warm_nights: 'nights / month', cold_days: 'days / month',
  heavy_rain_days: 'days / month', dry_days: 'days / month', muggy_days: 'days / month',
  wettest_day: 'mm in one day (monthly maximum)', pm25: 'µg/m³ (monthly mean)',
  no2: '×10¹⁵ molecules/cm² (monthly mean)', fires: 'fire detections / month',
  surface_heat: '°C (monthly daytime land surface)', heat_island: '°C vs surrounding area (monthly mean)',
}

function getComparisonYears(factor) {
  const monthlyYears = [...new Set((factor.monthly || [])
    .filter(p => /^\d{4}-\d{2}$/.test(p.month) && Number.isFinite(p.value))
    .map(p => Number(p.month.slice(0, 4))))].sort((a, b) => a - b)
  const annualYears = (factor.points || []).filter(p => Number.isFinite(p.value)).map(p => p.year)
  const years = monthlyYears.length ? monthlyYears : [...new Set(annualYears)].sort((a, b) => a - b)
  if (!years.length) return []
  const latest = years[years.length - 1]
  return years.filter(year => latest - year <= 20)
}

function getMonthlyValues(factor, year) {
  return MONTH_NAMES.map((_, i) => {
    const key = String(year) + '-' + String(i + 1).padStart(2, '0')
    const point = (factor.monthly || []).find(p => p.month === key && Number.isFinite(p.value))
    return point ? point.value : null
  })
}

function MonthlyComparison({ factor, selectedYear, latestYear }) {
  const earlier = getMonthlyValues(factor, selectedYear)
  const latest = getMonthlyValues(factor, latestYear)
  const unit = MONTH_UNITS[factor.key] || factor.unit_short || factor.unit
  if (![...earlier, ...latest].some(v => v !== null)) {
    return <div className="report-monthly-empty"><p>Monthly comparison unavailable.</p><p>This factor needs monthly records from the backend. Annual values remain available in the line chart.</p></div>
  }
  const W = 560, H = 270, left = 48, right = 12, top = 24, bottom = 38
  const values = [...earlier, ...latest].filter(v => v !== null)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values, min + 1) + Math.max(1, Math.max(...values) - min) * .12
  const y = v => top + (max - v) / (max - min) * (H - top - bottom)
  const step = (W - left - right) / 12
  const barWidth = Math.min(14, step * .29)
  return <>
    <div className="report-monthly-legend"><span><i />{selectedYear}</span><span><i />{latestYear} · Latest data</span></div>
    <svg className="report-monthly-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${factor.label}, monthly comparison of ${selectedYear} and ${latestYear}, ${unit}`}>
      {[0, 1, 2, 3, 4].map(i => {
        const value = min + (max - min) * i / 4
        return <g key={i}><line x1={left} x2={W - right} y1={y(value)} y2={y(value)} stroke="#ffffff10" /><text x={left - 8} y={y(value) + 4} textAnchor="end">{format(value)}</text></g>
      })}
      <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke="#ffffff30" />
      {MONTH_NAMES.map((month, i) => {
        const center = left + step * (i + .5)
        return <g key={month}>
          {[earlier[i], latest[i]].map((value, series) => value === null
            ? <text key={series} x={center + (series ? barWidth / 2 + 1 : -barWidth / 2 - 1)} y={H - bottom + 12} textAnchor="middle">–</text>
            : <rect key={series} x={center + (series ? 1 : -barWidth - 1)} y={Math.min(y(0), y(value))} width={barWidth} height={Math.abs(y(value) - y(0))} rx="1.5" fill={series ? '#69a8ff' : '#8f9bb0'} tabIndex="0" aria-label={`${month} ${series ? latestYear : selectedYear}: ${format(value)} ${unit}`}><title>{month} {series ? latestYear : selectedYear}: {format(value)} {unit}</title></rect>)}
          <text x={center} y={H - 10} textAnchor="middle">{month}</text>
        </g>
      })}
    </svg>
    <p className="report-chart-unit">Monthly values · {unit}</p>
    <p className="report-comparison-caption">Gray: {selectedYear}. Blue: {latestYear}. Hover or focus a bar for its value. A dash indicates missing data.</p>
  </>
}

function HistoryCharts({ factor }) {
  const years = getComparisonYears(factor)
  const latestYear = years[years.length - 1]
  const [chosen, setChosen] = useState(years[0])
  if (!years.length) return <p>No historical data available.</p>
  const earlierYears = years.filter(year => year < latestYear)
  const selectedYear = earlierYears.includes(chosen) ? chosen : (earlierYears[0] ?? latestYear)
  const visiblePoints = (factor.points || []).filter(p => p.year >= selectedYear && p.year <= latestYear)
  const before = visiblePoints.find(p => p.year === selectedYear)
  const now = visiblePoints.find(p => p.year === latestYear)
  const delta = before && now ? now.value - before.value : null
  const noThreshold = !Number.isFinite(factor.limits?.high_from)
  return <>
    <div className="report-history-grid">
      <div className="report-history-panel">
        <h3>Annual trend</h3>
        <TrendChart key={selectedYear} factor={{ ...factor, points: visiblePoints }} />
        {noThreshold && <p className="report-threshold-note">No high risk cutoff is defined for this factor. This chart shows the trend only.</p>}
        <p className="report-mini-label">What changed?</p>
        <p className="report-chart-story">{before && now
          ? `${factor.label}: ${format(before.value)} in ${selectedYear}, compared with ${format(now.value)} in ${latestYear} (${delta > 0 ? '+' : ''}${format(delta)} ${factor.unit_short || factor.unit}). These are individual annual values.`
          : 'Annual values are unavailable for one or both comparison years.'}</p>
      </div>
      <div className="report-history-panel report-monthly-panel">
        <h3>Monthly comparison</h3>
        <MonthlyComparison factor={factor} selectedYear={selectedYear} latestYear={latestYear} />
      </div>
    </div>
    <div className="report-year-control">
      <label htmlFor={'compare-year-' + factor.key}>Compare a past year with the latest data</label>
      <div className="report-year-slider-row">
        <output htmlFor={'compare-year-' + factor.key}>{selectedYear}</output>
        <input id={'compare-year-' + factor.key} type="range" min={years[0]} max={earlierYears[earlierYears.length - 1] ?? latestYear} step="1" value={selectedYear} disabled={!earlierYears.length}
          aria-label="Select comparison year" aria-valuetext={`${selectedYear}, compared with ${latestYear}`}
          style={{ '--year-progress': `${earlierYears.length > 1 ? (selectedYear - years[0]) / (earlierYears[earlierYears.length - 1] - years[0]) * 100 : 0}%` }}
          onChange={e => {
            const target = Number(e.target.value)
            setChosen(earlierYears.reduce((best, year) => Math.abs(year - target) < Math.abs(best - target) ? year : best, earlierYears[0]))
          }} />
        <span className="report-latest-year">{latestYear}<small>Latest data</small></span>
      </div>
      <p className="report-slider-hint">Up to 20 years apart. The line chart and monthly bars update together.{latestYear < new Date().getFullYear() ? ` No ${new Date().getFullYear()} data is available for this factor.` : ''}</p>
    </div>
  </>
}

function pickRecommendations(actions, seed) {
  const pool = [...(actions || [])]
  let state = seed >>> 0
  for (let i = pool.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = Math.floor((state / 4294967296) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

export default function ReportPage({ report = SAMPLE_REPORT, avatarAssets = PERSON_ASSETS, onHome }) {
  const [selected, setSelected] = useState('pm25')
  const [recommendationSeed] = useState(() => Math.floor(Math.random() * 4294967296))
  const recommendations = pickRecommendations(report?.actions, recommendationSeed)
  const factors = report?.factors || {}
  const ordered = [...new Set([...(report?.card_order || []), ...Object.keys(factors)])].filter(key => factors[key]?.available)
  const featured = ['pm25', 'hot_days', 'heavy_rain_days', 'dry_days'].filter(key => factors[key]?.available)
  const current = factors[selected]?.available ? selected : ordered[0]
  const factor = factors[current]
  // The assessment summarizes all available factors, including those in the chart dropdown.
  const counts = Object.fromEntries(Object.keys(STATUS).map(level => [level, ordered.filter(key => factors[key].level === level).length]))
  const trendOnly = ordered.filter(key => !factors[key].level).length
  const user = report?.user || {}
  const profile = [AGES[user.age_group] || user.age_group?.replace(/_/g, ' '), CONDITIONS[user.condition] || user.condition?.replace(/_/g, ' ')].filter(Boolean).join(' with ')
  const overall = STATUS[report?.overall] ? report.overall : null
  return <div className="report-page">
    <main className="report-content">
      <button type="button" className="report-home" onClick={onHome}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        Back to home
      </button>
      <header className="report-heading"><h1>Your result</h1><p>{report?.location?.name || 'Your selected location'}{report?.period?.length === 2 && ` · ${report.period[0]}–${report.period[1]}`}</p></header>
      {report?._WARNING && <p className="report-demo">Demo report · Illustrative numbers for layout testing.</p>}
      <div className="report-summary">
        <section className="report-assessment report-white">
          <div className="report-verdict"><span className={`report-shield ${overall || ''}`} aria-hidden="true">!</span><div><p className="report-eyebrow">Overall assessment</p><h2 className={`report-status-${overall}`}>{STATUS[overall] || 'Not assessed'}</h2></div></div>
          <div className="report-bar" aria-hidden="true">{Object.keys(STATUS).map(key => counts[key] > 0 && <i key={key} className={key} style={{ flexGrow: counts[key] }} />)}</div>
          <div className="report-counts">{Object.entries(STATUS).map(([key,label]) => <div key={key}><span><i className={`report-dot ${key}`} />{label}</span><strong className={`report-status-${key}`}>{counts[key]} {counts[key] === 1 ? 'factor' : 'factors'}</strong></div>)}</div>
        </section>
        <section className="report-profile report-white">
          <p className="report-eyebrow">Who may be most affected?</p>
          <PersonAvatar ageGroup={user.age_group} assets={avatarAssets} />
          <div className="report-profile-copy"><h2>{profile || 'Your household profile'}</h2><p>Explore the factors below for this profile’s health context.</p></div>
        </section>
      </div>
      <details className="report-assessment-note"><summary>How factors are counted</summary><p>Counts include all {ordered.length} available factors. {trendOnly} trend-only {trendOnly === 1 ? 'factor is' : 'factors are'} excluded from the assessment.</p></details>
      <p className="report-period">Values compare recent and earlier multi-year averages; they are not live readings.</p>
      <div className="report-cards">{featured.map(key => { const f = factors[key]; const delta = f.change_then_to_now; return <article className="report-factor" key={key}>
        <p className="report-factor-label">{TITLES[key] || f.label}</p>
        <div className="report-metric"><strong>{format(f.now)} <small>{f.unit_short || f.unit}</small></strong><span className={`report-trend ${f.trend_direction}`}>{f.trend_direction === 'no_clear_trend' ? 'No clear trend' : Number.isFinite(delta) ? `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''} ${format(Math.abs(delta))}` : '—'}</span></div>
        <details className="report-more"><summary><span>What it means</span><b aria-hidden="true" /></summary><p className="report-factor-copy">{f.story?.why_it_matters || 'Health context unavailable.'}</p></details>
      </article> })}</div>
      <section className="report-history">
        <div className="report-chart-header">
          <h2>◷ How has this location changed?</h2>
          <label><span className="report-sr-only">Choose a factor</span><select value={current || ''} onChange={e => setSelected(e.target.value)} disabled={!ordered.length}>{ordered.map(key => <option key={key} value={key}>{factors[key].label}</option>)}</select></label>
        </div>
        {factor ? <HistoryCharts key={current} factor={factor} /> : <p>No historical data available.</p>}
      </section>
      <section className="report-recommendations"><h2>Recommended actions</h2><div className="report-action-grid">{recommendations.map(item => <article className="report-action report-white" key={item.factor}><h3><span aria-hidden="true">{({hot_days:'♨',warm_nights:'☾',pm25:'≋',fires:'♨',no2:'≋',surface_heat:'☀'})[item.factor] || '✦'}</span>{item.label}</h3><ul>{item.actions?.map(action => <li key={action}>{action}</li>)}</ul>{item.source?.url && <a href={item.source.url} target="_blank" rel="noreferrer">{item.source.name} ↗</a>}</article>)}</div>{!recommendations.length && <p>No recommendations available.</p>}</section>
    </main><Footer />
  </div>
}

