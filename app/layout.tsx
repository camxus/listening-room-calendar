import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Listening Room | Reserve Your Slot',
  description: 'Reserve your 30-minute listening room experience. Pick a time, bring friends, and share your favorite song.',
  keywords: ['listening room', 'music', 'event', 'booking', 'spotify'],
}

export const viewport: Viewport = {
  themeColor: '#f8f9fa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        {children}
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid oklch(0.90 0.005 260)',
              color: 'oklch(0.15 0.01 260)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
          }}
        />
      </body>
    </html>
  )
}
