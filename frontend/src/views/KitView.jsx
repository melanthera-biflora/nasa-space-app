'use client'
import { useState } from 'react'
import Button, { ButtonLink } from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Disclosure from '../components/ui/Disclosure'
import { SelectField, TextField } from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/iconPaths'
import MonthGrid from '../components/ui/MonthGrid'
import NavMenu from '../components/ui/NavMenu'
import NumBadge from '../components/ui/NumBadge'
import Segmented from '../components/ui/Segmented'
import Skeleton from '../components/ui/Skeleton'
import StatusLine from '../components/ui/StatusLine'
import Tabs from '../components/ui/Tabs'
import Term from '../components/ui/Term'
import Tooltip from '../components/ui/Tooltip'
import YearRange from '../components/ui/YearRange'

const STATES = [['default', {}], ['hover', { 'data-force': 'hover' }], ['pressed', { 'data-force': 'pressed' }], ['focus', { 'data-force': 'focus' }], ['disabled', { disabled: true }], ['loading', { loading: true }]]

function Section({ title, children, note }) {
  return (
    <section className="kit-section">
      <h2>{title}</h2>
      {note && <p className="kit-note">{note}</p>}
      <div className="kit-body">{children}</div>
    </section>
  )
}

export default function KitView() {
  const [years, setYears] = useState(25)
  const [range, setRange] = useState({ from: 2001, to: 2025 })
  const [bad, setBad] = useState({ from: 2020, to: 2025 })
  const [month, setMonth] = useState(6)
  const [tab, setTab] = useState('chart')
  const [dialog, setDialog] = useState(null)
  return (
    <main className="kit" id="main">
      <h1 tabIndex={-1}>Component kit</h1>
      <p className="kit-note">Every control in every state. Real hover and focus work too; the forced ones are for screenshots.</p>

      <Section title="Buttons">
        {['primary', 'secondary', 'ghost'].map((v) => (
          <div className="kit-row" key={v}>
            <span className="kit-key">{v}</span>
            {STATES.map(([s, props]) => <Button key={s} variant={v} icon={v === 'primary' ? 'scale' : undefined} {...props}>{s === 'loading' ? 'Comparing' : 'Compare places'}</Button>)}
          </div>
        ))}
        <div className="kit-row">
          <span className="kit-key">icon</span>
          {STATES.slice(0, 5).map(([s, props]) => <Tooltip key={s} label="Search"><Button variant="icon" icon="search" aria-label="Search" {...props} /></Tooltip>)}
          <Button variant="secondary" size="sm" icon="map-pin">Small</Button>
          <ButtonLink href="/kit" variant="ghost" iconEnd="external-link">A link styled as a button</ButtonLink>
        </div>
      </Section>

      <Section title="Numbers in circles" note="Step numbers and counts: tabular digits, optically centred.">
        <div className="kit-row">
          {[1, 2, 3, 7, 11, 25].map((n, i) => <NumBadge key={n} tone={['neutral', 'brand', 'accent', 'highlight', 'solid', 'neutral'][i]}>{n}</NumBadge>)}
          {[1, 4, 9].map((n) => <NumBadge key={n} size="sm" tone="brand">{n}</NumBadge>)}
        </div>
      </Section>

      <Section title="Choices">
        <Segmented legend="Years analyzed" name="kit-years" value={years} onChange={setYears}
          options={[10, 15, 20, 25].map((y) => ({ value: y, label: `${y}` })).concat([{ value: 45, label: '45', disabled: true }])} />
        <MonthGrid legend="Month to compare" name="kit-month" value={month} onChange={setMonth} />
      </Section>

      <Section title="Text and select fields" note="Label, hint, error, then the field. The placeholder is only an example, never the label.">
        <div className="kit-grid">
          <TextField label="Address or place" hint="A US street address, city or ZIP code" placeholder="e.g. Madison, WI" />
          <TextField label="Address or place" error="No US place found. Try a city and state, like Phoenix, AZ." defaultValue="Narnia" />
          <SelectField label="State" hint="Averages every 50 km square in the state" defaultValue="WI"
            options={[{ value: 'AZ', label: 'Arizona' }, { value: 'TX', label: 'Texas' }, { value: 'WI', label: 'Wisconsin' }]} />
          <SelectField label="Variable" options={[{ value: 'pm25', label: 'Fine particles (PM2.5)' }]} disabled />
        </div>
      </Section>

      <Section title="Period">
        <div className="kit-grid">
          <YearRange first={1981} last={2025} from={range.from} to={range.to} onChange={setRange}
            presets={[{ label: 'Last 10 years', from: 2016, to: 2025 }, { label: 'Last 25 years', from: 2001, to: 2025 }, { label: 'Since 1981', from: 1981, to: 2025 }]} />
          <YearRange first={2001} last={2025} from={bad.from} to={bad.to} onChange={setBad} legend="Too short (shows the error)" />
        </div>
      </Section>

      <Section title="Explanations" note="Glossary terms open a short definition; tooltips label icon-only buttons.">
        <p className="kit-text">
          Over 25 years the change is a <Term definition="a change that would rarely happen by chance in a series this long (the Mann-Kendall test, p under 0.05).">clear trend</Term>,
          measured with <Term title="PM2.5" definition="tiny particles in the air, 2.5 micrometres or smaller, from smoke, traffic, industry and dust.">PM2.5</Term> from NASA's MERRA-2.
        </p>
        <div className="kit-row"><span className="kit-key">menu</span>
          <NavMenu label="Look closer" current="/seasons" items={[{ href: '/explore', label: 'Explore', hint: 'Every month since 2001' }, { href: '/seasons', label: 'Seasons', hint: 'Which months changed' }, { href: '/test', label: 'Test', hint: 'Is the change real?' }]} />
        </div>
      </Section>

      <Section title="Dialogs and sheets">
        <div className="kit-row">
          <Button variant="secondary" onClick={() => setDialog('dialog')}>Open a dialog</Button>
          <Button variant="secondary" onClick={() => setDialog('sheet')}>Open a sheet (bottom on phones)</Button>
        </div>
        <Dialog open={Boolean(dialog)} sheet={dialog === 'sheet'} onClose={() => setDialog(null)} title="Your household"
          footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" onClick={() => setDialog(null)}>Save household</Button></>}>
          <p>Escape, the Close button or a click outside closes this. Focus returns to the button that opened it.</p>
          <TextField label="Who lives here" hint="For example: two adults and a child" />
        </Dialog>
      </Section>

      <Section title="Tabs and disclosure">
        <Tabs label="View" value={tab} onChange={setTab} tabs={[
          { id: 'chart', label: 'Chart', content: <Skeleton height={120} /> },
          { id: 'table', label: 'Table', content: <p className="kit-text">2001: 77 nights · 2025: 93 nights</p> },
        ]} />
        <Disclosure summary="How this test works">Mann-Kendall compares every pair of years: does the later one come out higher more often than chance allows?</Disclosure>
      </Section>

      <Section title="Loading" note="Nothing for 400 ms, then a skeleton of the real layout and one status line.">
        <div className="kit-skel" aria-busy="true">
          <Skeleton width="40%" height={20} />
          <Skeleton width="70%" />
          <Skeleton height={140} />
        </div>
        <StatusLine>Fetching 25 years of NASA data for Madison, Wisconsin…</StatusLine>
      </Section>

      <Section title="Icons" note="Lucide paths (ISC), 1.5 stroke, always next to a word.">
        <ul className="kit-icons">{ICONS.map((n) => <li key={n}><Icon name={n} />{n}</li>)}</ul>
      </Section>
    </main>
  )
}
