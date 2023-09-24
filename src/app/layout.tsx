import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from './navbar'
import Footer from './footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CFTC COT Viewer',
  description: 'Web viewer for CFTC Commitment of Traders data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="antialiased bg-gradient-to-br from-gray-950 via-slate-750 to-indigo-950">
          <Navbar />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  )
}
