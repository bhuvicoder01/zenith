import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./zenith.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteRuntime from "@/components/SiteRuntime";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL("https://zenith-ai-careers.vercel.app"),
  title: {
    default: "Zenith — Your next chapter, a clearer path",
    template: "%s | Zenith",
  },
  description:
    "A considered workspace for career profiles, relevant job discovery, application preparation, and progress tracking. Explore the interactive demo without an account.",
  icons: { icon: "/zenith-favicon.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Suspense
            fallback={
              <div className="z-page-loading" role="status">
                Opening your workspace…
              </div>
            }
          >
            <SiteRuntime>{children}</SiteRuntime>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
