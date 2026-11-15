// The voice rules (SPEC A3, S43): no hype words and no "best place" language in anything we write on screen.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const DIRS = ['views', 'presenters', 'components']
const BANNED = [/\bunlock/i, /\bdive into\b/i, /\bempower/i, /\bseamless/i, /\bjourney\b/i, /\binsights?\b/i, /\bAI-powered\b/i,
  /\bgame[- ]changer/i, /in today's world/i, /\bbest (place|city|cities|weather)\b/i, /\bscore\b/i]

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? files(p) : /\.(jsx?|css)$/.test(f) && !/\.test\./.test(f) ? [p] : []
})

// Files under `dirs` whose text (comments left out: they may name the rule) matches any pattern, as "path: pattern".
const breaches = (dirs, patterns) => dirs.flatMap((d) => files(join(ROOT, d))).flatMap((f) => {
  const text = readFileSync(f, 'utf8').split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n')
  return patterns.filter((re) => re.test(text)).map((re) => `${f.split(/[/\\]src[/\\]/)[1]}: ${re}`)
})

it('uses plain words, never hype or a "best place" claim', () => {
  expect(breaches(DIRS, BANNED)).toEqual([])
})

// SPEC A4 (S51): the app describes the past. Saying it is not a forecast is fine; claiming what will happen is not.
const FORECAST = [/\bpredict(s|ed|ion|ions)?\b/i, /\bwill (rise|fall|increase|decrease|keep|continue|get worse|get better|warm|cool)\b/i,
  /\bif the trend continues\b/i, /\b(by|in) 20[3-9]\d\b/, /\bexpected to (rise|fall|increase|decrease)\b/i, /\bwarns? you\b/i]

it('never claims what the future holds', () => {
  expect(breaches(['views', 'presenters', 'components', 'screens'], FORECAST)).toEqual([])
  expect(FORECAST.some((re) => re.test('Smoke days will rise in 2035.'))).toBe(true)   // the patterns do catch a claim
  expect(FORECAST.some((re) => re.test('This page describes the past and does not forecast.'))).toBe(false)
})

// SPEC A5 (S55): the report speaks in words. Test names, p-values, intervals and rates live on /test, not here.
const STATS_JARGON = [/Mann-Kendall/i, /\bp\s*[<=]\s*0/, /95%/, /\bCI\b/, /per decade/i, /(?<![.\w])significan/i]   // f.significant is a field, not words

it('keeps statistics jargon off the report', () => {
  const page = readFileSync(join(ROOT, 'screens/ReportPage.jsx'), 'utf8').split('const SAMPLE_REPORT')[0]   // the fake sample is data
  const shown = [page, readFileSync(join(ROOT, 'presenters/reportView.js'), 'utf8'), ...files(join(ROOT, 'components/report')).map((f) => readFileSync(f, 'utf8'))]
    .map((t) => t.split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n'))
  expect(STATS_JARGON.filter((re) => shown.some((t) => re.test(t))).map(String)).toEqual([])
})
