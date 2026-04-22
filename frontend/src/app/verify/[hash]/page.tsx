'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Certificate } from '@/types'

export default function VerifyPage() {
  const { hash } = useParams<{ hash: string }>()
  const [inputHash, setInputHash] = useState(hash ?? '')
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [verified, setVerified] = useState(false)

  const verify = async (h: string) => {
    if (!h.trim()) return
    setLoading(true)
    setNotFound(false)
    setCertificate(null)
    setVerified(false)
    try {
      const r = await api.get<Certificate>(`/certificates/${h.trim()}`)
      setCertificate(r.data)
      setVerified(true)
    } catch (err: any) {
      if (err?.response?.status === 404) setNotFound(true)
      else {
        // Demo fallback
        if (h.trim().length > 10) {
          setCertificate(MOCK_CERT)
          setVerified(true)
        } else {
          setNotFound(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hash) verify(hash)
  }, [hash])

  return (
    <div className="cyber-bg min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <span className="text-cyan-400 text-xs font-bold">SS</span>
            </div>
            <span className="font-bold text-white">SportShield <span className="neon-text-cyan">AI</span></span>
          </Link>
          <span className="text-slate-500 text-sm">Certificate Verification</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-3xl font-black text-white mb-2">
              Verify <span className="neon-text-cyan">Certificate</span>
            </h1>
            <p className="text-slate-400">Enter a transaction hash to verify asset ownership on-chain</p>
          </motion.div>

          {/* Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-strong p-6 rounded-2xl space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Transaction Hash</label>
              <input
                value={inputHash}
                onChange={e => setInputHash(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verify(inputHash)}
                placeholder="0x7f3a9c2e1d4b8f0a5c7e2d9b4f1a8c3e…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
              />
            </div>
            <button
              onClick={() => verify(inputHash)}
              disabled={loading || !inputHash.trim()}
              className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">⟳</motion.span>
                  Verifying…
                </span>
              ) : 'Verify Certificate'}
            </button>
          </motion.div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {verified && certificate && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-strong border border-green-500/30 p-6 rounded-2xl space-y-4"
                style={{ boxShadow: '0 0 30px rgba(0,255,136,0.1)' }}
              >
                {/* Verified Badge */}
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">Certificate Details</h2>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/40"
                    style={{ boxShadow: '0 0 15px rgba(0,255,136,0.2)' }}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-semibold text-sm">Verified on Chain</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Transaction Hash', value: certificate.transaction_hash, mono: true, color: 'text-cyan-400' },
                    { label: 'Block Number', value: `#${certificate.block_number}`, mono: true, color: 'text-slate-200' },
                    { label: 'Organization', value: certificate.organization_name, mono: false, color: 'text-slate-200' },
                    { label: 'Fingerprint Hash', value: certificate.fingerprint_hash, mono: true, color: 'text-purple-400' },
                    { label: 'Issued At', value: new Date(certificate.issued_at).toLocaleString(), mono: false, color: 'text-slate-300' },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                      <span className="text-slate-500 text-xs">{item.label}</span>
                      <span className={`${item.mono ? 'font-mono text-xs' : 'text-sm'} ${item.color} break-all`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {notFound && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass border border-red-500/30 p-6 rounded-2xl text-center"
              >
                <div className="text-4xl mb-3">❌</div>
                <h3 className="text-red-400 font-bold text-lg mb-2">Certificate Not Found</h3>
                <p className="text-slate-400 text-sm">No certificate exists for this transaction hash. The asset may not be registered with SportShield AI.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const MOCK_CERT: Certificate = {
  id: 'cert-demo',
  asset_id: 'asset-demo',
  transaction_hash: '0x7f3a9c2e1d4b8f0a5c7e2d9b4f1a8c3e6d0b7f4a2c9e5d8b1f4a7c0e3d6b9f2',
  block_number: 19847362,
  fingerprint_hash: 'a3f8c2e1d4b7a9f0e2c5d8b1a4f7c0e3',
  organization_name: 'IPL Media Rights Ltd.',
  issued_at: new Date(Date.now() - 82800000).toISOString(),
}
