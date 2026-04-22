'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/architecture', label: 'Architecture' },
]

export default function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="glass-strong border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center">
            <span className="text-neon-cyan text-xs font-bold">SS</span>
          </div>
          <span className="font-bold text-white">SportShield <span className="neon-text-cyan">AI</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                pathname === link.href
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/demo" className="px-3 py-1.5 text-sm bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 transition-all">
            Demo
          </Link>
          <Link href="/presentation" className="px-3 py-1.5 text-sm bg-neon-blue/10 border border-neon-blue/30 text-blue-400 rounded-lg hover:bg-neon-blue/20 transition-all">
            Pitch
          </Link>
        </div>
      </div>
    </nav>
  )
}
