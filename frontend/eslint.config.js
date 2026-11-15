import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next', 'next-env.d.ts']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Next.js route files export these by convention (metadata, static params); they are not components.
    files: ['src/app/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': ['error', { allowExportNames: ['metadata', 'viewport', 'generateStaticParams', 'generateMetadata', 'dynamic'] }],
    },
  },
])
