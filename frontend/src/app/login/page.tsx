'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@sportshield.ai')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/auth/login', { email, password })
      localStorage.setItem('access_token', r.data.access_token)
      localStorage.setItem('refresh_token', r.data.refresh_token)
      router.push('/dashboard')
    } catch {
      setError('Invalid credentials. Run /demo/bootstrap first.')
    } finally {
      setLoading(false)
    }
  }

  const bootstrap = async () => {
    setLoading(true)
    try {
      const r = await api.post('/demo/bootstrap')
      localStorage.setItem('access_token', r.data.access_token)
      localStorage.setItem('org_id', r.data.organization_id)
      router.push('/dashboard')
    } catch {
      setError('Bootstrap failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cyber-bg min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="text-3xl font-black text-white">
            Sport<span className="neon-text-cyan">Shield</span> AI
          </h1>
          <p className="text-slate-400 mt-2">Sign in to your account</p>
        </div>

        <div className="glass-strong p-8 rounded-2xl space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all disabled:opacity-40"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={bootstrap}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold hover:bg-purple-500/30 transition-all disabled:opacity-40"
          >
            🚀 One-Click Demo Setup
          </button>
          <p className="text-slate-600 text-xs text-center">
            Creates admin@sportshield.ai / admin123 and logs you in
          </p>
        </div>
      </motion.div>
    </div>
  )
}
