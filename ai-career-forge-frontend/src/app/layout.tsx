import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

import { ThemeProvider } from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'
import AssistantWidget from '@/components/AssistantWidget'
import MobileFooterTabs from '@/components/MobileFooterTabs'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
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
