# Climatch: modern, calm UI contract (research notes)

Status: 15 Nov 2026. Scope: how a calm, light, interactive data web app is designed and built in 2025-2026, turned into a contract for Climatch (Next.js 16.4 App Router, React 19.3, JS, plain CSS tokens, hand-drawn SVG charts, Leaflet).
Input read from the repo: only the `:root` block of `frontend/src/index.css` (tokens).js`, tokens only).

Evidence tags: **[V]** checked in a primary source this session (link in section 9). **[K]** well-known spec or docs fact, not re-fetched this session. **[U]** unverified or the sources conflict (listed again in section 8).
Colour numbers marked **[calc]** were computed with a script (OKLCH conversion, WCAG 2 contrast, Machado 2009 colour-vision simulation), not taken from a source.

---

## 0. The direction in ten lines

1. **Calm = fewer, quieter signals, not less information.** One accent per view (sage for action, indigo for identity), hairline borders instead of shadows, weight 400/500 instead of 600/700, numbers in tabular figures, labels written in plain words.
2. **Keep the theme, change the texture.** "Dusk and sage" stays. What makes it feel bulky today is likely size and weight (big radii, heavy padding, bold text, filled cards). Shrink radii (12/20 to 10/16), cut padding about 25 %, use 1 px lines, use 36 px controls on desktop and 44 px on touch.
3. **Native first.** Native `<select>`, `<details>`, `<dialog>` and the Popover API cover most widgets with correct keyboard behaviour. Hand-build only the combobox (place search), the chart cursor and the tooltip.
4. **Do not use `<input type="month">`.** Desktop Firefox and macOS Safari still do not support it [V]. Use a 12-month radio grid and native year selects.
5. **Motion: 100 to 300 ms, transform and opacity only.** Enter with ease-out, exit about 30 % faster with ease-in, no bounce. Anything that moves is gated by `prefers-reduced-motion`.
6. **View transitions are usable now.** Same-document view transitions are Baseline (Chrome 111, Safari 18, Firefox 144) [V]. Next.js 16.4 + React 19.3 run `<ViewTransition>` with no config flag [V]. Use only a 150 to 200 ms crossfade between detective pages, plus at most one shared element (the place title).
7. **Perceived speed:** under 400 ms show nothing new; for a data swap keep the old content plus an "Updating…" line; on first load show a skeleton of the real layout; from 3 s add a truthful status line; at 10 s offer Try again (NN/g thresholds [V]). Cache API responses in memory with stale-while-revalidate in about 30 lines inside `api/http.js`, no library.
8. **Run the demo with `next build && next start`.** Next.js prefetches `<Link>` targets only in production [V], so a dev-server demo feels slower than the real app.
9. **Charts:** snap a crosshair to the nearest year, show the same tooltip on keyboard focus, label lines directly, link highlighting across small multiples and between the map and the list. The ColorBrewer RdBu/BuPu ramps already in the tokens stay.
10. **Icons:** at most one dependency, and the best is none. Copy about 15 Lucide SVGs (ISC licence) into one `Icon.jsx`, drawn at 1.5 stroke. If you prefer a package, `lucide-react` is tree-shaken by Next.js by default [V].

---

## 1. Token proposal (a)

### 1.1 Colour: OKLCH tonal scales [calc]

Method: convert the anchors to OKLCH. Keep hue fixed. Place 12 steps at fixed lightness targets (Radix step semantics [V]: 1-2 backgrounds, 3-5 component fills for normal/hover/active, 6-8 borders and focus, 9-10 solid fills and their hover, 11-12 text). Scale chroma with the step, and clip to the sRGB gamut by lowering chroma only. Contrast figures are WCAG 2 ratios against `--surface #fbfcfa` and `--bg #eef2ee`.

Anchors: `#35306a` = oklch(0.347 0.098 284). `#5b4fa8` (`--brand-mid`) = oklch(0.485 0.138 286). `#197b62` = oklch(0.522 0.095 171). The existing neutrals (`--bg`, `--line`) sit at hue 145-161 with chroma ≤ 0.022, so the neutral scale uses hue 160.

| step | role (Radix) | brand (h 286) | on surface | sage (h 171) | on surface | neutral (h 160) | on surface |
|---|---|---|---|---|---|---|---|
| 1 | app bg | `#f9f9ff` | 1.02 | `#f4fcf9` | 1.01 | `#f8fbf9` | 1.01 |
| 2 | subtle bg | `#f3f3ff` | 1.07 | `#ebf8f3` | 1.06 | `#f0f5f2` | 1.07 |
| 3 | element bg | `#e9e9ff` | 1.16 | `#dcf1e9` | 1.15 | `#e7ede9` | 1.15 |
| 4 | hover bg | `#e0dfff` | 1.26 | `#cfeae0` | 1.24 | `#dee5e1` | 1.24 |
| 5 | active/selected bg | `#d5d4fe` | 1.39 | `#c0e2d5` | 1.35 | `#d4dbd7` | 1.37 |
| 6 | subtle border | `#c8c6f8` | 1.58 | `#aed7c8` | 1.53 | `#c8d0cb` | 1.53 |
| 7 | border (interactive) | `#b4b1ee` | 1.95 | `#93c6b4` | 1.86 | `#b4bdb8` | 1.87 |
| 8 | strong border | `#9994e0` | 2.66 | `#6bae98` | 2.51 | `#949e98` | 2.68 |
| 9 | solid | `#5b4fa8` (= brand-mid) | 6.52 | `#197b62` (= accent) | 5.04 | `#6d7771` | 4.51 |
| 10 | solid hover/pressed | `#4f429a` | 7.91 | `#006d56` | 6.14 | `#5f6963` | 5.53 |
| 11 | low-contrast text | `#453889` | 9.36 | `#00614c` | 7.25 | `#535e58` | 6.56 |
| 12 | high-contrast text / identity | `#35306a` (= brand) | 11.45 | `#003d2f` | 11.94 | `#1e2a23` | 14.47 |

How the existing tokens map (no visual break): `--surface` ≈ n-1, `--bg` between n-2 and n-3, `--surface-sunken` ≈ n-3, `--line` ≈ n-5, `--line-strong` ≈ n-7, `--ink-muted` ≈ n-11, `--accent-soft` ≈ sage-3, `--brand-soft` ≈ brand-3, `--focus` = brand-9. Keep `--ink #173b30` as the text colour: it is sage-12 with less chroma, which is calmer for long text.

**Contrast problems found in the current tokens [calc]. Fix only where the token is used as text:**

| pair | ratio | AA small text 4.5 | suggested text variant |
|---|---|---|---|
| `--focus #5b4fa8` ring on `--brand #35306a` / dusk `#302d59` | 1.76 / 1.90 | fails the 3:1 non-text minimum (WCAG 1.4.11) | on dark bands use `--on-brand #f6f4ff` (10.8) or `--highlight #c2ff4d` (9.9) for the focus ring |
| `--accent` text on `--accent-soft` | 4.33 | fails | `#14785f` (4.52) or sage-11 `#00614c` |
| `--flat #687a71` text on `--bg` / `--flat-soft` | 4.03 / 3.70 | fails | `#5f7168` (4.59 on bg) |
| `--compare #c4560a` text on `--bg` | 3.97 | fails | keep `#c4560a` for lines and use `#b64d00` (4.58) for its text label |

Pairs that pass: `--ink` 12.0, `--ink-muted` 6.3, `--accent` 5.0, `--rising` 6.4, `--falling` 6.6 on surface. White on `--accent` is 5.18 and white on brand-9 is 6.71, so both work as primary button fills. On the dusk band: `--on-brand-muted` 6.95 and `--rising/falling-on-brand` 5.9/6.2 vs `#35306a`, but only 4.55/4.81 vs `#354b59` (the lighter end of the gradient), so keep small text off that end.

Platform: `oklch()` and `color-mix()` are Baseline since 2023 and relative colour syntax since 2024 [K]. Keeping hex in the token file is fine; the scale was designed in OKLCH. Optional: write hover states as `color-mix(in oklab, var(--accent), black 8%)` instead of adding tokens.

### 1.2 Chart colours [calc]

* **Keep** `--div-1..9` (ColorBrewer RdBu, for direction) and `--seq-1..7` (BuPu, for level) [K: ColorBrewer marks both colour-blind safe]. BuPu shares the brand hue family, so the maps already feel on-theme.
* **This place vs comparison:** ink/indigo `#35306a` vs `--compare #c4560a`. Minimum OKLab ΔE×100 is 25.9 even under protanopia [calc], so the pair is safe.
* **Categorical (only if more than 2 series must share one plot; small multiples are preferred):** indigo `#5d55a9`, teal-sage `#1e8469`, ochre `#b77610`, terracotta `#b8492e`, sky `#3788bb`. Each is ≥ 3.6:1 on surface (WCAG 1.4.11 needs 3:1 for graphics). Worst pair under simulation: ochre/terracotta ΔE 7.4 for deutan, teal/sky 5.7 for tritan. Okabe-Ito scores 7.6 and 8.5 on the same test, so **always add direct labels or a second cue (dash, marker shape)**. Never use more than 5 colours in one view.
* Gridlines n-5 `#d4dbd7`. Axis text n-11 `#535e58` (6.6:1). Trend band: the series colour at 12-16 % opacity. Do not fill areas with saturated colour.
* Direction is never colour only: arrow + word ("↑ rising") is already the house rule. Keep it.

### 1.3 Type

**Font decision.** Keep **Inter** (theme requirement; strong data features). Change how it loads: drop the Google Fonts `@import` and use `next/font/google`. It self-hosts the files, so the browser never contacts Google, and it removes layout shift [V]. Load the variable font with the **opsz axis** (Inter 4: `opsz` 14-32, `wght` 100-900 on Google Fonts [V]) so 28/40 px headings get the display cut automatically (`font-optical-sizing: auto` is the CSS default [K]). The v3 "dynamic metrics" tracking page is retired [V: rsms.me/inter/dynmetrics returns "used to exist"], so opsz takes over that job.
`Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-inter' })`: whether `axes: ['opsz']` works for Inter in next/font 16.4 is **[U]**; check that the build passes and that DevTools shows `opsz` changing.

Alternatives considered:

| family | why consider | why not as the default here |
|---|---|---|
| Geist | crisp, 9 weights, OFL [V] | it is the `create-next-app` default (Next docs examples use it [V]), so it reads as a template |
| IBM Plex Sans | technical, humanist | heavier personality, more corporate (IBM) |
| Source Sans 3 / Public Sans | US-public-sector feel (USWDS) | lose Inter's opsz and figure alternates; tnum support in Public Sans not checked [U] |
| Atkinson Hyperlegible Next | legibility for low-vision users, 2025, variable, OFL [V] | tabular figures not confirmed [U]; stronger "accessibility product" voice |
| Serif for h1/h2 only (e.g. Source Serif 4) | editorial, "crafted" contrast with Inter, like data journalism | a second font against the current one-family rule (D13); owner's call |

**Scale.** Keep the 6 steps and add line-height and tracking:

| token | size / line | weight | tracking | use |
|---|---|---|---|---|
| `--text-12` | 12 / 16 | 400-500 | +0.01em | axis ticks, captions, badge numbers (minimum size) |
| `--text-14` | 14 / 20 | 400, labels 500 | 0 | UI controls, table cells, helper text |
| `--text-16` | 16 / 24 | 400 | 0 | body; **inputs on touch** (iOS zooms inputs under 16 px [K]) |
| `--text-20` | 20 / 28 | 500 | -0.01em | card titles, section heads |
| `--text-28` | 28 / 34 | 500 | -0.015em | page h1 on data pages, key figures |
| `--text-40` | 40 / 44 | 500-600 | -0.02em | dusk-page hero, one hero number |

Weights: 400 body, 500 labels and headings, 600 only for one key number per card. Never 700 (the bulky look). Measure: 60-72ch for prose. Sentence case everywhere; no letter-spaced capitals except tiny overlines (12 px, +0.06em, 500).

**Numbers.**
* Tabular figures for any number that updates or sits in a column: `font-variant-numeric: tabular-nums` (Inter `tnum` [V]). Slashed zero (`zero`) only in dense tables.
* Minus sign U+2212 (−), not a hyphen. A non-breaking space between number and unit ("3.1 °F"); unit and "/decade" in ink-muted at 0.85em.
* `Intl.NumberFormat('en-US', { signDisplay: 'exceptZero', maximumFractionDigits: 1 })` gives a "+" sign but a hyphen-minus, so replace "-" with "−" afterwards [K].

**Centring numbers in circles and badges.**
1. Modern path: `text-box: trim-both cap alphabetic` trims the line box to cap height, so lining digits centre exactly with flex/grid centring. Support: Chrome 133, Safari 18.2, Firefox 154 [V caniuse + Mozilla bug 2050141], so Baseline since mid-2026.
2. Fallback that already works with Inter: with `line-height: 1`, Inter's metrics (cap ≈ 0.727 em, ascender ≈ 0.969 em, descender ≈ 0.24 em; Inter 3 README UPM 2816 / asc 2728 / cap 2048 [V], descender **[U]**) put the cap-height centre within 0.01 em of the box centre. So `display:grid; place-items:center; line-height:1` is visually centred at 12-14 px.
3. SVG text in chart markers: don't rely on `dominant-baseline` (it differs across engines [K]). Use the default alphabetic baseline at `y = cy + 0.36 * fontSize` (half the cap height).
4. Optical correction: one-digit "1" looks off-centre in proportional figures, which is another reason to use `tabular-nums` inside circles. Make the circle ≥ 1.75× the font size (12 px text in a 22-24 px circle).

```css
.num-badge { display:inline-grid; place-items:center; inline-size:24px; block-size:24px; border-radius:50%;
  font: 500 12px/1 var(--font-body); font-variant-numeric: tabular-nums; }
@supports (text-box: trim-both cap alphabetic) { .num-badge { text-box: trim-both cap alphabetic; } }
```

### 1.4 Space, size, radius, borders

* Spacing: keep 4/8/12/16/24/32/48 and add `--space-8: 64px` for desktop section gaps. Card padding 16 (mobile) and 20 (desktop); 24 is the maximum, down from the current panels. Gap between cards 12-16. Rhythm: inside a card use only 4/8/12; between blocks 24/32.
* Control heights: `--control-sm: 28px` (chips, inline toggles), `--control-md: 36px` (desktop default), `--control-lg: 44px` (applied under `@media (pointer: coarse)`). The WCAG 2.2 AA minimum target is 24×24 CSS px, or spacing that keeps a 24 px circle clear [V]. Apple HIG says 44 pt and Material 48 dp [K]; meet those on touch.
* Radius: `--radius-xs: 4px` (badges, tooltips, chart labels), `--radius-control: 6px` (keep), `--radius-card: 10px` (was 12), `--radius-panel: 16px` (was 20), `--radius-round: 999px` (pills, dots). Nested radius = outer − padding.
* Borders: 1 px everywhere; `--line` for structure, n-7 for interactive outlines, brand-9 for the focus ring. No 2 px borders except focus and the selected map region.
* Layout: content max-width about 1120 px; a 12-column grid is unnecessary. Use `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` for card grids, and a single column with 16 px gutters at 375 px.

### 1.5 Surfaces and elevation (no heavy shadows)

Tonal elevation first: page `--bg`, cards `--surface` + 1 px `--line`, inset areas `--surface-sunken`. Material 3 uses tonal surface-container roles instead of shadows for most levels [K]. Shadows only for things that float above content. Tint shadows with the ink hue, layer them, and keep one light direction (Comeau [V]).

```css
--shadow-1: 0 1px 2px oklch(0.32 0.05 170 / 0.06);                                       /* sticky header, hovered card (optional) */
--shadow-2: 0 1px 2px oklch(0.32 0.05 170 / 0.06), 0 4px 12px oklch(0.32 0.05 170 / 0.08); /* menu, popover, chart tooltip */
--shadow-3: 0 2px 4px oklch(0.32 0.05 170 / 0.06), 0 12px 32px oklch(0.32 0.05 170 / 0.12); /* dialog, bottom sheet */
--scrim: oklch(0.27 0.02 160 / 0.32);
```

Cards do not lift on hover. Hover changes the background (step 3 to 4) or the border (n-6 to n-7). The dusk gradient stays on the first pages only. The data pages use flat sage-mist surfaces.

### 1.6 Motion tokens

Extend the existing `--ease-out` / `--dur-*` rather than replacing them (the current 150/300/600 stay valid):

```css
--dur-1: 100ms;   /* press, colour/opacity micro-feedback (Carbon fast-02 110, M3 short2 100) */
--dur-2: 150ms;   /* = --dur-fast: hover, tooltip fade, menu/popover open */
--dur-3: 200ms;   /* disclosure height, toast in, crossfade between pages (M3 short4 200) */
--dur-4: 300ms;   /* = --dur-base: bottom sheet / drawer in, larger panels (M3 medium2 300) */
--dur-5: 500ms;   /* chart line draw, first data reveal only (M3 long2 500) */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* keep: enter */
--ease-standard: cubic-bezier(0.2, 0, 0, 1);  /* M3 standard: on-screen moves, crosshair, sheet drag settle */
--ease-in: cubic-bezier(0.3, 0, 1, 1);        /* M3 standard-accelerate: exits */
```

Sources: Material 3 durations 50-1000 ms in 50 ms steps and the cubic-bezier values above [V: Compose MotionTokens.kt]. Carbon fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700 ms; productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)` [V].

Rules:
* Exit is about 70 % of the enter time. Menus close in 100 ms, or instantly on Escape.
* Distance scales with duration: 4-8 px for popovers, 12-16 px for content rise-in (the current 14 px is right), full height for sheets.
* Animate only `transform` and `opacity` (plus `background-color`/`border-color` for micro-states). Never animate `width`/`height`/`top` on the main thread. For disclosure height use the `grid-template-rows: 0fr → 1fr` trick.
* **Springs:** CSS `linear()` can encode a spring and is in all engines (Chrome 113, Firefox 112, Safari 17.2) [V]. A calm product should not overshoot, though, and a critically damped spring looks the same as the ease-out above. No springs, no JS animation library.
* `prefers-reduced-motion: reduce`: no translate, scale or parallax. Opacity crossfades ≤ 150 ms may remain (Next.js docs suggest this refinement [V]). Ambient loops (`float`, `drift`, `twinkle`) off. Skeleton pulse off. The existing global 0.01 ms override is fine as a safety net. WCAG 2.3.3 (AAA) covers motion from interactions [K].

### 1.7 Icons

| set | licence | style | stroke tunable | React package in Next 16 | note |
|---|---|---|---|---|---|
| Lucide | ISC [V] | 24 grid, 2 px stroke, round caps/joins, 1 px padding, 2 px corner radius [V] | yes (`strokeWidth`; `nonScalingStroke` [V]) | `lucide-react`, optimized by default [V] | `aria-hidden="true"` by default [V]; 1600+ icons |
| Tabler | MIT [V] | 24 grid, 2 px stroke [V] | yes | `@tabler/icons-react`, optimized by default [V] | ~6000 icons, very similar look to Lucide |
| Heroicons | MIT [V] | outline 24 at **1.5 stroke**, round [V: SVG source] | yes | `@heroicons/react/24/outline`, optimized by default [V] | ~300 icons, too few for weather/air topics [U count] |
| Phosphor | MIT [V] | 6 weights (thin…duotone) | **no**: each weight is a filled outline path, not a stroke [V: SVG source] | needs `/dist/ssr` (or `/ssr`) import in server components [U path] | nice "light" weight, but you cannot fine-tune it |

**Recommendation:** no package. Copy the ~15 icons the app needs (thermometer, moon, droplets, cloud-rain, wind, flame, factory, map-pin, search, chevron-down, x, info, arrow-up-right, arrow-down-right, minus, calendar, layers) from Lucide into `components/Icon.jsx` as a path map. Add the ISC notice in a comment (the licence requires it). Draw at `stroke-width: 1.5` for 20 px and `1.25` for 16 px (delicate), `vector-effect: non-scaling-stroke` if scaled, `stroke="currentColor"`, `aria-hidden="true"`. Icon-only buttons put the name on the button (visually hidden text or `aria-label`), not on the icon [V Lucide a11y]. If a package is preferred, `lucide-react` is the one allowed dependency: it is tree-shaken by Next's default `optimizePackageImports` [V].
Sizes: 16 px inline with 14 px text, 20 px in 36 px buttons, 24 px only in empty states. Icons always sit next to a word except in universally known controls (close, search, chevrons).

---

## 2. Component behaviour table (b)

States for every interactive element: default, hover (pointer: fine only, `@media (hover: hover)`), active/pressed, focus-visible, selected/checked (if any), disabled, loading (if async), invalid (inputs). Focus ring: `outline: 2px solid var(--focus); outline-offset: 2px`, no transition, no `box-shadow` rings (they disappear in Windows forced-colours mode [K]). On dark bands, swap `--focus` for `--on-brand` or `--highlight`.

| component | build with | states → visuals | keyboard (APG) | timings | ARIA / notes |
|---|---|---|---|---|---|
| **Button: primary** | `<button>` | fill sage-9, text white (5.18:1); hover sage-10; pressed sage-10 + `translateY(0.5px)`; disabled n-3 fill, n-9 text, no hover; loading: label stays, 14 px spinner replaces the icon, width fixed | Enter, Space | bg 100 ms; press in 0 ms, out 150 ms; spinner appears after 400 ms of pending, then stays ≥ 500 ms to avoid flicker [NN/g: no looping animation under 1 s, V] | loading = `aria-busy="true"` + `aria-disabled="true"` (stays focusable); one primary per view |
| **Button: secondary** | `<button>` | surface fill, 1 px n-7 border, ink text; hover n-3 fill; pressed n-4 | same | 100 ms | |
| **Button: ghost** | `<button>` | no border; ink-muted text; hover n-3 fill, ink text | same | 100 ms | for toolbars and card actions |
| **Button: icon** | `<button>` | 32×32 (36 on touch) square or round; icon 20 px; hover n-3 | same | 100 ms | needs an accessible name; a tooltip only adds a visual label (Primer: tooltips are a last resort [V]) |
| **Disabled (all)** | prefer `aria-disabled` + reason text | as above | stays in tab order | none | disabled controls are exempt from contrast [K], but explain why ("Pick a place first"); no tooltips on disabled buttons |
| **Segmented control** (years 10/15/20/25, chart view) | radio group: `<fieldset>` + native radios styled as segments | selected brand-9 text on brand-3 fill + 1 px brand-7; others ghost | Tab enters the checked radio; arrows move **and** select (native) | 150 ms bg/colour | native radios give this for free; changing years re-requests, so show "Updating…" (house rule) |
| **Native `<select>`** | `<select>`; `appearance:none` + chevron SVG background | 36 px, 1 px n-7 border, radius 6; hover border n-8; focus ring | native (type-ahead, arrows; OS picker on phones) | none | **Keep native when** options are plain text, single choice, ≤ ~30 items, form-like (state, year, months list). `appearance: base-select` only as progressive enhancement in `@supports`: Chrome 135+, Safari 27 [U], Firefox behind flag [V-ish] |
| **Custom listbox** | avoid | - | APG: arrows, Home/End, type-ahead [V] | - | only when options need rich content, and no interactive content inside options [V]; for 7 variables with descriptions use visible radio cards instead (no hidden choices) |
| **Combobox: place search** | `<input role="combobox">` + `<ul role="listbox">` | input 36/44 px; popup surface + `--shadow-2`, radius 10, max 8 rows, active row brand-3 + matched text `<mark>` 500 weight; "No matching US places" row; "Searching…" row | Down: open/next; Up: last/prev; Enter: accept + close; Escape: close, a second Escape clears; Alt+Down: open without moving; Tab: leave (popup not in tab order). **DOM focus stays in the input** via `aria-activedescendant` [V] | debounce 150 ms (local) / 250 ms (network); min 2 chars; popup in 120 ms opacity + `translateY(-4px)`, out 80 ms; announce result count via polite live region 500 ms after typing stops | `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-selected` on the active option [V]; `autocomplete="off"`, `spellcheck="false"`; keep the last 3 picks as "Recent" when the field is empty; pointer hover moves the highlight too |
| **Text input** | `<label>` above + `<input>` | 36 px desktop / 44 px touch; 1 px n-7 border; hover n-8; focus ring; invalid: border `--rising`, message below with icon + text | native | none | visible label always; hint between label and input, linked via `aria-describedby`; **no placeholder as label, hint or example** [V GOV.UK]; error message above the input in GOV.UK order (label, hint, error, input) [V]; `inputmode="numeric"` instead of `type="number"` [V]; width matches the expected answer [V] |
| **Year range** (custom start/end) | two native `<select>`s "From" / "To" in a `<fieldset>` | as select; invalid if From > To | native | none | simplest accessible route. A two-thumb slider (APG multi-thumb slider [K]: arrows ±1, PageUp/Down ±5, Home/End, `aria-valuetext="2001"`) only if a brush on the chart is wanted; dragging needs a non-drag alternative (WCAG 2.5.7 [K]) |
| **Month / season picker** | radio group: 12 months in a 4×3 or 6×2 grid of segments; seasons as a second group "Winter (Dec–Feb)" etc. | as segmented control | Tab to checked, arrows move+select | 150 ms | **not `<input type="month">`**: unsupported in desktop Firefox and macOS Safari [V]. GOV.UK prefers typed fields over pickers for known dates [V]; here the choice set is small, so visible radios are best |
| **Menu button** (actions, e.g. "Share", "Download data") | `<button aria-haspopup="menu" aria-expanded>` + `role="menu"` in a `popover` | surface, `--shadow-2`, radius 10, items 32 px, hover n-3 | Enter/Space/Down: open + focus first item; Up: open + last [V]; inside: arrows (wrap), Home/End, type-ahead, Enter activates + closes, **Escape closes and returns focus to the button**, Tab closes and moves on [V] | open 120 ms (opacity + scale .98→1 from the trigger edge), close 80 ms | for page navigation use links in a disclosure, not `role="menu"` [V: APG disclosure navigation example]; `popover="auto"` gives light dismiss + Escape + top layer (Baseline 2024 [K]); position with CSS anchor positioning (Baseline Jan 2026 [V]) with a JS fallback only if needed |
| **Popover (non-modal panel, e.g. filters, legend details)** | `popover="auto"` + `<button popovertarget>` or `commandfor` (Baseline Dec 2025 [V]) | as menu | Escape closes; click/focus outside closes (light dismiss); focus moves to the first control only if the panel holds controls | open 150 ms, close 100 ms | return focus to the invoker on close; never nest more than one level |
| **Disclosure** (card "Details", caveats, methods) | `<details><summary>` | summary row 36 px with chevron rotating 0→90°; hover n-3 | Enter/Space toggle [V] | chevron 150 ms; content height 200 ms via grid-rows trick (or none) | for custom versions: `button[aria-expanded][aria-controls]` [V]; exclusive accordion with `<details name="x">` [K]; don't hide the main numbers in disclosures |
| **Tabs** (only if views are siblings, e.g. Chart / Table) | `role="tablist"` | selected: ink text + 2 px brand-9 underline; others ink-muted | arrows move (automatic activation if panels are cheap), Home/End [K APG tabs] | underline slides 200 ms `--ease-standard` | a "Table" tab is the best text alternative for a chart (OWID does this [V]) |
| **Modal dialog** | `<dialog>` + `showModal()` | surface, radius 16, `--shadow-3`, scrim `--scrim` | focus the first control, or the title (`tabindex=-1`) for long content; Tab is contained; Escape closes; focus returns to the opener [V APG] | in 200 ms (opacity + scale .98→1), out 150 ms; scrim 200 ms | `aria-labelledby` the visible title [V]; `closedby="any"` (light dismiss) is in Chrome 134 / Firefox 141 but **not Safari** [V], so add a scrim click handler; use sparingly |
| **Bottom sheet (phones) / side drawer (desktop)** | same `<dialog>`, positioned to the bottom or side | radius 16 on the top corners only; grab-handle bar 36×4 n-7 (decorative); max-height 85dvh; content scrolls inside; `padding-bottom: env(safe-area-inset-bottom)` | as modal dialog; visible Close button (dragging is optional, never required: WCAG 2.5.7 [K]) | in 300 ms `translateY(100%)→0` `--ease-out`; out 200 ms `--ease-in`; reduced motion: opacity 150 ms only | use for filters and the household editor on ≤ 640 px; on desktop prefer an inline panel over a drawer |
| **Tooltip** (labels for icon buttons, short definitions) | hand-built `role="tooltip"` + `aria-describedby` (or the name for icon buttons); `popover="manual"` for top layer | n-12 `#1e2a23` bg, white 12/16 text (14.9:1), radius 4, max-width 240 px, 6 px gap, no arrow needed | appears on hover **and** keyboard focus; **Escape dismisses without moving focus** [V WCAG 1.4.13]; never focusable [V APG] | hover open delay 400 ms (Primer medium 400, Radix 700 [V]); 0 ms after another tooltip closed within 300 ms (Radix skip 300 [V]); focus open delay 0-150 ms; fade in 100 ms; hide 100 ms after pointer leaves trigger **and** tooltip (must be hoverable [V]) | no essential info, nothing interactive inside (APG: use a non-modal dialog [V]); on touch use a **toggletip** (click-to-open `popover`); `interestfor`/`popover="hint"` are not cross-browser yet [V caniuse], so don't rely on them |
| **Toggletip / "What is this?"** | `<button aria-expanded>` + `popover="auto"` | (i) icon 16 px ghost button; bubble like tooltip but surface + `--shadow-2` + ink text | Enter/Space toggle; Escape closes; light dismiss | 120 ms | use for definitions of "p-value", "95 % band", "PM2.5" |
| **Toast** | avoid; prefer inline status | if used: bottom-centre on mobile, bottom-right on desktop; n-12 bg, white text, radius 10, max 1 visible | not focused automatically; any action reachable by Tab | in 200 ms (`translateY(8px)` + opacity), out 150 ms; passive auto-dismiss ≥ 6 s (Carbon codes 5 s [V]) with the **timer paused on hover/focus**; never auto-dismiss errors or actionable toasts [V Carbon] | a `role="status"` container exists in the DOM **before** text is inserted [V]; WCAG 2.2.1 interpretation is contested [V]; Climatch only needs "Link copied", so an inline "Copied ✓" label beside the button for 2 s is enough |
| **Status line** ("Updating…", "Loading 25 years of data") | `<p role="status">` | 14 px ink-muted + 12 px dot pulsing (1 s, off for reduced motion) | - | appears after 400 ms | the existing house pattern; keeps old data visible underneath |
| **Skeleton** | static blocks in the real layout | n-3 blocks, radius 4; optional opacity pulse 1.6 s between 1 and 0.6 | - | show only if nothing is on screen after ~300 ms; no shimmer sweep (NN/g: animated skeletons can distract [V]) | `aria-busy="true"` on the region + one status line; never a "frame only" skeleton [V] |
| **Chart point focus** | SVG `role="group"` + `lib/roving.js` (house rule) | crosshair 1 px ink 40 %; point 6 px ring 2 px surface; tooltip as chart tooltip | one tab stop; Left/Right ±1 year; Home/End; PageUp/Down ±5 years | crosshair moves without easing (instant feels precise); tooltip fades 100 ms | details in section 5 |

---

## 3. Motion and page transitions

* **What moves:** feedback (press, hover tint), continuity (popover grows from its trigger, sheet from the bottom edge, crossfade between pages), and a first-reveal of data (line draw ≤ 500 ms, once per page view, never on updates). Nothing else. Motion must never carry information (house rule).
* **View Transitions API, Nov 2026:** same-document is in Chrome 111+, Safari 18+, Firefox 144+ (Baseline Oct 2025) [V]. Cross-document is in Chrome 126+ and Safari 18.2+; Firefox status unclear [U], and it is irrelevant for the App Router (client navigations are same-document).
* **Next.js 16.4:** view transitions work in the App Router with no configuration. React 19.3 includes `<ViewTransition>` and `addTransitionType`. Navigations are transitions, so they animate; plain `setState` does not. Direction can be set with `transitionTypes` on `<Link>` / `router.push` [V]. Browsers without support just skip the animation [V].
* **Contract for Climatch:** root crossfade 180 ms between detective pages (`::view-transition-old/new(root)` with `--ease-standard`); one named element `view-transition-name: place-title` on the context-bar place name so it stays still while content fades; no slides between sibling pages. Under `prefers-reduced-motion: reduce`, set durations to 0 or keep only the opacity fade [V Next docs].
* Leaflet: disable `zoomAnimation`/`fadeAnimation` under reduced motion (Leaflet options [K]).

---

## 4. Loading, caching, perceived speed

**Timeline contract** (per data request; NN/g [V]: under 1 s no looping indicator; 2-10 s looping indicator; over 10 s progress/estimate; skeletons for full-page loads under 10 s):

| elapsed | nothing on screen yet | old data on screen (years/variable change) |
|---|---|---|
| 0-100 ms | pressed/selected state updates at once (`useOptimistic`/local state) | same |
| 100-400 ms | nothing (avoid flash) | nothing |
| 400 ms | skeleton of the real layout + status line | "Updating…" status line; old content stays at full opacity (or 0.7) and is `aria-busy` |
| 3 s | status adds a truthful reason: "The first look at a place takes a few seconds; later views are instant" (only if the cache makes that true) | same |
| 10 s | "This is taking longer than usual" + **Try again** + **Choose another place** | same, old data kept |
| 30 s | abort (`AbortController`), show the error state with the backend's sentence | keep old data + inline error |

Use determinate progress only if the backend reports real steps (house rule: no invented content).

**Cache: no library.** SWR is ~4.2-4.7 kB gzip and TanStack Query v5 ~13 kB gzip [V via third parties citing Bundlephobia, U exact]. Climatch has one fetch module, so a 30-line cache in `api/http.js` is enough:

```js
// shortcut: in-memory only, cleared on reload; move to SWR if we need focus-revalidation or mutation.
const cache = new Map() // url -> { data, at, promise }
const FRESH_MS = 5 * 60_000, MAX = 50
export function getCached(url, fetcher) {
  const hit = cache.get(url), now = Date.now()
  if (hit?.data !== undefined && now - hit.at < FRESH_MS) return { data: hit.data, refresh: null }
  if (!hit?.promise) {
    const promise = fetcher(url).then(data => { cache.set(url, { data, at: Date.now() }); return data })
      .finally(() => { const h = cache.get(url); if (h) delete h.promise })
    cache.set(url, { ...hit, promise })
    if (cache.size > MAX) cache.delete(cache.keys().next().value) // oldest first
  }
  return { data: hit?.data, refresh: cache.get(url).promise } // stale data now, fresh data later
}
```

It dedupes in-flight requests, returns stale data at once and revalidates in the background. A failed request must not evict existing data. It needs one Vitest test (fresh hit, stale + revalidate, dedupe).

**Prefetch:**
* `<Link>` prefetch runs **only in production**. In the viewport, routes are prefetched; hover/touch only raises priority [V]. Static routes are fully prefetched with a 5-minute client cache; dynamic routes are prefetched down to the first `loading.js` boundary, or not at all without one [V]. So give each detective route a `loading.js` (a skeleton) and **demo from `next build && next start`**.
* Data prefetch on intent: on `pointerenter` (after 100 ms, to ignore sweeps) or `focus` of a case/place card, call the `api/*` function so the cache warms. Cancel nothing; the cache dedupes.
* `useLinkStatus` (Next 15.3+) shows a fixed-size pending hint on a clicked link, with a 100 ms animation delay to avoid flashes [V]. Use it only on links whose target is not prefetched.
* `useTransition` around year/variable changes keeps the old UI interactive; `useDeferredValue` for the search list [K].

---

## 5. Charts and maps for non-experts

**Pointer:** the whole plot area is the hit target. The crosshair snaps to the **nearest year** (x-only), never to the exact point. The tooltip sits above the point with a 12 px offset and flips at plot edges. It shows **year · value + unit · "vs 2000–2004 average: +4 days"**, plus the event name if the year is a flagged disaster. No delay on charts (explore mode). It fades in 100 ms and hides 150 ms after the pointer leaves the plot. Touch: drag scrubs and the tooltip is pinned above the finger; tap outside clears.

**Keyboard:** one tab stop per chart (`lib/roving.js`). Left/Right step by year, Home/End, PageUp/PageDown ±5. Focus draws the same crosshair and tooltip. A polite live region announces "2012: 41 heat days. Trend 38." (debounced 250 ms so held keys don't flood the screen reader). This is the model Highcharts uses (Tab to chart, arrows inside [V]) and Datawrapper uses (arrows to points, values read out [V]).

**Text alternatives:** the summary sentence (house rule), plus a **Table** view of the yearly values (OWID's table tab [V]). Charts with a description in HTML read better than SVG `<title>` alone (Datawrapper hides the chart body and exposes an alt description [V]).

**Annotation over legends:** label lines at their right end ("This place", "Compare: Phoenix"). Mark disasters with a 6 px hollow marker and a short label ("2020 August Complex fire") placed directly on the chart. Write the significance in words above the chart ("Rising 2.1 days per decade. Clear trend (p = 0.01)."). Keep at most 3 annotations per chart.

**Small multiples:** the 7 factors as a grid of small line cards with a **shared x-axis**. Use a shared y-scale only when units match. Hovering or focusing a year in one card shows the same year in all cards (linked crosshair). OWID offers small multiples as a view [V]; the NYT Upshot and Observable Plot crosshair/tip marks follow the same idea [K/U, not fetched: Observable returned 429].

**Map ↔ list/chart linking:** hover or focus a list row and its region gets a 2 px ink outline and is brought to front (`layer.bringToFront()`, `setStyle`, as in the Leaflet choropleth tutorial [K]). Hovering a region highlights the row. Selection persists; hover is transient. The list is the keyboard path, because the polygons are not individually focusable. Cooperative zoom stays (house rule). Legend: labelled class breaks with units and "rising/falling", never a rainbow ramp.

**References worth copying:** OWID Grapher (table tab, small multiples, typing a year directly [V]), Datawrapper (keyboard + alt text [V]), Highcharts accessibility module (keyboard model [V]), Observable Plot crosshair/tip (pointer snapping [K]). Apple Weather (range bars and "compared to average" wording) and Linear/Vercel dashboards (hairline density, 13-14 px UI text) are well-known visual references but were **not checked** this session [U].

---

## 6. Do / Don't (c)

**Looks AI-generated or templated in 2026** (community catalogues and published write-ups on "distributional convergence": Inter + purple gradient on white + minimal motion is the model default [V]). Climatch uses Inter and purple, so it must avoid the *rest* of the default look:

| don't | do instead |
|---|---|
| purple-to-blue gradient (`#667eea → #764ba2`) on white, gradient text, gradient buttons [V] | dark, desaturated dusk indigo only as an identity band on the first pages; data pages flat sage-mist; solid sage buttons |
| centered hero + one CTA + row of three identical icon cards [V] | lead with the place's real headline ("3 factors getting worse") and a real chart; asymmetric layout; card grids only where items are comparable |
| emoji or sparkle icons as decoration [V] | one icon set, one stroke weight, icons next to words |
| glassmorphism, blurred blobs, neon glow, glow-shadow cards | opaque surfaces, 1 px lines, tinted shadows only on floating layers |
| fake counters, invented "live" stats, stock copy ("Unlock your climate future") | real report numbers, plain specific sentences, units always shown |
| every element 16-24 px radius, everything a pill, `font-weight: 700` headings | 6/10/16 radii, pills only for status, 500-weight headings |
| uniform spacing everywhere (everything 24 px) | rhythm: tight inside a group (4/8/12), loose between groups (24/32/48) |
| colour on everything (badges, icons, borders, headers all tinted) | neutral UI; colour reserved for data, direction and the one action |

**Looks dated or bulky:** heavy drop shadows on every card; 2 px borders; 48 px desktop inputs; full-width chunky buttons on desktop; bold everywhere; letter-spaced capitals; spinners overlaying the whole page; modals for everything; carousels; placeholder-as-label; legends far from the data; 3D or rainbow charts; animated counters.

**Feels crafted:**
* One alignment grid; numbers right-aligned in tabular figures; units in a lighter tone.
* Hierarchy from size and position, not colour. At most 3 text sizes per card.
* Density: show the number, direction, significance and range on the card face (as the report already does) in 14 px with tight line spacing, instead of large empty cards.
* Microcopy specific to the place and household ("For a household with asthma, smoke days matter most").
* Hover and focus states on everything interactive, all on the same timing tokens. Nothing jumps (reserve space for "Updating…", spinners and hints).
* Empty, error and "not available" states written as carefully as the data state.
* Restraint in motion: one entrance per page; updates cross-fade or swap in place.

---

## 7. Platform support snapshot (15 Nov 2026)

| feature | Chrome/Edge | Safari | Firefox | use? |
|---|---|---|---|---|
| `<input type="month">` | 20+ | macOS no; iOS yes | desktop no; Android listed at 160 [U] | **no** [V] |
| Popover API (`popover="auto"`) | 114+ | 17+ | 125+ | yes [K] |
| `popover="hint"` | 133 partial, 151 full | 27.3 [U] | 149 partial, 153 full | not yet [V caniuse] |
| Interest invokers (`interestfor`) | 142 (blink-dev) / 149 (caniuse) [U] | no | no | no [V] |
| Invoker commands (`commandfor`) | 135+ | 26.2+ | 144+ | yes, Baseline Dec 2025 [V] |
| CSS anchor positioning | 125+ | 26+ | 147+ | yes, Baseline Jan 2026 [V] |
| `<dialog closedby>` | 134+ | no | 141+ | with a JS fallback [V] |
| `appearance: base-select` | 135+ | 27 [U] | flag only | progressive enhancement only |
| View transitions (same-document) | 111+ | 18+ | 144+ | yes, Baseline Oct 2025 [V] |
| `text-box-trim` / `text-box-edge` | 133+ | 18.2+ | 154+ | yes, Baseline mid-2026 [V] |
| `linear()` easing | 113+ | 17.2+ | 112+ | available; not needed [V] |
| `oklch()`, `color-mix()` | 111+ | 15.4+/16.2+ | 113+ | yes [K] |

---

## 8. Not verified / conflicting

* Next.js `axes: ['opsz']` for Inter in next/font 16.4: not tested.
* Inter descender ratio (0.227 vs 0.242 em across sources); the centring conclusion holds either way (±0.007 em).
* `interestfor` shipping version (Chrome 142 per blink-dev Intent to Ship vs 149 per caniuse); caniuse rows listing Chrome 160 / Firefox 163 / Safari 27.3 look like future or preview channels.
* Safari `appearance: base-select` (Safari 27 per one write-up, Technology Preview per another).
* Firefox cross-document view transitions (147 mentioned in one Chrome demo listing only).
* Phosphor SSR import path (`/dist/ssr` vs `/ssr`); Heroicons icon count.
* SWR / TanStack Query sizes come from third-party pages citing Bundlephobia, not Bundlephobia itself.
* Material 3 "Expressive" spring tokens: only third-party values found; not used here.
* Material 3 tonal elevation, Apple HIG 44 pt, iOS input zoom under 16 px, WCAG 2.3.3/2.5.7, Leaflet options: prior knowledge, not re-fetched ([K]).
* Observable Plot crosshair docs returned HTTP 429; Apple HIG and m3.material.io pages render client-side and returned no text.
* Contrast problems in section 1.1 are only problems **if** those tokens are used as small text; the pages' CSS was not read (out of scope).

---

## 9. Sources (d)

Accessibility patterns
* WAI-ARIA APG Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
* APG Listbox: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
* APG Menu button: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ and Menu/Menubar: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
* APG Disclosure: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
* APG Dialog (modal): https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
* APG Tooltip (work in progress): https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
* APG Slider (multi-thumb), Radio group, Tabs [K]: https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/ · https://www.w3.org/WAI/ARIA/apg/patterns/radio/ · https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
* WCAG 2.2 Understanding 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
* WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
* GOV.UK Design System Text input: https://design-system.service.gov.uk/components/text-input/ · Date input: https://design-system.service.gov.uk/components/date-input/
* Primer Tooltip: https://primer.style/product/components/tooltip/ · Primer toasts guidance: https://primer.style/accessibility/toasts/
* Radix Tooltip: https://www.radix-ui.com/primitives/docs/components/tooltip
* Carbon Notification: https://carbondesignsystem.com/components/notification/usage/
* Scott O'Hara, "A toast to a11y toasts": https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html · WAI-IG thread on toasts and 2.2.1: https://lists.w3.org/Archives/Public/w3c-wai-ig/2025AprJun/0083.html
* Lucide accessibility: https://lucide.dev/guide/advanced/accessibility

Platform status
* caniuse input type=month: https://caniuse.com/mdn-html_elements_input_type_month
* caniuse text-box-trim: https://caniuse.com/css-text-box-trim · Mozilla bug 2050141: https://bugzilla.mozilla.org/show_bug.cgi?id=2050141
* caniuse popover=hint: https://caniuse.com/mdn-html_global_attributes_popover_hint · interest invokers: https://caniuse.com/wf-interest-invokers · Chrome guide: https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/interest-triggered-tooltips · blink-dev Intent to Ship: https://groups.google.com/a/chromium.org/g/blink-dev/c/bX1G_yDt6W4
* Invoker commands: https://web-platform-dx.github.io/web-features-explorer/features/invoker-commands/ · https://developer.mozilla.org/docs/Web/API/Invoker_Commands_API
* Anchor positioning Baseline: https://web.dev/blog/web-platform-01-2026
* dialog closedby: https://web-platform-dx.github.io/web-features-explorer/features/dialog-closedby · https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/closedBy
* Customizable select: https://developer.chrome.com/blog/a-customizable-select
* View transitions: https://developer.chrome.com/docs/web-platform/view-transitions · https://web.dev/blog/web-platform-10-2025 · https://caniuse.com/cross-document-view-transitions
* CSS linear() easing: https://developer.chrome.com/docs/css-ui/css-linear-easing-function
* Colour themes with Baseline CSS (OKLCH, relative colour, color-mix): https://web.dev/articles/baseline-in-action-color-theme

Next.js / React
* View transitions guide (16.4): https://unpkg.com/next@16.4.3/dist/docs/01-app/02-guides/view-transitions.md · config page: https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition
* Prefetching guide (16.4): https://unpkg.com/next@16.4.0/dist/docs/01-app/02-guides/prefetching.md · Next 16.3 instant navigations: https://nextjs.org/blog/next-16-3-instant-navigations
* useLinkStatus: https://nextjs.org/docs/app/api-reference/functions/use-link-status
* Fonts: https://nextjs.org/docs/app/getting-started/fonts
* optimizePackageImports: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
* SWR: https://swr.vercel.app/docs/advanced/understanding · sizes: https://blog.logrocket.com/swr-vs-tanstack-query-react · https://www.pkgpulse.com/compare/tanstack__react-query-vs-swr

Motion
* Material 3 motion tokens (Compose source): https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt · spec page: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
* Carbon motion: https://carbondesignsystem.com/elements/motion/overview/
* Apple HIG Motion (not readable by the fetcher): https://developer.apple.com/design/human-interface-guidelines/motion

Type, colour, icons
* Inter: https://rsms.me/inter/ · Inter on Google Fonts (opsz 14-32): https://fonts.google.com/specimen/Inter
* Geist: https://vercel.com/font
* Atkinson Hyperlegible Next: https://fontsource.org/fonts/atkinson-hyperlegible-next/install
* Radix Colors scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
* ColorBrewer: https://colorbrewer2.org/ · Okabe-Ito palette: https://jfly.uni-koeln.de/color/
* Josh W. Comeau, Designing beautiful shadows: https://www.joshwcomeau.com/css/designing-shadows/
* Lucide: https://lucide.dev/guide/ · design guide: https://lucide.dev/contribute/icon-design-guide · stroke width: https://lucide.dev/guide/basics/stroke-width
* Heroicons: https://github.com/tailwindlabs/heroicons · Tabler: https://cdn.jsdelivr.net/npm/@tabler/icons@3.41.1/README.md · Phosphor React: https://github.com/phosphor-icons/react

Loading
* NN/g Progress indicators: https://www.nngroup.com/articles/progress-indicators/
* NN/g Skeleton screens: https://www.nngroup.com/articles/skeleton-screens/

Charts and maps
* OWID Grapher redesign: https://ourworldindata.org/redesigning-our-interactive-data-visualizations · type a year: https://ourworldindata.org/you-can-now-type-to-select-a-specific-year-or-date-in-our-interactive-charts
* Datawrapper accessibility: https://www.datawrapper.de/academy/how-we-make-sure-our-charts-maps-and-tables-are-accessible · keyboard: https://www.datawrapper.de/blog/keyboard-navigation-dynamic-font-scaling
* Highcharts accessibility module: https://highcharts.com/docs/accessibility/accessibility-module-feature-overview
* Observable Plot crosshair (not fetched, 429): https://observablehq.com/plot/marks/crosshair
* Leaflet interactive choropleth: https://leafletjs.com/examples/choropleth/

"AI look"
* 925 Studios, AI slop tells: https://www.925studios.co/blog/ai-slop-design-tells · Adrian Krebs, scoring Show HN design slop: https://adriankrebs.ch/blog/design-slop/ · Kosta Canatselis, Spot the slop: https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c

Computation: OKLCH scales, contrast ratios and colour-vision checks were produced by a throwaway script (OKLab per Björn Ottosson, WCAG 2 relative luminance, Machado et al. 2009 severity-1.0 matrices). The script is not in the repo; rerun the numbers before changing tokens.
