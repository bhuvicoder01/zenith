import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

import { ThemeProvider } from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'
import OrientationLock from '@/components/OrientationLock'
import AssistantWidget from '@/components/AssistantWidget'
import MobileFooterTabs from '@/components/MobileFooterTabs'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ZENITH | AI Career Orchestrator',
  description: 'Next-Gen Agentic Application Intelligence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <AuthGuard>
              {children}
              <ThemeToggle />
              <OrientationLock />
              <AssistantWidget />
              <MobileFooterTabs />
              <SpeedInsights />
              <Analytics />
            </AuthGuard>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
