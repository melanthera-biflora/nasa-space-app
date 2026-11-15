// Next.js serves the pages; the FastAPI backend stays behind one rewrite, so the browser keeps calling /api/v1/...
// No `output: 'export'`: a static export would turn rewrites off (SPEC amendment A2, D22).
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8000'

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  agentRules: false,             // don't let `next dev` append its own block to our AGENTS.md
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }]
  },
}
