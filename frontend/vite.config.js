import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Used only by Vitest (the app runs on Next.js since A2; /api is rewritten in next.config.mjs).
export default defineConfig({
  plugins: [react()],
})
