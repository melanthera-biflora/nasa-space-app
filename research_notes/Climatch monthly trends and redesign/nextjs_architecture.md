# Rebuilding Climatch (Vite + React SPA) as a multi-page Next.js App Router app (status: 2026-11-14)

Scope: exact current versions, concrete patterns and pitfalls for moving a Vite + React 19 (JS + JSDoc, MVP layers `api/ -> presenters/ -> views`, Leaflet canvas overlay, hand-written SVG charts, Vitest, CSS tokens, reduced-motion) frontend to a multi-page Next.js app that talks to the existing FastAPI `/api/v1` backend on 127.0.0.1:8000. Local laptop run only.

Version snapshot (npm registry `latest` dist-tags, queried 2026-11-14 via https://registry.npmjs.org/<pkg>):

| Package | Latest | Published | Notes |
|---|---|---|---|
| next | 16.4.6 | 2026-11-09 | peer react `^18.2.0 \|\| ^19.0.0`; optional peers `@playwright/test ^1.51.1`, `babel-plugin-react-compiler` |
| react / react-dom | 19.3.1 | 2026-10-14 | |
| eslint-config-next / @next/eslint-plugin-next / @next/env | 16.4.6 | 2026-11-09 | eslint-config-next peer `eslint >=9` |
| react-leaflet | 5.0.0 | 2024-12-14 | peer `leaflet ^1.9.0`, `react ^19`, `react-dom ^19` |
| leaflet | 1.9.4 (stable) | 2023-05-18 | `beta` tag = 2.0.0-beta.4 |
| nuqs | 2.10.3 | 2026-11-10 | peer `next >=14.2.0` |
| recharts | 3.10.1 | 2026-07-25 | peer React 16.8-19 |
| @observablehq/plot | 0.6.19 | 2026-11-05 | |
| @visx/visx | 4.0.0 | 2026-06-11 | peer React 18/19 |
| echarts / echarts-for-react | 6.1.0 / 3.0.6 | 2026-05-19 / 2026-01-21 | |
| @nivo/core, line, heatmap | 0.99.0 | 2025-05-23 | no release for ~18 months |
| d3 | 7.9.2 | 2026-11-03 | |
| motion / framer-motion | 14.14.0 | 2026-11-13 | peer React 18/19 |
| vitest | 5.1.0 | 2026-11-02 | **`vite` is a required (non-optional) peer** `^6.4 \|\| ^7 \|\| ^8` |
| vite | 8.3.8 | 2026-11-11 | |
| @vitejs/plugin-react | 6.3.0 | 2026-11-09 | peer `vite ^8.0.0` |
| jsdom | 31.0.1 | 2026-11-13 | |
| @testing-library/react | 16.3.3 | 2026-08-27 | peer `@testing-library/dom ^10` |
| @playwright/test | 1.65.1 | 2026-11-13 | |
| eslint | 10.15.0 | 2026-11-13 | |
| openapi-typescript / openapi-fetch | 7.13.0 / 0.17.0 | 2026-02-11 | openapi-typescript peer **`typescript ^5.x`** |
| typescript | 7.0.2 | 2026-07-08 | conflicts with openapi-typescript's `^5.x` peer |
| orval | 8.48.0 | 2026-11-14 | |
| @hey-api/openapi-ts | 0.99.0 | 2026-06-22 | peer TS `>=5.5.3 \|\| >=6` |
| swr / @tanstack/react-query | 2.5.1 / 5.107.1 | 2026-08-12 / 2026-11-06 | |

Source for every row: [npm registry](https://registry.npmjs.org/next) (same endpoint per package name, e.g. [react-leaflet](https://registry.npmjs.org/react-leaflet), [vitest](https://registry.npmjs.org/vitest), [openapi-typescript](https://registry.npmjs.org/openapi-typescript), [typescript](https://registry.npmjs.org/typescript)).

---

## 1. What is the current stable Next.js (and React), and what changed in the App Router since Next 15?

### Takeaway
Stable is **Next.js 16.4** (16.4.6 patch, 2026-11-09), shipping **React 19.3** (react 19.3.1 on npm). 16.x made Turbopack the default bundler, renamed `middleware.ts` to `proxy.ts`, removed sync `params`/`searchParams`, removed `next lint`, and introduced Cache Components (`'use cache'`), which 16.4 now recommends for every app, enables by default in `create-next-app`, and will make the default in Next 17.

### Cited Findings
- Release timeline: Next 16 (2025-10-21), 16.1 (2025-12-18), 16.2 (2026-03-18), 16.3 (2026-08-03), **16.4 (2026-10-06)**. Monthly scheduled security releases since mid-2026, the latest on 2026-11-03, plus out-of-band updates on 2026-09-22 and 2026-10-14. — [Next.js blog index](https://nextjs.org/blog)
- `next@latest` is 16.4.6 (2026-11-09); `react`/`react-dom` latest is 19.3.1 (2026-10-14). A search aggregator lists v16.4.5 and v15.5.29 on 2026-11-03 and a 16.5.0 canary on 2026-11-07, so 16.5 is not stable yet. — [npm registry: next](https://registry.npmjs.org/next); [releases.sh (aggregator)](https://releases.sh/vercel/nextjs)
- 16.4: "Next.js 16.4 ships with React 19.3, bringing stable View Transitions and Fragment Refs, the new `browser()` API, and more." — [Next.js 16.4 blog](https://nextjs.org/blog/next-16-4)
- 16.4: Cache Components "will become the default in Next.js 17"; "Starting with Next.js 16.4, we're excited to recommend Cache Components as the best choice for every Next.js app"; "all new apps created with `create-next-app` will have Cache Components enabled by default." It is turned on with `cacheComponents: true, partialPrefetching: true`. — [Next.js 16.4 blog](https://nextjs.org/blog/next-16-4)
- 16.4 also adds `ensureStatic` route config, `navigation()`/`prefetch()` from `next/cache`, `next upgrade --agent`, 20-25% smaller Turbopack disk cache, a shared Turbopack runtime chunk, shorter production CSS Module class names, and experimental flags: Rust React Compiler, `turbopackGc`, `turbopackLazyDynamicImports`, worker threads. — [Next.js 16.4 blog](https://nextjs.org/blog/next-16-4)
- 16.0 breaking changes:
  - Minimum Node.js 20.9 and TypeScript 5.1. Supported browsers: Chrome/Edge/Firefox 111+ and Safari 16.4+.
  - Turbopack is the default for `next dev` and `next build`; use `--webpack` to opt out.
  - `next lint` is removed.
  - Sync `params`/`searchParams` and sync `cookies()`/`headers()`/`draftMode()` access is removed ("Must use async: `await params`, `await searchParams`").
  - `serverRuntimeConfig`/`publicRuntimeConfig` are removed.
  - Automatic `scroll-behavior: smooth` is removed; add `data-scroll-behavior="smooth"` to opt back in.
  - Parallel route slots now require `default.js`.
  - `next dev` and `next build` use separate output directories, and a lockfile prevents multiple `next dev` instances.
  - Source: [Next.js 16 blog](https://nextjs.org/blog/next-16)
- 16.0: "`proxy.ts` replaces `middleware.ts`… `proxy.ts` runs on the Node.js runtime." `middleware.ts` "is still available for Edge runtime use cases, but it is deprecated and will be removed in a future version." — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- 16.0 caching APIs: `revalidateTag(tag, profile)` now needs a `cacheLife` profile as its second argument (the single-argument form is deprecated). `updateTag()` and `refresh()` are new and only usable in Server Actions. `experimental.dynamicIO` was renamed `cacheComponents`, and the `experimental.ppr` flag was removed. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- 16.0 deprecations: `middleware.ts`, `next/legacy/image`, `images.domains` (use `remotePatterns`), and single-argument `revalidateTag`. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- "The App Router in Next.js 16 uses the latest React Canary release". The 16.0 highlights were React 19.2's View Transitions, `useEffectEvent`, and `<Activity/>`. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- The redesigned `create-next-app` template defaults to App Router, TypeScript-first, Tailwind CSS, and ESLint. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- React 19.3 (2026-09-09) stabilized `<ViewTransition>`, Fragment refs, `browser()` (`use(browser())` suspends during server render only), Trusted Types support, and Context rendering directly from Server Components. The post doesn't state the exact stable patch number; its examples pin canaries. — [React 19.3 blog](https://react.dev/blog/2026/09/09/react-19-3)
- Upgrade commands: `npx @next/codemod@canary upgrade latest` or `npm install next@latest react@latest react-dom@latest`. 16.4 also offers `npx next@canary upgrade --agent=latest`. — [Next.js 16 blog](https://nextjs.org/blog/next-16); [Next.js 16.4 blog](https://nextjs.org/blog/next-16-4)

### Inferences
- Target `next@16.4.6`, `react@19.3.1`, `react-dom@19.3.1`, Node 20.9+ (Node 22 LTS or 24 is fine; ESLint 10 needs Node ^20.19 / ^22.13 / >=24). Pin exact versions in `package.json` for a demo that must not drift.
- `create-next-app@latest` now produces TypeScript + Tailwind + Cache Components. For this team (JS + JSDoc, CSS tokens, no Tailwind) it's simpler to hand-create the app via the Vite migration path (Q2) or answer the CLI prompts explicitly (JS, no Tailwind). Either way, decide Cache Components on or off deliberately (see Q3).
- Nothing in Climatch needs `proxy.ts`. Leave both `proxy.ts` and `middleware.ts` out.
- Stay on the patched 16.4.x line: the blog shows frequent security releases, including a critical RSC CVE (CVE-2025-66478) in Dec 2025, so `npm i next@16.4.6` is not optional.

### Gaps
- I did not read the 2026-11-03 security release post, so which CVEs 16.4.5/16.4.6 fix is unverified.
- Exact React 19.3.0 release date vs 19.3.1: the blog is dated 2026-09-09, and npm shows 19.3.1 on 2026-10-14.

---

## 2. Official guidance for migrating from Vite (steps; what stays client-side)

### Takeaway
The official guide (updated 2026-09-28) first gets the Vite app running unchanged as a client-only SPA inside Next. It does this with an optional catch-all route `app/[[...slug]]/page.js` that renders `<App/>` through `next/dynamic(..., { ssr: false })` in a `'use client'` wrapper, and only then splits routes into real `app/` pages. The guide sets `output: 'export'`, which **disables rewrites**. Climatch needs the `/api` proxy, so drop that line.

### Cited Findings
- The goal is "a working Next.js application as quickly as possible… keep it as a purely client-side application (SPA) without migrating your existing router." — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- Steps:
  1. `npm install next@latest`.
  2. Create `next.config.mjs` with `output: 'export'` and `distDir: './dist'`.
  3. TypeScript only: tsconfig changes (skip for JS).
  4. Convert `index.html` into `app/layout.js`. Next adds charset and viewport meta tags by default. Move the favicon and other icons into `app/` as metadata files, and move `<title>`/description into `export const metadata`.
  5. Create `app/[[...slug]]/page.js` (a Server Component) that imports global CSS and exports `generateStaticParams() { return [{ slug: [''] }] }`, plus `app/[[...slug]]/client.js` (`'use client'`) with `const App = dynamic(() => import('../../App'), { ssr: false })`.
  6. Static image imports return an object; use `.src` with `<img>`.
  7. Rename `VITE_` env vars to `NEXT_PUBLIC_`.
  8. Scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`; gitignore `.next`, `next-env.d.ts`, `dist`.
  9. Delete `main.jsx`, `index.html`, `vite.config.*`, and "Uninstall Vite dependencies".
  - Source: [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- "Turbopack supports Vite's built-in `import.meta.env.MODE`, `DEV`, `PROD`, `BASE_URL`, and `SSR` properties with no changes needed". `import.meta.glob` is supported. The `?raw`/`?url` queries need a `turbopack.rules` entry. — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- Client Components "are still prerendered to HTML on the server"; `ssr: false` disables prerendering "from the `App` component down". — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- Recommended next steps after the SPA stage: migrate the router to the App Router (code splitting, streaming, RSC), then `next/image`, `next/font`, `next/script`, and ESLint. — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- Rewrites, redirects, headers, proxy, Server Actions, ISR, and default-loader image optimization are all "not supported" with `output: 'export'`. — [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- The SPA guide calls the Vite and CRA migration paths incremental and lists the SPA patterns: `use()` plus context, browser-only rendering, shallow routing via `history.pushState`, and Server Actions. — [Next.js: SPAs guide](https://nextjs.org/docs/app/guides/single-page-applications)

### Inferences
- A practical Climatch path, a few days per stage:
  - **Day 0.5:** follow the guide verbatim *except* `output: 'export'`/`distDir`. Add a `rewrites()` for `/api/:path*` (Q3) so the existing `api/` layer keeps calling relative `/api/v1/...` URLs. The app should then run exactly as before on :3000.
  - **Days 1-3:** replace the catch-all with real routes (`app/page.js` overview, `app/trends/monthly/page.js`, `app/trends/weekly/page.js`, `app/seasons/page.js`, `app/events/page.js`, `app/compare/page.js`, `app/map/page.js`). Move the header, nav, and footer into `app/layout.js`, then delete the catch-all.
  - **Day 3+:** optionally move initial data fetching into Server Components.
- What stays client-side (`'use client'`):
  - Anything using hooks, event handlers, `window`/`document`, or Leaflet (all map code).
  - Interactive chart wrappers (hover, keyboard focus, brushing) and form controls bound to URL state.
  - Presenters (pure functions) and the `api/` layer are environment-neutral and can be imported from both server and client files. Keep them free of `window` access at module scope.
- Keep `vite` installed as a devDependency even after "Uninstall Vite dependencies": Vitest 5 requires it (Q8).

### Gaps
- The guide doesn't cover migrating a hand-rolled router (Climatch uses none or a simple one). Route-by-route conversion is left to the App Router docs.

---

## 3. Talking to FastAPI: rewrites vs Route Handlers vs Server Component fetches; caching; keeping the OpenAPI contract in JS

### Takeaway
For a local demo, a **`rewrites()` proxy from `/api/:path*` to `http://127.0.0.1:8000/api/:path*`** is the least-change option. It is the direct equivalent of the Vite proxy, keeps same-origin relative URLs, and needs no CORS. Server Components may additionally fetch FastAPI directly by absolute URL from a server-only env var. Under Cache Components, wrap those fetches in `'use cache'` plus `cacheLife(...)` or a `<Suspense>` boundary. Route Handlers only add a hop and are unnecessary. For the contract, generate a `.d.ts` with `openapi-typescript` (pin `typescript@5`) and reference it from JSDoc.

### Cited Findings
- External rewrites are supported: `{ source: '/blog/:slug', destination: 'https://example.com/blog/:slug' }`. "Rewrites act as a URL proxy and mask the destination path". "Rewrites are applied to client-side routing". `afterFiles` (the default array form) applies "after checking the filesystem (pages and /public files) and before dynamic routes". `fallback` applies after dynamic routes. — [Next.js: rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
- Rewrites (and redirects, headers, proxy) are unsupported with `output: 'export'`. — [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- Cache Components model:
  - `'use cache'` caches the return value of async functions and components at the data level or UI level; "We recommend pairing every cache directive with a `cacheLife`".
  - Arguments become part of the cache key.
  - Uncached async work must sit inside `<Suspense>`, or the dev overlay shows a "blocking-route" insight.
  - `searchParams` and `params` are "Runtime APIs" that should be read inside `<Suspense>`.
  - Example: `'use cache'; cacheLife('hours'); cacheTag('posts'); const res = await fetch(...)`.
  - Source: [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching)
- "Data sources available during the build-time prerender have to be available at request time too", and cached results are "included in the static shell" at build time. — [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching)
- With Cache Components, `Math.random()`, `Date.now()`, and `crypto.randomUUID()` must be explicitly handled, either with `await connection()` inside `<Suspense>` or by caching the value. — [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching)
- Non-Cache-Components apps follow the "Caching and Revalidating (Previous Model)" guide. — [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching)
- SPA pattern: start the fetch in a Server Component without awaiting it, pass the Promise to a Client Component, unwrap it with `use()` under `<Suspense>`, and wrap shared fetchers in `React.cache`. For polling and mutations, use SWR or TanStack Query. — [Next.js: SPAs guide](https://nextjs.org/docs/app/guides/single-page-applications)
- Under `output: 'export'`, Server Components "run during the build". Client-side fetching with SWR "behaves like a traditional SPA". — [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- openapi-typescript CLI: `npx openapi-typescript ./path/to/my/schema.yaml -o ./path/to/my/schema.d.ts` (JSON or YAML input). It generates "runtime-free types" with no Java or running server needed. — [openapi-ts.dev introduction](https://openapi-ts.dev/introduction)
- openapi-typescript 7.13.0 declares `peerDependencies: { typescript: '^5.x' }`, while `typescript@latest` is 7.0.2. — [npm registry: openapi-typescript](https://registry.npmjs.org/openapi-typescript); [npm registry: typescript](https://registry.npmjs.org/typescript)

### Inferences
- `next.config.mjs` (JS, local only):
  ```js
  /** @type {import('next').NextConfig} */
  const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8000'
  export default {
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }]
    },
    // cacheComponents: true, partialPrefetching: true,  // decide explicitly (see below)
  }
  ```
  The existing `api/` client keeps `fetch('/api/v1/...')` unchanged in the browser.
- Server Components cannot use a relative `/api/v1` URL because there is no browser origin. Use `${process.env.API_ORIGIN}/api/v1/...` with no `NEXT_PUBLIC_` prefix. Make the `api/` module take a base-URL argument so one module serves both sides.
- Cache Components decision for a demo:
  - **On:** report endpoints whose data changes only when the pipeline reruns can be wrapped as `async function getMonthlyTrend(place, variable) { 'use cache'; cacheLife('hours'); ... }`. You get instant navigations, but every uncached read needs `<Suspense>`, and Date/Math.random must be guarded.
  - **Off (previous model):** fewer rules during a rushed migration.
  - Either way, **FastAPI must be running during `next build`** if any cached component fetches at build time. This is an easy surprise.
- Route Handlers (`app/api/.../route.js`) are only worth it to reshape or merge responses server-side. A pure pass-through proxy is what `rewrites` already does.
- Contract in JS:
  1. `npm i -D typescript@5 openapi-typescript@7.13.0`.
  2. `npx openapi-typescript ../backend/openapi.json -o src/api/schema.d.ts` (add as an npm script and rerun on contract change).
  3. In JS files, use JSDoc type imports from the `.d.ts` (`/** @typedef {import('./schema').components['schemas']['MonthlyTrend']} MonthlyTrend */`) with `// @ts-check` or `jsconfig.json` `checkJs`.
  - Optionally use `openapi-fetch@0.17.0`'s typed `createClient` from JS with JSDoc. I did not verify its size or API in this session.
  - Orval and @hey-api/openapi-ts generate client code (TS-oriented) and are heavier than needed here.

### Gaps
- I didn't fetch the "Caching and Revalidating (Previous Model)" page, so the exact default for un-annotated `fetch` without Cache Components in 16.4 is not quoted here (it was uncached by default since Next 15 per earlier release notes, not re-verified).
- `experimental.proxyTimeout` and other rewrite-proxy timeout knobs are not documented on the rewrites page. Long FastAPI computations through the proxy may hit an undocumented timeout; untested.
- Whether Cache Components works with `output: 'export'` was not found in the docs I read.
- openapi-fetch docs and JSDoc `@import` usage were not verified on openapi-ts.dev; the intro page shows only TS imports.

---

## 4. Leaflet in the App Router: `'use client'` + `dynamic(ssr:false)`, react-leaflet v5 status, window/document pitfalls, CSS

### Takeaway
Leaflet touches `window` at import time, so load the map component only in the browser. Use `dynamic(() => import('./MapView'), { ssr: false })` **inside a `'use client'` file**, because `ssr:false` is still disallowed in Server Components. React 19.3 adds an alternative, `use(browser())` with Suspense. Stay on **Leaflet 1.9.4**. react-leaflet 5.0.0 (Dec 2024) is the React 19 line, but it is low-activity and its "Map container is already initialized" Strict Mode issue is still open. Climatch's imperative features (canvas overlay, keyboard nav, cooperative wheel zoom) are easiest to keep as plain Leaflet inside one `useEffect`.

### Cited Findings
- "`ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components… Please move it into a Client Component." Also: "When a Server Component dynamically imports a Client Component, automatic code splitting is currently **not** supported." (doc updated 2026-03-10). — [Next.js: Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- Browser-only rendering options:
  - `next/dynamic` with `ssr: false` "can be useful for third-party libraries that rely on browser APIs like `window` or `document`".
  - Alternatively, React 19.3 `use(browser())`: "During prerendering, `use(browser())` suspends to the closest `<Suspense>` boundary. The fallback becomes the component's initial HTML". The import is `import { browser } from 'react-dom'`.
  - Source: [Next.js: SPAs guide](https://nextjs.org/docs/app/guides/single-page-applications)
- "Client Components are prerendered to HTML during `next build`. Because Web APIs like `window`, `localStorage`, and `navigator` are not available on the server, you need to safely access these APIs only when running in the browser", e.g. inside `useEffect`. — [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- react-leaflet latest is 5.0.0 (2024-12-14), peer `leaflet ^1.9.0`, `react ^19.0.0`, `react-dom ^19.0.0`. The `next` tag is still 5.0.0-rc.2. — [npm registry: react-leaflet](https://registry.npmjs.org/react-leaflet)
- The react-leaflet repo's last commits are dependency updates on 2025-06-21 and 2025-05-26. — [GitHub API: react-leaflet commits](https://api.github.com/repos/PaulLeCam/react-leaflet/commits)
- Issue #1133 "React 19 Old Error Back: Uncaught Error: Map container is already initialized." has been open since 2024-05-16. — [react-leaflet #1133](https://github.com/PaulLeCam/react-leaflet/issues/1133)
- Leaflet stable is 1.9.4 (2023-05-18). The npm `beta` tag is 2.0.0-beta.4. — [npm registry: leaflet](https://registry.npmjs.org/leaflet)
- Leaflet 2.0 drops UMD and the global `L` in favor of ESM and targets evergreen browsers. — [Leaflet 2.0 alpha announcement](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html)
- A third-party project states react-leaflet has no Leaflet 2 line; this is not an official statement. — [dash-leaflet2](https://github.com/pip-install-python/dash-leaflet2)
- Bundle sizes (whole package, min+gzip): leaflet@1.9.4 is about 42.7 kB; react-leaflet@5.0.0 is about 3.5 kB. — [Bundlephobia API: leaflet](https://bundlephobia.com/api/size?package=leaflet@1.9.4); [Bundlephobia API: react-leaflet](https://bundlephobia.com/api/size?package=react-leaflet@5.0.0)
- The Vite guide imports global CSS from a page file (`import '../../index.css'`). — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)

### Inferences
- Pattern (JS):
  ```jsx
  // app/map/map-client.js
  'use client'
  import dynamic from 'next/dynamic'
  const TrendMap = dynamic(() => import('@/views/TrendMap'), {
    ssr: false,
    loading: () => <div className="map-skeleton" aria-busy="true">Loading map…</div>,
  })
  export default function MapClient(props) { return <TrendMap {...props} /> }

  // views/TrendMap.js  (imports 'leaflet' at top — only ever loaded in the browser)
  'use client'
  import { useEffect, useRef } from 'react'
  import L from 'leaflet'
  export default function TrendMap({ grid, bounds }) {
    const el = useRef(null)
    useEffect(() => {
      const map = L.map(el.current, { scrollWheelZoom: false /* cooperative zoom handled by existing code */ })
      // ...existing canvas overlay, keyboard handlers...
      return () => map.remove()   // required: Strict Mode mounts effects twice in dev
    }, [])
    return <div ref={el} className="map" role="region" aria-label="US trend map" />
  }
  ```
  `app/map/page.js` (a Server Component) renders `<MapClient …/>` and can fetch the grid metadata server-side.
- Import `leaflet/dist/leaflet.css` once in `app/layout.js` (or the map page), not inside the dynamically imported component, so the CSS is in the initial HTML and doesn't flash.
- Do **not** adopt Leaflet 2.0 betas for the demo. They are ESM-only, the global `L` is gone, and react-leaflet and plugins aren't aligned.
- If the team prefers JSX map composition, `react-leaflet@5.0.0` works with React 19 and Leaflet 1.9. Wrap it the same way (`ssr:false` inside a client file) and expect the double-init error in dev Strict Mode (#1133).
- Pass map data as serializable props (plain arrays and numbers) from the Server Component. Functions and class instances cannot cross the server-to-client boundary.

### Gaps
- No official react-leaflet statement on Leaflet 2 support was found. Issue #1133's status in practice with react-leaflet 5 and React 19.3 is not confirmed.
- I didn't verify whether Next 16.4 tree-shakes or chunk-splits Leaflet differently with `turbopackLazyDynamicImports`.

---

## 5. Charts compatible with React 19 and Server Components (time series, heatmaps, small multiples): bundle size and accessibility

### Takeaway
Climatch's hand-written SVG charts are the best fit for the App Router. Pure SVG markup computed by presenters (optionally with `d3-scale`/`d3-shape`) can render as **Server Components**, which ships zero chart JS, with small client islands only for hover and focus. If a library is needed: **Observable Plot** is the most concise for heatmaps and small multiples (facets) and can SSR via its `document` option, but only for small data. **visx 4** is the modular low-level React option. **Recharts 3** is a hook-based client component with `accessibilityLayer` on by default. ECharts 6 is heavy, and Nivo hasn't released since May 2025.

### Cited Findings
- Observable Plot in React has two recommended approaches:
  - SSR with `Plot.plot({...options, document: new Document()}).toHyperScript()` using a virtual `Document`.
  - Client-side `useRef` + `useEffect` that appends the plot and calls `plot.remove()` on cleanup.
  - The docs warn: "Server-side rendering is only practical for simple plots of small data; complex plots, such as geographic maps or charts with thousands of elements, are better rendered on the client because the serialized SVG is large."
  - Source: [Observable Plot getting-started (docs source)](https://raw.githubusercontent.com/observablehq/plot/main/docs/getting-started.md)
- Recharts 3.0:
  - Internal state was rewritten (`CategoricalChartState` removed).
  - "`accessibilityLayer`… true by default".
  - `react-smooth` and `recharts-scale` dependencies were removed, and the es6 target drops es5 polyfills.
  - Minimum React 16.8 / Node 18 / TS 5.
  - Source: [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- Recharts latest is 3.10.1 (2026-07-25) with a peer range including React 19. — [npm registry: recharts](https://registry.npmjs.org/recharts)
- visx v4 is "the current stable release and requires React 18 or 19". Upgrade all `@visx/*` to `^4.0.0` and use package-root imports. `withBoundingRects` users must forward `nodeRef` (React 19 strict mode). — [visx MIGRATION.md](https://cdn.jsdelivr.net/gh/airbnb/visx@master/MIGRATION.md)
- `@visx/visx` 4.0.0 was published 2026-06-11. — [npm registry: @visx/visx](https://registry.npmjs.org/@visx/visx)
- `@nivo/*` latest is 0.99.0 (2025-05-23); its peer range includes React 19. ECharts latest is 6.1.0 (2026-05-19), and `echarts-for-react` is 3.0.6 with peer `echarts ^3-^6`. — [npm registry: @nivo/core](https://registry.npmjs.org/@nivo/core); [npm registry: echarts](https://registry.npmjs.org/echarts); [npm registry: echarts-for-react](https://registry.npmjs.org/echarts-for-react)
- Whole-package min+gzip sizes (not tree-shaken), from the [Bundlephobia API](https://bundlephobia.com/api/size?package=recharts@3.10.1) (same endpoint per package):

  | Package | min+gzip |
  |---|---|
  | recharts 3.10.1 | ~150 kB |
  | @observablehq/plot 0.6.19 | ~127 kB |
  | echarts 6.1.0 | ~368 kB |
  | @nivo/line 0.99.0 | ~96 kB |
  | motion 14.14.0 | ~64 kB |
  | d3-scale | ~17.6 kB |
  | d3-shape | ~8.5 kB |
  | @visx/shape 4.0.0 | ~10.7 kB |
  | @visx/scale 4.0.0 | ~17.5 kB |

### Inferences
- Recommendation for Climatch: keep the existing SVG charts. Convert purely presentational charts (axes, lines, heatmap cells, small-multiple grids) to Server Components that take presenter output as props: no hooks, no `'use client'`, zero client JS. Make only the interactive layer (tooltip, crosshair, keyboard focus over points) a client component that receives the same geometry.
- Add `d3-scale` and `d3-shape` only if they replace hand-rolled math. Each is under 20 kB gzip and works on the server.
- If a library is added for speed of authoring heatmaps and small multiples, use Observable Plot, client-rendered via `useRef`/`useEffect` for large grids. That keeps SSR HTML small, per Plot's own guidance.
- Accessibility for hand-written SVG:
  - Give each chart `role="img"` and an `aria-labelledby` that points at a `<title>` and `<desc>`.
  - Show a visible caption or summary sentence produced by the presenter.
  - Put a "Show data table" `<details>` fallback next to each chart (it can be server-rendered).
  - Keyboard-focusable points need visible focus styles.
  - Recharts' `accessibilityLayer` covers keyboard navigation only for Recharts charts.
- Every chart library that uses hooks, effects, or canvas (Recharts, Nivo, ECharts, visx event handlers) needs `'use client'` in Next.

### Gaps
- observablehq.com returned HTTP 429, so Plot's accessibility options (`ariaLabel`/`ariaDescription`) and its current version notes weren't verified from the rendered docs.
- I didn't find official SSR or `'use client'` statements for Recharts 3, Nivo, or ECharts in the pages read.
- Bundlephobia figures are whole-package and don't reflect tree-shaking (e.g. ECharts' `echarts/core` modular import).

---

## 6. URL state for shareable analyses: `searchParams`, nuqs, `useSearchParams` Suspense requirement

### Takeaway
Use **path segments for the page type** (`/trends/monthly`, `/seasons`, `/compare`, `/map`) and **search params for analysis state** (`place`, `var`, `period`, `month`, `week`). Read them on the server via the async page `searchParams` prop (it must be awaited in Next 16), and on the client via **nuqs 2.10.3**. nuqs gives typed parsers, a Next App Router adapter, and server loaders. Any client component calling `useSearchParams` (nuqs included) on a prerendered route must sit under `<Suspense>`, or the **production build fails**. Dev mode hides this.

### Cited Findings
- `useSearchParams` "is a Client Component hook". If a route is prerendered, calling it "will cause the Client Component tree up to the closest `Suspense` boundary to be client-side rendered". "During production builds, a static page that calls `useSearchParams` from a Client Component must be wrapped in a `Suspense` boundary, otherwise the build fails with the Missing Suspense boundary with useSearchParams error". "In development… `useSearchParams` doesn't suspend and things may appear to work without `Suspense`." (doc updated 2026-11-06). — [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- Layouts "do not receive the `searchParams` prop" because shared layouts aren't re-rendered on navigation. Use the page prop or `useSearchParams`. With Cache Components, a browser-only component should use `use(browser())` "instead of relying on the `useSearchParams` boundary". — [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- `params`/`searchParams` sync access was removed in Next 16: "Must use async: `await params`, `await searchParams`". — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- Native `window.history.pushState`/`replaceState` "integrate… into the router, so components that render with `usePathname` or `useSearchParams` update when the URL changes". — [Next.js: SPAs guide](https://nextjs.org/docs/app/guides/single-page-applications)
- nuqs adapter: `import { NuqsAdapter } from 'nuqs/adapters/next/app'`, wrapping `{children}` in the root layout. — [nuqs: Adapters](https://nuqs.dev/docs/adapters)
- nuqs server side:
  - Import from `nuqs/server`.
  - `createLoader({...parsers})` "accepts the Promise" of Next's async `searchParams`: `const { latitude } = await loadSearchParams(searchParams)`.
  - `createSearchParamsCache` reads params in nested Server Components.
  - `{ strict: true }` throws on invalid values.
  - Source: [nuqs: Server-side usage](https://nuqs.dev/docs/server-side)
- nuqs options:
  - Updates are "client-first… there are no network calls to the server" (shallow by default). Set `shallow: false` to re-render RSC.
  - `history` defaults to replace; use `'push'` for back-button stepping.
  - `clearOnDefault` defaults to `true` since 2.0.
  - `limitUrlUpdates: throttle(ms)|debounce(ms)` (`throttleMs` is deprecated since 2.5.0).
  - `startTransition` can be passed alongside `shallow:false` for a loading flag.
  - Source: [nuqs: Options](https://nuqs.dev/docs/options)
- nuqs 2.10.3 (2026-11-10), peer `next >=14.2.0`, about 6.5 kB min+gzip. — [npm registry: nuqs](https://registry.npmjs.org/nuqs); [Bundlephobia API: nuqs](https://bundlephobia.com/api/size?package=nuqs@2.10.3)

### Inferences
- Shared parser module, imported by both server and client:
  ```js
  // src/url-state.js
  import { parseAsString, parseAsInteger, createLoader } from 'nuqs/server'
  export const analysisParams = {
    place: parseAsString.withDefault('US'),
    var:   parseAsString.withDefault('tmax'),
    period: parseAsString.withDefault('1991-2020'),
    month: parseAsInteger,      // 1..12, validate range in presenter
    week:  parseAsInteger,      // 1..53
  }
  export const loadAnalysisParams = createLoader(analysisParams)
  ```
  The page does `const state = await loadAnalysisParams(searchParams)` and passes `state` to views. Client controls call `useQueryStates(analysisParams, { shallow: false, history: 'push' })` when the server must refetch. With `shallow: true` (default), only client components re-render.
- Validate at the trust boundary. URL values are user input, so clamp month (1-12) and week (1-53) and allowlist `var` before passing them to FastAPI. FastAPI should still validate too.
- Generate shareable links with `<Link href={{ pathname: '/compare', query: {...} }}>` and set per-page `generateMetadata` titles from the params. This also feeds the route announcer (Q10).
- Run `next build` early and often, ideally in CI. The missing-Suspense failure only shows in production builds.

### Gaps
- I didn't find `parseAsStringLiteral` or `createSerializer` documentation in the pages read.
- nuqs documentation doesn't list a maximum supported Next version, though the peer range `>=14.2.0` includes 16.4.

---

## 7. Page transitions and motion (View Transitions API in React/Next; Motion compatibility; reduced motion)

### Takeaway
Since React 19.3 (bundled with Next 16.4), `<ViewTransition>` is stable and "works in the App Router with no configuration". Navigations are transitions, so wrapping page content (not layouts) animates route changes. `<Link transitionTypes={['nav-forward']}>` (Next 16.2+) gives directional variants. Reduced motion is **not automatic**: add a `@media (prefers-reduced-motion: reduce)` rule that zeroes `::view-transition-*` animation durations. Motion (framer-motion) 14.14 supports React 19 if needed, but it isn't required.

### Cited Findings
- "View transitions work in the App Router with no configuration. React 19.3 includes the `<ViewTransition>` component and `addTransitionType` API". "In Next.js, route navigations are transitions, so `<ViewTransition>` animations activate automatically during navigation." Regular `setState` calls do not trigger them. — [Next.js: View transitions guide (updated 2026-10-15)](https://nextjs.org/docs/app/guides/view-transitions)
- Browser support: the feature uses "transition types and `view-transition-class`, available in Chromium 125+ and recent Safari and Firefox versions… Without browser support, your application works normally; the transitions do not animate." — [Next.js: View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- "Put the wrapper in each `page.tsx`, not the layout. Layouts persist across navigations, so enter and exit never fire there." Use `default="none"` to avoid every named VT animating on unrelated transitions. Browser back/forward carries no transition type. Anchor the header with `viewTransitionName` and `animation: none`. Add `::view-transition { pointer-events: none; }` to keep the page clickable. — [Next.js: View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- Reduced motion recipe:
  ```css
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
      animation-duration: 0s !important; animation-delay: 0s !important; } }
  ```
  — [Next.js: View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- `<Link transitionTypes={[...]}>` was added in v16.2.0; `router.push`/`replace` also accept `transitionTypes`. — [Next.js: Link](https://nextjs.org/docs/app/api-reference/components/link); [Next.js: View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- The React 19.3 post doesn't mention `prefers-reduced-motion`. — [React 19.3 blog](https://react.dev/blog/2026/09/09/react-19-3)
- Motion for React: `<MotionConfig reducedMotion="user">` disables transform and layout animations while keeping opacity and color. `useReducedMotion()` returns a boolean. The docs' examples import from `framer-motion`. — [Motion: Accessibility](https://motion.dev/docs/react-accessibility)
- `motion` and `framer-motion` are both 14.14.0 (2026-11-13), peer React 18/19. — [npm registry: motion](https://registry.npmjs.org/motion)
- Next 16 removed automatic `scroll-behavior: smooth`; add `data-scroll-behavior="smooth"` on `<html>` to opt back in. — [Next.js 16 blog](https://nextjs.org/blog/next-16)

### Inferences
- For Climatch, use CSS plus `<ViewTransition>` only:
  - A subtle crossfade on page content.
  - A same-route crossfade keyed on `var`/`place` (`<ViewTransition key={variable} share="auto" enter="auto" default="none">`) when switching variables.
  - The header anchored.
  - The reduced-motion rule added to the token stylesheet.
  - Skipping Motion saves about 64 kB gzip.
- If smooth scrolling is reintroduced via `data-scroll-behavior="smooth"`, also add `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`.
- Don't name (`viewTransitionName`) the Leaflet container. The map's canvas and tiles shouldn't be snapshotted mid-animation (untested assumption).

### Gaps
- No source states whether `<ViewTransition>` interacts badly with Leaflet canvases or `ssr:false` dynamic components.
- Motion's default `reducedMotion` value is not stated on the page read.

---

## 8. Testing (Vitest, Playwright) and ESLint (flat config)

### Takeaway
The official Vitest guide (updated 2026-08-25) uses `vitest` + `@vitejs/plugin-react` + `jsdom` + `@testing-library/react` + `@testing-library/dom` with a plain `vitest.config.js`. Async Server Components aren't supported, so test them with E2E (Playwright 1.65.1). Climatch's presenter tests (pure functions) carry over untouched. `next lint` is gone. Use `eslint` 10.x with a flat `eslint.config.mjs` spreading `eslint-config-next/core-web-vitals`.

### Cited Findings
- "Since `async` Server Components are new to the React ecosystem, Vitest currently does not support them… we recommend using **E2E tests** for `async` components." — [Next.js: Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest)
- JS setup:
  - Install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom`.
  - Config: `vitest.config.js`: `import { defineConfig } from 'vitest/config'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()], test: { environment: 'jsdom' } })`.
  - Script: `"test": "vitest"`. Tests may live in `__tests__` or be colocated in `app/`.
  - Source: [Next.js: Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest)
- vitest 5.1.0 lists `vite` as a **required** peer (`peerDependenciesMeta.vite.optional = false`), and vite is not a direct dependency. `@vitejs/plugin-react` 6.3.0 needs `vite ^8.0.0`; vite latest is 8.3.8. — [npm registry: vitest](https://registry.npmjs.org/vitest); [npm registry: @vitejs/plugin-react](https://registry.npmjs.org/@vitejs/plugin-react); [npm registry: vite](https://registry.npmjs.org/vite)
- The Vite migration guide's cleanup step says "Uninstall Vite dependencies". — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- Env in tests: a `.env.test` file is loaded when `NODE_ENV=test`; `.env.local` is **not** loaded in test. Use `loadEnvConfig` from `@next/env` to mimic Next loading. — [Next.js: Environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- ESLint:
  - "Starting with Next.js 16, `next lint` is removed".
  - Config file `eslint.config.mjs`:
    ```js
    import { defineConfig, globalIgnores } from 'eslint/config'
    import nextVitals from 'eslint-config-next/core-web-vitals'
    export default defineConfig([...nextVitals, globalIgnores(['.next/**','out/**','build/**','next-env.d.ts'])])
    ```
  - Run with `npx eslint .`.
  - `eslint-config-next` supports ESLint 9 and 10. ESLint 10 requires Node `^20.19.0`, `^22.13.0`, or `>=24`. Some bundled plugins don't list ESLint 10 in their peers yet, so expect peer warnings, or failures with strict peer deps.
  - Prettier integration: `eslint-config-prettier/flat`.
  - Source: [Next.js: ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- A migration codemod exists: `npx @next/codemod@canary next-lint-to-eslint-cli .`. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- The `@next/next/no-img-element` rule is enabled in recommended ("Prevent usage of `<img>` element due to slower LCP"). — [Next.js: ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- Next declares an optional peer `@playwright/test ^1.51.1`; Playwright latest is 1.65.1. — [npm registry: next](https://registry.npmjs.org/next); [npm registry: @playwright/test](https://registry.npmjs.org/@playwright/test)
- Accessibility linting: a 2024 Next accessibility page says Next "includes `eslint-plugin-jsx-a11y`" by default. The current ESLint reference lists only `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `@next/eslint-plugin-next` as bundled recommended sets. — [Next.js: Accessibility (2024-11-06)](https://nextjs.org/docs/architecture/accessibility); [Next.js: ESLint (2026-10-15)](https://nextjs.org/docs/app/api-reference/config/eslint)

### Inferences
- Keep `vite@8` and `@vitejs/plugin-react@6` as devDependencies for Vitest, even though the guide says to uninstall Vite deps. Presenter tests can use `environment: 'node'`, via a per-file `// @vitest-environment node` or a separate project, which is faster than jsdom.
- E2E with Playwright against `next build && next start` plus FastAPI covers:
  - async Server Component pages,
  - shareable URLs (load `/compare?place=…&var=…` and assert content),
  - the Leaflet map (keyboard nav),
  - reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`).
- If jsx-a11y rules matter (they should for a keyboard-navigable map), add `eslint-plugin-jsx-a11y`'s flat config explicitly rather than relying on the older doc's claim.
- `no-img-element` will flag `<img>` usages. Either use `next/image` or disable the rule per line for decorative or static images.

### Gaps
- The official Next.js Playwright guide (`/docs/app/guides/testing/playwright`) wasn't fetched in this session. Its config (`webServer` command and ports) is unverified here.
- Whether the bundled `eslint-config-next@16.4.6` currently includes jsx-a11y rules wasn't confirmed against its package contents.

---

## 9. Running locally: `next dev` beside FastAPI; `output: 'export'` limits vs Node server; environment variables

### Takeaway
Run `uvicorn` on 127.0.0.1:8000 and `next dev` (Turbopack by default) on :3000 with the `/api` rewrite. For the demo build, use `next build && next start` (a Node server). Rewrites, Route Handlers that read requests, Server Actions, and request-time rendering all need a server and are unavailable under `output: 'export'`. Browser-visible config must be `NEXT_PUBLIC_*`, which is **inlined at build time and visible to anyone**. With the rewrite approach, the browser needs no env vars at all.

### Cited Findings
- Static export: unsupported features are listed in [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports):
  - dynamic routes without `generateStaticParams` or with `dynamicParams: true`,
  - Route Handlers that rely on Request,
  - cookies,
  - rewrites, redirects, headers,
  - proxy,
  - ISR,
  - default-loader image optimization,
  - Draft Mode,
  - Server Actions,
  - intercepting routes.
- Static export: Server Components run at `next build`. GET Route Handlers become static files with `export const dynamic = 'force-static'`. The output goes to `out/`, or `distDir`. — [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- Next 16 uses "separate output directories" for `next dev` and `next build` ("enabling concurrent execution"), and a "lockfile mechanism to prevent multiple `next dev` or `next build` instances on the same project". — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- Turbopack is the default bundler; use `--webpack` to opt out. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- "Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment". `NEXT_PUBLIC_` values are inlined "at build time… into the js bundle", and after build "all `NEXT_PUBLIC_` variables will be frozen". "Dynamic lookups will *not* be inlined" (`process.env[varName]`, `const env = process.env`). — [Next.js: Environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- Load order: `process.env` → `.env.$(NODE_ENV).local` → `.env.local` (not in test) → `.env.$(NODE_ENV)` → `.env`. With a `/src` folder, `.env*` files stay in the project root. — [Next.js: Environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- Migration: "Change all environment variables with the `VITE_` prefix to `NEXT_PUBLIC_`". — [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite)
- `serverRuntimeConfig`/`publicRuntimeConfig` were removed in 16; use env vars. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- Prefetching "is only enabled in production". — [Next.js: Link](https://nextjs.org/docs/app/api-reference/components/link)

### Inferences
- Suggested `package.json` scripts:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "api": "uvicorn app.main:app --host 127.0.0.1 --port 8000",
    "types:api": "openapi-typescript ../backend/openapi.json -o src/api/schema.d.ts",
    "test": "vitest",
    "e2e": "playwright test",
    "lint": "eslint ."
  }
  ```
  Use `concurrently` or two terminals; `npm-run-all` is optional. Paths are placeholders, so adapt them to the repo layout.
- `.env.local` (git-ignored): `API_ORIGIN=http://127.0.0.1:8000`. **No** `NEXT_PUBLIC_API_URL` is needed, because browser calls go to relative `/api/v1/...` and Next proxies them. Never put backend secrets in `NEXT_PUBLIC_*`.
- Demo-day run: `next build && next start` gives production prefetching, faster pages, and catches Suspense/`useSearchParams` build errors. `next dev` is slower and hides prefetch behavior.
- Choose `output: 'export'` only if FastAPI must serve the frontend as static files (e.g. one process on the laptop). In that case, drop rewrites, mount `out/` with FastAPI `StaticFiles` on the same origin, and keep all data fetching client-side. Shareable URLs still work if every route is pre-generated and query params are read on the client (under Suspense).

### Gaps
- I didn't verify Windows-specific behavior of Turbopack's dev lockfile or file watching.
- Rewrite-proxy timeouts for slow FastAPI responses are undocumented (see Q3 gaps).

---

## 10. Common SPA-to-App-Router migration pitfalls

### Takeaway
The surprises cluster around four areas:
- **Prerendering of Client Components:** `window` at module scope, and hydration mismatches from Date, random values, or locale formatting.
- **Async request APIs:** `await params` and `await searchParams`.
- **Suspense requirements that only fail in production builds.**
- **Persistent layouts:** state survives navigation, layouts get no `searchParams`, and view transitions don't fire there.
Next announces route changes to screen readers by itself, but meaningful per-page titles and scroll and focus behavior are the app's job.

### Cited Findings
- Hydration error causes:
  - invalid nesting (`<div>` in `<p>`, `<a>` in `<a>`),
  - `typeof window !== 'undefined'` in render logic,
  - browser-only APIs in render,
  - "time-dependent APIs such as the `Date()` constructor",
  - browser extensions,
  - iOS format detection (fix with `<meta name="format-detection" content="telephone=no, date=no, email=no, address=no">`).
- Hydration fixes: `useEffect` client-only state, `dynamic(..., { ssr:false })`, or `suppressHydrationWarning` (one level deep, an escape hatch).
- Source: [Next.js: Hydration error](https://nextjs.org/docs/messages/react-hydration-error)
- Under Cache Components, `Math.random()`/`Date.now()`/`crypto.randomUUID()` need `connection()` + Suspense or `'use cache'`, and the dev overlay flags them. — [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching)
- Route announcer: "Next.js includes a route announcer by default… looks for the page name to announce by first inspecting `document.title`, then the `<h1>` element, and finally the URL pathname." — [Next.js: Accessibility](https://nextjs.org/docs/architecture/accessibility)
- Scroll:
  - `<Link scroll>` defaults to `true`. It "maintain[s] scroll position" if the new Page is visible; otherwise it scrolls to the top of the first Page element.
  - Sticky and fixed elements are skipped, so set `html { scroll-padding-top: <header height> }`.
  - Use `scroll={false}` or `router.push(url, { scroll: false })` to opt out.
  - Source: [Next.js: Link](https://nextjs.org/docs/app/api-reference/components/link)
- Layouts don't receive `searchParams` and are not re-rendered on navigation. — [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- View-transition enter/exit never fire in layouts. — [Next.js: View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- The missing-Suspense build failure with `useSearchParams` appears only in production builds. — [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- Next 16 behavior changes that bite migrations:
  - sync `params`/`searchParams` removed,
  - parallel routes require `default.js`,
  - smooth scroll no longer automatic,
  - `next/image` defaults changed (`qualities` `[75]`, `minimumCacheTTL` 4h, local IP optimization blocked).
  - Source: [Next.js 16 blog](https://nextjs.org/blog/next-16)
- `ssr:false` is not allowed in Server Components; dynamic imports from Server Components aren't code-split. — [Next.js: Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- react-leaflet double initialization ("Map container is already initialized") under React 18/19 is an open issue. — [react-leaflet #1133](https://github.com/PaulLeCam/react-leaflet/issues/1133)

### Inferences
Checklist for the team:
1. **Module-scope browser access.** Search for `window.`, `document.`, `localStorage`, `matchMedia`, and `navigator` at module top level and inside render. Move them into `useEffect` or event handlers, or isolate them behind `ssr:false` / `use(browser())`. Read `prefers-reduced-motion` via CSS media queries rather than `matchMedia` during render.
2. **Dates and locale.** Format dates with explicit `timeZone: 'UTC'` and a fixed locale (e.g. `Intl.DateTimeFormat('en-US', { timeZone: 'UTC' })`). Server (Node) and browser locale and time zone differ, and "latest month" style labels computed from `new Date()` will mismatch. Have FastAPI return the reference period.
3. **Random IDs.** Use React's `useId()` for SVG `clipPath`/gradient ids instead of `Math.random()`, which matters for the hand-written SVG charts.
4. **Async params.** Every `page.js` receives `params` and `searchParams` as Promises. Await them or pass them to `use()` inside Suspense.
5. **Suspense around URL readers.** Wrap each client island that reads the URL (nuqs or `useSearchParams`) in `<Suspense fallback={…}>`. Run `next build` daily.
6. **Persistent layout.** `app/layout.js` holds `<html lang>`, the skip link, header and nav (active link via `usePathname()` in a small client component), `NuqsAdapter`, and global token CSS. Anything that must reset per page (selection, hover state) belongs in the page, not the layout.
7. **Focus on route change.** The announcer reads `document.title`, so give every page a unique `metadata.title` or `generateMetadata` such as "Monthly trends: Phoenix, Tmax | Climatch". Keyboard focus is not moved by Next (inference from docs that only mention announcement). Consider a small client component that focuses the page `<h1 tabIndex={-1}>` on pathname change, and test it with a screen reader.
8. **Scroll.** Add `scroll-padding-top` for the sticky header. Use `scroll={false}` on in-page control links (variable tabs) so changing `?var=` doesn't jump.
9. **Map lifecycle.** Call `map.remove()` in effect cleanup. Never reuse a container div across mounts.
10. **Tooling.** Keep `vite` for Vitest. Pin `typescript@5` for openapi-typescript. Use `eslint .` instead of `next lint`.

### Gaps
- No official Next.js statement found on programmatic focus management after client navigation beyond the route announcer (the accessibility page dates from 2024-11-06).
- Scroll restoration on browser back/forward in the App Router is described only by analogy ("similar to how browsers handle back and forwards navigation"). I found no dedicated doc section.
