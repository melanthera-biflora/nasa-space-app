'use client'
import dynamic from 'next/dynamic'
import { MotionConfig } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import CompareCity from '../components/CompareCity'
import Button, { ButtonLink } from '../components/ui/Button'
import Disclosure from '../components/ui/Disclosure'
import { SelectField, TextField } from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import NumBadge from '../components/ui/NumBadge'
import Pager from '../components/ui/Pager'
import Segmented from '../components/ui/Segmented'
import Skeleton from '../components/ui/Skeleton'
import Tabs from '../components/ui/Tabs'
import { format } from '../lib/format'
import { useHousehold } from '../lib/household'
import { cardScales, cityId, compareRows, defaultLimit, everywhere, findCities, groupCities, limitOptions, MAX_TOPICS, metaByKey, PAGE_SIZE, pageOf, pageWith, RULE, scatterNote, scatterPoints, thenNow, TOPICS, topicsFor, verdict } from '../presenters/compare'
import { useComparePoints, useCompareTable } from '../presenters/useCompareTable'
import { Waiting } from './common'

const CompareMap = dynamic(() => import('../components/CompareMap'), { ssr: false, loading: () => <div className="map-canvas cmp-map" /> })
// loaded when needed (round 5): the chart with its tab, Side by side once a place is picked
const CityScatter = dynamic(() => import('../components/CityScatter'), { ssr: false, loading: () => <div className="cs-skel ui-skel" aria-hidden="true" /> })
const SideBySide = dynamic(() => import('../components/SideBySide'), { ssr: false })
const MAX_COMPARE = 3

// Compare places for the household (SPEC A3). Everything happens in the browser: the household's topics and limits
// never leave this page. No score, rank or "best": cities are grouped by how many of the household's own limits they
// meet, and every line says why.
export default function CompareView() {
  const household = useHousehold()
  const { table, error } = useCompareTable()
  const meta = useMemo(() => metaByKey(table), [table])
  const [picked, setPicked] = useState(null)          // null until the user changes topics: follow the household
  const topicIds = useMemo(() => picked || topicsFor(household), [picked, household])
  const [limits, setLimits] = useState({})
  const chosen = useMemo(() => topicIds.map((id) => {
    const topic = TOPICS.find((t) => t.id === id)
    return { topic: id, limit: limits[id] ?? defaultLimit(topic, meta) }
  }), [topicIds, limits, meta])
  const [startName, setStartName] = useState('')
  const start = table?.cities.find((c) => c.name === startName) || null
  // memoised so a hover redraws two cards, not 51 (each card is memo'd and gets the same objects back)
  const groups = useMemo(() => (table ? groupCities(table, chosen, meta, start) : []), [table, chosen, meta, start])
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState([])
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState('map')            // the right-hand panel: map or chart of all 51
  const [showList, setShowList] = useState(true)       // phones show one pane at a time
  const [query, setQuery] = useState('')
  const shown = useMemo(() => findCities(groups, query), [groups, query])
  // each group shows one page of cards; the pages start over when the search, limits, topics or starting place change
  const sigOf = (q) => `${q}|${startName}|${topicIds.join()}|${JSON.stringify(limits)}`
  const [paging, setPaging] = useState({ for: '', pages: {} })
  const pageFor = (met) => (paging.for === sigOf(query) ? paging.pages[met] || 0 : 0)
  const setPage = (met, p, q = query) => setPaging((s) => ({ for: sigOf(q), pages: { ...(s.for === sigOf(q) ? s.pages : {}), [met]: p } }))

  const toggleTopic = (id) => {
    const next = topicIds.includes(id) ? topicIds.filter((t) => t !== id) : [...topicIds, id].slice(0, MAX_TOPICS)
    if (next.length) setPicked(TOPICS.map((t) => t.id).filter((t) => next.includes(t)))
  }
  // at the cap, Add is disabled with a reason: a fourth city used to drop the first one silently (round 3)
  const toggleCompare = useCallback((name) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : s.length >= MAX_COMPARE ? s : [...s, name])), [])
  // a dot on the map or chart: show that city's card (on its page, unfolding its group, clearing a search that hides it)
  const onPick = useCallback((name) => {
    setHovered(name)
    setShowList(true)
    const group = groups.find((g) => g.cities.some((j) => j.city.name === name))
    const met = group?.met
    const keep = findCities(groups, query).some((g) => g.cities.some((j) => j.city.name === name))
    if (!keep) setQuery('')
    if (group) setPage(met, pageWith(keep ? findCities([group], query)[0].cities : group.cities, name), keep ? query : '')
    const fold = document.getElementById(`g-${met}`)?.closest('details')
    if (fold) fold.open = true
    let tries = 0
    const show = () => {
      const el = document.getElementById(cityId(name))
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      else if (tries++ < 20) requestAnimationFrame(show)
    }
    show()
  }, [groups, query])   // eslint-disable-line react-hooks/exhaustive-deps -- setPage only reads state through its updater
  const flat = useMemo(() => groups.flatMap((g) => g.cities.map((j) => ({ name: j.city.name, lat: j.city.lat, lon: j.city.lon, met: j.met, total: j.total }))), [groups])
  const places = [...(start && !selected.includes(start.name) ? [start] : []), ...selected.map((n) => table?.cities.find((c) => c.name === n)).filter(Boolean)]
  const rows = places.length > 1 ? compareRows(places, chosen, meta) : []
  const missesOf = useMemo(() => Object.fromEntries(groups.flatMap((g) => g.cities.map((j) => [j.city.name, j.total - j.met]))), [groups])
  const chosenFactors = chosen.map((c) => TOPICS.find((t) => t.id === c.topic).factor)
  const scatterKeys = [...new Set([...chosenFactors, 'humid_heat_days', 'smoke_days', 'water_storage', 'pm25', 'aod'])].filter((k) => meta[k])
  const [scatterPick, setScatterPick] = useState(null)
  const scatterKey = scatterKeys.includes(scatterPick) ? scatterPick : scatterKeys[0]
  const scatterTopic = TOPICS.find((t) => t.factor === scatterKey)
  const scatterLimit = scatterTopic && !scatterTopic.trendOnly ? chosen.find((c) => c.topic === scatterTopic.id)?.limit : null
  const dots = useMemo(() => scatterPoints(table, scatterKey, missesOf), [table, scatterKey, missesOf])
  const dotsNote = scatterNote(dots, (meta[scatterKey]?.label || scatterKey || '').toLowerCase())
  const overlay = useComparePoints(open ? places : [], chosenFactors)
  const scales = useMemo(() => (table ? cardScales(table, chosen) : {}), [table, chosen])
  const jumpTo = (met) => {
    setShowList(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(`g-${met}`)
      const fold = el?.closest('details')
      if (fold) fold.open = true
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  const mapPanel = (
    <>
      <CompareMap cities={flat} hovered={hovered} onHover={setHovered} onPick={onPick} />
      <ul className="cmp-legend" aria-label="Map key">
        <li><i className="is-all" />Under all your limits</li><li><i className="is-one" />Misses one</li><li><i className="is-more" />Misses more</li>
      </ul>
    </>
  )
  const chartPanel = (
    <div className="cs-panel">
      <div className="cs-pick">
        <SelectField label="Record" value={scatterKey} onChange={(e) => setScatterPick(e.target.value)}
          options={scatterKeys.map((k) => ({ value: k, label: meta[k]?.label?.replace(/ \(.*\)$/, '') || k }))} />
        <p className="cs-read">Each dot is a city. <b>Across:</b> its 2021–2025 level. <b>Up:</b> how fast it changes per decade. Point at a dot to find the city in the list; click it to add it to your comparison.</p>
      </div>
      <CityScatter points={dots} limit={scatterLimit} unit={meta[scatterKey]?.unit_short || ''} xLabel="2021–2025 level"
        hovered={hovered} selected={selected} onHover={setHovered} onToggle={toggleCompare} resetKey={scatterKey} note={dotsNote} />
      <ul className="cmp-legend cs-key" aria-hidden="true">
        <li><i className="is-all" />Under all your limits</li><li><i className="is-one" />Misses one</li><li><i className="is-more" />Misses more</li><li><i className="is-on" />In your comparison</li><li><i className="is-faded" />Faded: no clear trend yet</li>
      </ul>
    </div>
  )

  return (
    <MotionConfig reducedMotion="user">
    <main className="dt-main cmp" id="main">
      <h1 tabIndex={-1}>Compare places for your household</h1>
      <p className="dt-lede">Choose up to {MAX_TOPICS} things that matter. We show which of 51 US cities stay under your limits, from NASA data for 2001–2025.</p>
      <p className="cmp-limits-note"><Icon name="info" size={16} />This is a record of the past, not a forecast. It is not medical advice, and it is not advice to buy, sell or move.</p>

      <section className="cmp-controls" aria-labelledby="cmp-what">
        <h2 id="cmp-what" className="cmp-h2">What matters to you</h2>
        {household.length === 0 && <p className="dt-muted">These start from a general household. <ButtonLink href="/" variant="ghost" size="sm" icon="users">Tell us who lives there</ButtonLink></p>}
        <div className="cmp-topics" role="group" aria-label="Topics to compare">
          {TOPICS.map((t) => (
            <button key={t.id} type="button" className="ui-chip cmp-topic" aria-pressed={topicIds.includes(t.id)} onClick={() => toggleTopic(t.id)}>
              <Icon name={t.icon} size={16} />{t.label}
            </button>
          ))}
        </div>
        <div className="cmp-limit-grid">
          {chosen.map((c) => {
            const topic = TOPICS.find((t) => t.id === c.topic)
            const opts = limitOptions(topic, meta)
            // the limits come with the city table: hold their place until it lands ("Limit: none" read as broken)
            if (!table && !error) return <div key={c.topic} className="cmp-limit-fixed" aria-hidden="true"><span className="ui-label">{topic.label}</span><Skeleton height={36} /></div>
            // one possible limit: say it as text (a disabled one-option select reads as broken)
            if (opts.length < 2) {
              return (
                <div key={c.topic} className="cmp-limit-fixed">
                  <span className="ui-label">{topic.label}</span>
                  <p>Limit: {opts[0]?.label || 'none'}</p>
                  {topic.trendOnly && <p className="ui-hint">Model PM2.5 levels can read high on coasts, so this one is about the trend</p>}
                </div>
              )
            }
            return (
              <SelectField key={c.topic} label={topic.label} value={c.limit ?? ''} disabled={opts.length < 2}
                hint={topic.trendOnly ? 'Model PM2.5 levels can read high on coasts, so this one is about the trend' : `Limit: ${topic.noun}`}
                onChange={(e) => setLimits((l) => ({ ...l, [c.topic]: Number(e.target.value) }))} options={opts} />
            )
          })}
          <SelectField label="Starting place (optional)" hint="Lists each group by distance from here" value={startName}
            onChange={(e) => setStartName(e.target.value)}
            options={[{ value: '', label: 'No starting place (A to Z)' }, ...(table?.cities || []).map((c) => ({ value: c.name, label: `${c.name}, ${c.state}` }))]} />
        </div>
        <p className="cmp-rule">{RULE}</p>
      </section>

      <Waiting error={error} waiting={!table} subject="51 cities" shape="compare" />

      {table && (
        <>
          <div className="cmp-view-toggle">
            <Segmented legend="Show" hideLegend name="cmp-view" value={showList ? 'list' : panel} size="sm"
              onChange={(v) => { setShowList(v === 'list'); if (v !== 'list') setPanel(v) }}
              options={[{ value: 'list', label: 'List' }, { value: 'map', label: 'Map' }, { value: 'chart', label: 'Chart' }]} />
          </div>
          <div className={`cmp-layout ${showList ? 'is-list' : 'is-side'}`}>
            <div className="cmp-list">
              {/* pinned while the list scrolls: the lens (your limits) and the groups, one tap from each (round 5) */}
              <nav className="cmp-summary" aria-label="Your results">
                <p className="cmp-lens">
                  Your limits: {chosen.map((c) => {
                    const topic = TOPICS.find((t) => t.id === c.topic)
                    return topic.trendOnly ? `${topic.label} not clearly rising` : `${topic.label} under ${format(c.limit)}`
                  }).join(', ')}. <a href="#cmp-what">Change</a>
                </p>
                <ul>
                  {groups.map((g) => (
                    <li key={g.met}>
                      <button type="button" className="ui-chip cmp-jump" aria-label={`${g.title}: ${g.cities.length} ${g.cities.length === 1 ? 'city' : 'cities'}`} onClick={() => jumpTo(g.met)}>
                        {g.total > 1 && g.met === g.total ? `All ${g.total} limits` : g.met === 0 ? 'None' : g.total === 1 ? 'Under' : `${g.met} of ${g.total}`}: <b>{g.cities.length}</b>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="cmp-find" role="search">
                <TextField label="Find a city" type="search" value={query} autoComplete="off" spellCheck={false}
                  hint="A name or a state, like Denver or CO" onChange={(e) => setQuery(e.target.value)} />
                {query.trim() && (
                  <p className="cmp-find-result" role="status">
                    {shown.length
                      ? `${shown.reduce((n, g) => n + g.cities.length, 0)} of 51 cities match “${query.trim()}”.`
                      : `No city matches “${query.trim()}”. Try a city name or a two-letter state.`}
                    {' '}<Button size="sm" variant="ghost" onClick={() => setQuery('')}>Clear</Button>
                  </p>
                )}
              </div>
              {/* what doesn't help choose: first but folded, so the groups lead (rounds 3 and 4) */}
              <Disclosure className="cmp-context" summary={<h2 className="cmp-h2">True almost everywhere, so it doesn't help choose</h2>}>
                <ul>{everywhere(table, meta).map((t) => <li key={t}>{t}</li>)}</ul>
                <p className="dt-muted">With 51 cities, a few “clear” trends would turn up by chance, so trends here use a stricter test across all cities (the same one as the US map).</p>
              </Disclosure>
              <ul className="cmp-bar-key" aria-label="How to read the bars">
                <li><i className="k-then" />2001–2005</li><li><i className="k-now" />2021–2025</li>
                <li><i className="k-limit" />Your limit</li><li><i className="k-unclear" />No clear trend yet</li>
                <li>One scale per topic for all 51 cities</li>
              </ul>
              {shown.map((g, k) => {
                const title = <><NumBadge tone={g.met === g.total ? 'solid' : 'brand'}>{g.met}</NumBadge><span>{g.title}<span className="dt-muted">, {g.cities.length} {g.cities.length === 1 ? 'city' : 'cities'}</span></span></>
                const pg = pageOf(g.cities, pageFor(g.met))
                const turn = (p) => {
                  setPage(g.met, p)
                  requestAnimationFrame(() => document.getElementById(`g-${g.met}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
                }
                const list = (
                  <>
                    <ul className="cmp-cities">
                      {pg.items.map((j) => (
                        <CompareCity key={j.city.name} entry={j} chosen={chosen} meta={meta} scales={scales} hot={hovered === j.city.name}
                          on={selected.includes(j.city.name)} full={selected.length >= MAX_COMPARE} onHover={setHovered} onToggle={toggleCompare} />
                      ))}
                    </ul>
                    <Pager page={pg.page} pages={pg.pages} total={g.cities.length} size={PAGE_SIZE} onChange={turn} label={`${g.title}: pages`} />
                  </>
                )
                // the first group is open; the rest fold, so the page is a list of groups before it is 51 cards. While
                // searching, every group with a match is open.
                return k === 0 || query.trim() ? (
                  <section key={g.met} className="cmp-group" aria-labelledby={`g-${g.met}`}>
                    <h2 id={`g-${g.met}`} className="cmp-group-title">{title}</h2>{list}
                  </section>
                ) : (
                  <Disclosure key={g.met} lazy className="cmp-group cmp-fold" summary={<h2 id={`g-${g.met}`} className="cmp-group-title">{title}</h2>}>{list}</Disclosure>
                )
              })}
            </div>
            <aside className="cmp-side" aria-label="All 51 cities on a map or a chart">
              <Tabs label="Show the 51 cities as" value={panel} onChange={setPanel}
                tabs={[{ id: 'map', label: 'Map', content: mapPanel }, { id: 'chart', label: 'Level and change', content: chartPanel }]} />
            </aside>
          </div>

          {selected.length > 0 && (
            <div className="cmp-tray" role="region" aria-label="Places to compare">
              <span>{places.map((p) => p.name).join(', ')}</span>
              <Button variant="primary" icon="scale" disabled={places.length < 2} onClick={() => setOpen(true)}>
                {places.length < 2 ? 'Add one more place' : 'Compare side by side'}
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            </div>
          )}
          {selected.length > 0 && (
            <SideBySide open={open} onClose={() => setOpen(false)} places={places} start={start} verdict={open ? verdict(places, chosen, meta, start?.name) : []}
              blocks={open ? thenNow(places, chosen, meta) : []}
              factors={chosenFactors} meta={meta} overlay={overlay} rows={rows} />
          )}
        </>
      )}
    </main>
    </MotionConfig>
  )
}
