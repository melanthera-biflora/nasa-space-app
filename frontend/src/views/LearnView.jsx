'use client'
import Link from 'next/link'
import { ButtonLink } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import NumBadge from '../components/ui/NumBadge'
import { detectiveQuery } from '../presenters/detective'

// Worked examples first, then free exploration with the same tools ("martini glass"). Each case opens the step that
// tells its story, with the place and variable already set.
const CASES = [
  { id: 'wi-smoke', title: 'Smoke over Wisconsin', step: 'Spike or trend?', href: '/events', icon: 'cloud-fog', q: { region: 'WI', variable: 'pm25' },
    question: 'The challenge video follows Canadian wildfire smoke into Wisconsin. Which months stand out, and is smoke a trend or a few bad summers?' },
  { id: 'wi-warming', title: 'Is Wisconsin warming?', step: 'Is it real?', href: '/test', icon: 'thermometer', q: { region: 'WI', variable: 't2m' },
    question: '25 years of state-wide temperature say “not clear yet”. How many years would it take, and what do 45 years say?' },
  { id: 'phx-nights', title: 'Phoenix nights', step: 'Which seasons?', href: '/seasons', icon: 'moon', q: { lat: 33.45, lon: -112.07, name: 'Phoenix, Arizona', variable: 'warm_nights' },
    question: 'Warm nights are rising in Phoenix. Which months carry the change?' },
  { id: 'spk-smoke', title: 'Spokane smoke season', step: 'Which seasons?', href: '/seasons', icon: 'flame', q: { lat: 47.66, lon: -117.43, name: 'Spokane, Washington', variable: 'pm25' },
    question: 'Fine particles more than doubled in Spokane. Is it all year, or the late-summer smoke season?' },
  { id: 'tx-freeze', title: 'The Texas freeze', step: 'Spike or trend?', href: '/events', icon: 'snowflake', q: { region: 'TX', variable: 't2m' },
    question: 'Texas froze for a week in February 2021. Does a week-long disaster even show in a monthly state average, and does it bend the 25-year trend?' },
]

const STEPS = ['Choose a variable', 'Choose a region', 'Choose the years', 'Look at the series: does it seem to change?', 'Test whether the change is real']

export default function LearnView() {
  return (
    <main className="dt-main dt-home" id="main">
      <section className="dt-hero">
        <h1 tabIndex={-1}>How to read a climate trend like a detective</h1>
        <p className="dt-lede">Five worked cases from NASA data, then the same tools for any US state or address.</p>
        <div className="dt-hero-actions">
          <ButtonLink href="/explore?region=WI&var=pm25" variant="primary" icon="search">Start your own investigation</ButtonLink>
          <ButtonLink href="/" variant="ghost" icon="users">Check a place for your household</ButtonLink>
        </div>
      </section>
      <section aria-labelledby="cases-h">
        <h2 id="cases-h">Case files</h2>
        <ul className="dt-cases">
          {CASES.map((c) => (
            <li key={c.id}>
              <Link href={`${c.href}${detectiveQuery(c.q)}`} className="dt-case">
                <span className="dt-case-step"><Icon name={c.icon} size={16} />{c.step}</span>
                <b>{c.title}</b>
                <span>{c.question}</span>
                <span className="dt-case-open">Open the case</span>
              </Link>
              {c.q.lat != null && (   // A5: a case file also opens the household report with its record open
                <Link className="dt-case-report" href={`/report?${new URLSearchParams({ lat: c.q.lat, lon: c.q.lon, name: c.q.name, focus: c.q.variable })}`}>
                  See the household report for {c.q.name.split(',')[0]}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="how-h" className="dt-how">
        <h2 id="how-h">The five steps from the challenge</h2>
        <ol className="dt-steps-list">{STEPS.map((s, i) => <li key={s}><NumBadge tone="brand">{i + 1}</NumBadge>{s}</li>)}</ol>
        <p className="dt-muted">Climatch adds two more: find which part of the year changes, and check whether one disaster year is doing the work.</p>
      </section>
    </main>
  )
}
