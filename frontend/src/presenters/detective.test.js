import { describe, expect, it } from 'vitest'
import {
  axisCap, band, classSteps, cycle, defaultBandYear, guessAnswer, monthTable, readGuess, stripeKey, waterSense, takeaway, eventsFor, fragility, linkNote, periodsFor, readPlace, readVariable, readYears, recordName, seasonBars, spanLabel, stripes,
  unusualMonths, variableLabel, verdict, withoutEventYears,
} from './detective'

const months = (year, values, z = []) => values.map((v, i) => ({ month: `${year}-${String(i + 1).padStart(2, '0')}`, value: v, z: z[i] ?? 0.1 }))
const trendRow = (name, slope, clear) => ({ name, available: true, slope_per_decade: slope, p: clear ? 0.001 : 0.4, q: clear ? 0.01 : 0.6, clear })

const factor = {
  key: 'pm25', label: 'Fine particles (PM2.5)', available: true, unit_short: 'µg/m³', period: [2022, 2023],
  then: 8, now: 12, then_years: [2022], now_years: [2023], n_years: 25,
  slope_per_decade: 2.5, slope_ci95_per_decade: [0.5, 4.5], significant: false, p_label: 'p = 0.12',
  points: [{ year: 2022, value: 8 }, { year: 2023, value: 12 }],
  monthly: [...months(2022, [5, 5, 6, 6, 7, 8, 9, 8, 7, 6, 5, 5]), ...months(2023, [5, 5, 6, 6, 14, 30, 9, 8, 7, 6, 5, 5], [0, 0, 0, 0, 3, 3.8, 0, 0, 0, 0, 0, 0])],
  seasonal: {
    overall: { clear: false, p_label: 'p = 0.30' },
    seasons: [trendRow('winter', 0.1, false), trendRow('spring', 0.4, false), trendRow('summer', 1.5, true), trendRow('autumn', 0.9, true)],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => trendRow(m, m === 'Sep' ? 2 : 0.1, m === 'Sep')),
    years_needed: { even_odds: 31, likely: 44 },
    normals: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, p10: 4, p25: 5, p50: 6, p75: 7, p90: 9 })),
  },
  leave_one_out: { clear: false, flips: [2023], years: [{ year: 2022, p: 0.2, clear: false, slope_per_decade: 2 }, { year: 2023, p: 0.03, clear: true, slope_per_decade: 1 }] },
}
const smoke = { id: 's', title: 'Smoke', start: '2023-06-01', end: '2023-06-30', variables: ['pm25'] }
const freeze = { id: 'f', title: 'Freeze', start: '2021-02-12', end: '2021-02-17', variables: ['t2m'] }

describe('reading the URL', () => {
  it('accepts a state code or a US point, nothing else', () => {
    expect(readPlace({ region: 'wi' })).toEqual({ kind: 'state', code: 'WI' })
    expect(readPlace({ lat: 43.0712, lon: -89.401, name: 'Madison' })).toEqual({ kind: 'point', lat: 43.07, lon: -89.4, name: 'Madison' })
    expect(readPlace({ region: '<script>' })).toBeNull()
    expect(readPlace({ lat: 51.5, lon: -0.1 })).toBeNull()
  })
  it('falls back to allowed variables and periods', () => {
    expect(readVariable({ kind: 'state' }, 'warm_nights')).toBe('pm25')
    expect(readVariable({ kind: 'point' }, 'warm_nights')).toBe('warm_nights')
    expect(readYears(45, { kind: 'state' }, 't2m')).toBe(45)
    expect(readYears(45, { kind: 'state' }, 'pm25')).toBe(15)                      // PM2.5 from 2010 (D41)
    expect(readYears(45, { kind: 'point' }, 'hot_days')).toBe(25)
    expect(readYears(7, { kind: 'state' }, 't2m')).toBe(25)
  })
  it('offers only the periods a late-starting record can fill, and falls back to the longest of them', () => {
    expect(periodsFor({ kind: 'point' }, 'smoke_days')).toEqual([10, 15])          // from 2011
    expect(periodsFor({ kind: 'point' }, 'no2')).toEqual([10, 15, 20])             // from 2005
    expect(periodsFor({ kind: 'state' }, 'pm25')).toEqual([10, 15])               // from 2010 (D41)
    expect(periodsFor({ kind: 'point' }, 'hot_days')).toEqual([10, 15, 20, 25])
    expect(readYears(25, { kind: 'point' }, 'smoke_days')).toBe(15)
    expect(readYears(10, { kind: 'point' }, 'smoke_days')).toBe(10)
  })
})

describe('the test page', () => {
  it('says "not clear yet" with the years needed', () => {
    const v = verdict(factor)
    expect(v.state).toBe('unclear')
    expect(v.title).toBe('Not clear yet')
    expect(v.yearsNeeded).toContain('About 31–44 years')
    expect(v.monthly.clear).toBe(false)
  })
  it('says when the monthly test already sees what the yearly one does not', () => {
    const v = verdict({ ...factor, seasonal: { ...factor.seasonal, overall: { clear: true, p_label: 'p = 0.040' } } })
    expect(v.title).toBe('Not clear yet')
    expect(v.monthly.text).toMatch(/^But the monthly test already finds a clear change \(p = 0.040\)/)
  })
  it('says "clear trend" and needs no years estimate when significant', () => {
    const v = verdict({ ...factor, significant: true, leave_one_out: { clear: true, flips: [] } })
    expect(v.title).toBe('Clear trend')
    expect(v.yearsNeeded).toBeNull()
  })
})

describe('an axis that a few spikes don’t squash', () => {
  const series = (vals) => vals.map((v, i) => ({ month: `${2001 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, value: v }))
  it('stops near the 98th percentile when a few months tower over the rest, and names the tallest', () => {
    const c = axisCap(series([...Array.from({ length: 98 }, (_, i) => i + 1), 300, 500]))
    expect(c.top).toBe(98)
    expect(c.above).toBe(2)
    expect(c.spikes).toEqual([{ month: '2009-04', value: 500, label: 'Apr 2009: 500' }, { month: '2009-03', value: 300, label: 'Mar 2009: 300' }])
  })
  it('leaves an ordinary series alone', () => {
    expect(axisCap(series(Array.from({ length: 100 }, (_, i) => 10 + (i % 7))))).toBeNull()
    expect(axisCap(series([1, 2]))).toBeNull()
  })
})

describe('water in brown and teal', () => {
  it('knows which records mean wetter as they rise, and which mean drier', () => {
    expect(['precip', 'gwetroot', 'rain_sat', 'water_storage', 'heavy_rain_days', 'wettest_day'].map(waterSense)).toEqual(Array(6).fill('wet'))
    expect(waterSense('dry_days')).toBe('dry')
    expect(waterSense('t2m')).toBeNull()
  })
  it('words the stripes key for each, so the colours are never alone', () => {
    expect(stripeKey('precip')).toBe('Brown: drier than the early years’ average · teal: wetter')
    expect(stripeKey('dry_days')).toBe('Brown: more very dry days than the early years’ average · teal: fewer')
    expect(stripeKey('pm25')).toBe('Blue: below the early years’ average · red: above')
  })
})

describe('the guess first, then the test', () => {
  it('reads only up, down or flat from the URL', () => {
    expect(['up', 'down', 'flat', 'sideways', '', null].map(readGuess)).toEqual(['up', 'down', 'flat', null, null, null])
  })
  it('answers the guess in words on /test', () => {
    expect(guessAnswer('up', factor)).toEqual({ match: false, text: 'You guessed going up; the test says there is no clear trend yet: the ups and downs between years could explain this change.' })
    expect(guessAnswer('flat', factor).match).toBe(true)
    const clear = { ...factor, significant: true, leave_one_out: { flips: [] } }
    expect(guessAnswer('up', clear)).toEqual({ match: true, text: 'You guessed going up; the test says it is clearly going up.' })
    expect(guessAnswer('down', { ...clear, slope_per_decade: -1 }).text).toBe('You guessed going down; the test says it is clearly going down.')
    expect(guessAnswer('up', { ...clear, leave_one_out: { flips: [2023] } }).text).toBe('You guessed going up; the test says it is clearly going up, but only with 2023 in.')
    expect(guessAnswer(null, factor)).toBeNull()
    expect(guessAnswer('up', { available: false })).toBeNull()
  })
})

describe('the seasons page', () => {
  it('names the clear seasons and months and explains the stricter bar', () => {
    const b = seasonBars(factor)
    expect(b.summary).toBe('As a season, the change is clear in summer and autumn. Month by month, only September is clear.')
    expect(b.seasons.find((s) => s.name === 'winter').clear).toBe(false)
    expect(b.note).toMatch(/12 tests/)
  })
  it('lays each calendar month side by side', () => {
    const c = cycle(factor)
    expect(c.months[0].typical).toBe(6)                        // the pipeline's monthly median (normals p50)
    expect(c.months).toHaveLength(12)
    expect(c.months[5].points).toEqual([{ year: 2022, value: 8 }, { year: 2023, value: 30 }])
    expect(c.months[8].clear).toBe(true)
  })
  it('gives the month grid as a table: a row per year, a column per month, a dash for a missing month', () => {
    const t = monthTable({ ...factor, monthly: [...factor.monthly.slice(0, 23), { month: '2023-12', value: null }] })
    expect(t.columns).toEqual(['Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    expect(t.rows[1]).toEqual([2023, '5', '5', '6', '6', '14', '30', '9', '8', '7', '6', '5', '—'])
  })
  it('lays out the heatmap legend from the class edges, with the colour each class gets', () => {
    expect(classSteps([1, 8.9, 24, 29])).toEqual([
      { color: 0, edge: 1 }, { color: 2, edge: 8.9 }, { color: 3, edge: 24 }, { color: 5, edge: 29 }, { color: 6, edge: null }])
    // differences: the edges are on the size of the difference, mirrored around "about usual"
    expect(classSteps([0.56, 2], true)).toEqual([
      { color: 0, edge: -2 }, { color: 2, edge: -0.56 }, { color: 4, edge: 0.56 }, { color: 6, edge: 2 }, { color: 8, edge: null }])
    expect(classSteps([])).toEqual([])
  })
})

describe('the /test headline', () => {
  it('carries the leave-one-year-out caveat when a clear verdict hangs on a year', () => {
    const v = verdict({ ...factor, significant: true, leave_one_out: { clear: true, flips: [2011] } })
    expect(v.title).toBe('Clear trend, but it hangs on 2011')
    expect(v.words).not.toMatch(/rarely happen by chance/)
    expect(verdict({ ...factor, significant: true, leave_one_out: { clear: true, flips: [] } }).title).toBe('Clear trend')
  })
})

describe('one name per record', () => {
  it('uses the same name in the menu and the heading, for a city and a state', () => {
    expect(variableLabel({ kind: 'state' }, 'pm25', { variables: [{ key: 'pm25', label: 'Fine particle pollution (PM2.5)' }] }))
      .toBe(variableLabel({ kind: 'point' }, 'pm25'))
  })
})

describe('the takeaway', () => {
  it('says "rose" only for a clear change; otherwise it went from one number to the other, not clear yet', () => {
    expect(takeaway({ ...factor, significant: true }, 'Spokane')).toMatch(/ rose from 8 to 12 /)
    expect(takeaway({ ...factor, significant: false }, 'Spokane')).toMatch(/ went from 8 to 12 .*, a change that isn’t clear yet,/)
  })
})

describe('rates', () => {
  it('prints a near-zero rate with two significant digits and leaves out a scale description as a unit', () => {
    const base = { available: true, slope_per_decade: -0.004, unit_short: 'AOD', p_label: 'p = 0.2', significant: false, trend_direction: 'no_clear_trend' }
    expect(verdict(base).rate).toBe('−0.004 AOD per decade')
    expect(verdict({ ...base, slope_per_decade: -0.012, unit_short: '0 (dry) to 1 (soaked)' }).rate).toBe('−0.012 per decade')
  })
})

describe('naming and links', () => {
  it('names a record from the URL when its card only carries the key (no raw keys on screen)', () => {
    expect(recordName({ key: 'smoke_days', label: 'smoke_days', available: false }, { kind: 'point' }, 'smoke_days')).toBe('Smoke days')
    expect(recordName(null, { kind: 'point' }, 'warm_nights')).toBe(recordName({ label: 'Warm nights' }, { kind: 'point' }, 'warm_nights'))
  })
  it('says when a link’s place or variable was replaced, and nothing for a good link', () => {
    expect(linkNote({ place: true, variable: false })).toMatch(/isn.t in the US, so this shows Wisconsin/)
    expect(linkNote({ place: false, variable: true }, 'Fine particles (PM2.5)')).toMatch(/shows Fine particles \(PM2\.5\)/)
    expect(linkNote({ place: false, variable: false })).toBe('')
  })
})

describe('the events page', () => {
  it('ranks unusual months and matches them to events', () => {
    const top = unusualMonths(factor, [smoke, freeze], 'pm25', 2)
    expect(top.map((m) => m.label)).toEqual(['June 2023', 'May 2023'])
    expect(top[0].events.map((e) => e.id)).toEqual(['s'])
    expect(top[1].events).toEqual([])
    expect(top.every((m) => m.strength && m.gauge > 0 && m.gauge <= 1)).toBe(true)
    expect(eventsFor('2023-06', [smoke, freeze], 't2m')).toEqual([])
  })
  it('lists only months past 2 SD, and says unusual for which calendar month', () => {
    const top = unusualMonths(factor, [], 'pm25', 6)
    expect(top.map((m) => m.label)).toEqual(['June 2023', 'May 2023'])   // the 0.1 SD months are not "unusual"
    expect(top.map((m) => [m.strength, m.forMonth])).toEqual([['Very unusual', 'a June'], ['Very unusual', 'a May']])
  })
  it('draws one year against the normal range, starting at the most unusual year', () => {
    expect(defaultBandYear(factor)).toBe(2023)
    const rows = band(factor, 2023)
    expect(rows[5]).toMatchObject({ label: 'Jun', p10: 4, p90: 9, value: 30 })
  })
  it('shows the trend without each event year, and when the verdict hangs on it', () => {
    const rows = withoutEventYears(factor, [smoke, freeze], 'pm25')
    expect(rows).toEqual([{ year: 2023, event: 'Smoke', changes: true, text: expect.stringContaining('Without 2023: clear trend (p = 0.03') }])
    expect(fragility(factor)).toBe('The verdict hangs on 2023: leave it out and the trend becomes clear.')
  })
})

it('colours each year against the early-years average the report sends (no mean is computed here)', () => {
  expect(stripes(factor).map((s) => s.k)).toEqual([5, 9])   // then = 8: 2022 (8) sits at it, 2023 (12) is the warmest
})

describe('the years on screen', () => {
  it('start where the record starts, not before', () => {
    expect(spanLabel({ kind: 'point' }, 'smoke_days', 25)).toBe('2011–2025')
    expect(spanLabel({ kind: 'point' }, 'smoke_days', 10)).toBe('2016–2025')
    expect(spanLabel({ kind: 'point' }, 'hot_days', 25)).toBe('2001–2025')
    expect(spanLabel({ kind: 'point' }, 'pm25', 25)).toBe('2010–2025')
    expect(spanLabel({ kind: 'point' }, 'smoke_days', 25, { from: 2012, to: 2020 })).toBe('2012–2020')
  })
})

describe('custom periods', () => {
  it('accepts a From-To of at least 8 years inside the data, else none', async () => {
    const { readRange, firstYearFor } = await import('./detective')
    expect(firstYearFor({ kind: 'state' }, 't2m')).toBe(1981)
    expect(firstYearFor({ kind: 'point' }, 'no2')).toBe(2005)
    expect(readRange({ from: 2006, to: 2015 }, { kind: 'point' }, 'hot_days')).toEqual({ from: 2006, to: 2015 })
    expect(readRange({ from: 2010, to: 2015 }, { kind: 'point' }, 'hot_days')).toBeNull()
    expect(readRange({ from: 1990, to: 2015 }, { kind: 'point' }, 'hot_days')).toBeNull()
    expect(readRange({ from: 1990, to: 2015 }, { kind: 'state' }, 't2m')).toEqual({ from: 1990, to: 2015 })
    expect(readRange({}, { kind: 'state' }, 't2m')).toBeNull()
  })
})
