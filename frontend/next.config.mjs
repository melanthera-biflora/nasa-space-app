// Next.js serves the pages; the FastAPI backend stays behind one rewrite, so the browser keeps calling /api/v1/...
// No `output: 'export'`: a static export would turn rewrites off (SPEC amendment A2, D22).
// On Render the API is reached over the private network: API_HOSTPORT is the backend's internal host:port (render.yaml).
// Read at build time: the rewrite is fixed when `next build` runs.
const API_ORIGIN = process.env.API_ORIGIN ?? (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : 'http://127.0.0.1:8000')

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  agentRules: false,             // don't let `next dev` append its own block to our AGENTS.md
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }]
  },
}
