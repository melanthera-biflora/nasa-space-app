import { Inter } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import RouteFocus from '../components/detective/RouteFocus'
import '../index.css'
import '../components/ui/ui.css'
import '../views/detective.css'
import '../views/kit.css'
import '../views/compare.css'

// Self-hosted at build time: no request to Google from the browser, no layout shift (A3). The optical-size axis gives
// headings the display cut.
const inter = Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-inter', display: 'swap' })

export const metadata = {
  title: 'Climatch: Earth System Trend Detective',
  description: 'Find which US climate and air-quality trends are real, in which seasons, and which spikes were disasters. NASA data, 2001-2025.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
        <RouteFocus />
      </body>
    </html>
  )
}
