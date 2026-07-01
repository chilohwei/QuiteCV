import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'QuietCV | AI Native Resume Workbench',
  description: 'A quiet, AI-native Markdown resume workbench with A4 paginated preview and PDF export.',
  icons: {
    icon: [
      {
        url: '/icon.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'QuietCV',
    description: 'A quiet, AI-native Markdown resume workbench.',
    images: [{ url: '/logo.png', width: 1200, height: 428, alt: 'QuietCV' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="bg-neutral-50">
      <body className="font-sans antialiased overflow-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <Script
          src="https://tongji.chiloh.com/script.js"
          data-website-id="f0c210d7-0082-4a9c-a543-fe55c11a4ec6"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
