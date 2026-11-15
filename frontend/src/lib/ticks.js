// Axis ticks for the hand-drawn SVG charts: round values (steps of 1, 2, 2.5 or 5 times a power of ten) inside the
// data's range, about `count` of them. A flat series gets one tick, so no two ticks share a value (or a React key).
export function niceTicks(lo, hi, count = 4) {
  if (!(hi > lo)) return [lo]
  const mag = 10 ** Math.floor(Math.log10((hi - lo) / (count - 1)))
  const ticksFor = (s) => {
    const out = []
    for (let k = Math.ceil(lo / s - 1e-9); k <= Math.floor(hi / s + 1e-9); k++) out.push(Number((k * s).toPrecision(12)))
    return out
  }
  let best = null
  for (const m of [1, 2, 2.5, 5, 10]) {
    const t = ticksFor(m * mag)
    if (t.length && (!best || Math.abs(t.length - count) <= Math.abs(best.length - count))) best = t   // ties: the larger step
  }
  return [...new Set(best ?? [lo])]
}
