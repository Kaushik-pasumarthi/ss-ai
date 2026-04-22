import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'SportShield AI — Anti-Piracy Platform',
  description: 'AI-powered sports media protection and unauthorized content detection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="cyber-bg min-h-screen text-slate-200 antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
