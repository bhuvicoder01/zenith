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
import WebSocketProvider from '@/components/WebSocketProvider'
import { Toaster } from 'sonner'

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
  icons:{
    icon: "/zenith-favicon.png",
  },
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
              <WebSocketProvider>
                {children}
                <ThemeToggle />
                <OrientationLock />
                <AssistantWidget />
                <MobileFooterTabs />
                <SpeedInsights />
                <Analytics />
                <Toaster 
                  theme="system"
                  className="toaster group"
                  toastOptions={{
                    classNames: {
                      toast: "group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:font-sans group-[.toaster]:font-semibold group-[.toaster]:text-xs group-[.toaster]:border",
                      title: "group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-wide",
                      description: "group-[.toast]:text-muted-foreground group-[.toast]:font-medium",
                      actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:text-[10px] group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:hover:opacity-90 group-[.toast]:transition-all",
                      cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-lg group-[.toast]:text-[10px] group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:px-3 group-[.toast]:py-1.5",
                      closeButton: "group-[.toast]:bg-secondary group-[.toast]:border-border group-[.toast]:text-foreground group-[.toast]:hover:bg-secondary/80 group-[.toast]:transition-colors",
                      error: "group-[.toast]:border-red-500/20 group-[.toast]:bg-red-500/5 group-[.toast]:text-red-500 dark:group-[.toast]:bg-red-500/10",
                      success: "group-[.toast]:border-emerald-500/20 group-[.toast]:bg-emerald-500/5 group-[.toast]:text-emerald-500 dark:group-[.toast]:bg-emerald-500/10",
                      warning: "group-[.toast]:border-amber-500/20 group-[.toast]:bg-amber-500/5 group-[.toast]:text-amber-500 dark:group-[.toast]:bg-amber-500/10",
                      info: "group-[.toast]:border-blue-500/20 group-[.toast]:bg-blue-500/5 group-[.toast]:text-blue-500 dark:group-[.toast]:bg-blue-500/10"
                    }
                  }}
                  position="top-center" 
                  closeButton 
                />
              </WebSocketProvider>
            </AuthGuard>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
