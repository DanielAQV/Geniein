import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-noto-sans',
})

export const metadata: Metadata = {
  title: 'Geniein | Digital ODA Consulting & IT Platforms',
  description: 'Global Digital ODA Consulting & Innovative IT Platforms. Connect the world, innovate the future with Connext and Gnom solutions.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=1' },
      { url: '/icon.svg?v=1', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png?v=1',
  },
  robots: {
    index: false,
    follow: false,
  },
}

import { LanguageProvider } from '@/lib/i18n/language-context'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} bg-background scroll-smooth`} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV !== 'production' && (
          <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
        )}
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            {children}
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

