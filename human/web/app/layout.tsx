import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Human Functions - Task Inbox',
  description: 'Web interface for human function interactions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Human Functions</h1>
                <nav className="flex gap-4">
                  <a href="/inbox" className="text-sm font-medium hover:underline">
                    Inbox
                  </a>
                  <a href="/history" className="text-sm font-medium hover:underline">
                    History
                  </a>
                </nav>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
