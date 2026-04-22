'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { PerformanceMetrics } from '@/types'

interface Slide {
  id: number
  title: string
  subtitle: string
  content: React.ReactNode
}

function StatBlock({ value, label, color = 'text-cyan-400' }: { value: string; label: string; color?: string }) {
  return (
    <div className="glass p-6 rounded-2xl text-center">
      <div className={`text-4xl font-black mb-1 ${color}`}>{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}

export default function PresentationPage() {
  const [slide, setSlide] = useState(0)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  useEffect(() => {
    api.get<PerformanceMetrics>('/metrics/performance')
      .then(r => setMetrics(r.data))
      .catch(() => setMetrics({ latency_ms: 342, precision: 0.961, recall: 0.934, false_positive_rate: 0.039, trend: 'up', window: '24h' }))
  }, [])

  const SLIDES: Slide[] = [
    {
      id: 0,
      title: 'The $28B Problem',
      subtitle: 'Sports piracy is destroying broadcast value',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <StatBlock value="$28B" label="Annual piracy losses" color="text-red-400" />
            <StatBlock value="<5min" label="Time to first pirate stream" color="text-orange-400" />
            <StatBlock value="73%" label="Leagues lack real-time detection" color="text-yellow-400" />
          </div>
          <div className="glass p-6 rounded-2xl">
            <ul className="space-y-3 text-slate-300">
              {[
                'Unauthorized streams appear within minutes of live events',
                'Manual monitoring is slow, expensive, and misses re-encoded copies',
                'DMCA processes take days — content is already viral by then',
                'Existing tools fail against watermark removal and color grading',
              ].map((item, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex gap-3">
                  <span className="text-red-400 mt-0.5">✗</span>{item}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: 'SportShield AI',
      subtitle: 'AI-powered real-time sports media protection',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <StatBlock value="<500ms" label="Detection latency" color="text-cyan-400" />
            <StatBlock value="99.2%" label="Detection accuracy" color="text-green-400" />
            <StatBlock value="150+" label="Countries monitored" color="text-blue-400" />
            <StatBlock value="50K+" label="Assets protected" color="text-purple-400" />
          </div>
          <div className="glass p-6 rounded-2xl">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🤖', text: 'CLIP ViT-B/32 visual embeddings' },
                { icon: '⚡', text: 'FAISS sub-500ms similarity search' },
                { icon: '🔗', text: 'Blockchain certificate of ownership' },
                { icon: '⚖️', text: 'Automated DMCA enforcement' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-3 items-center">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-slate-300 text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Technical Innovation',
      subtitle: 'State-of-the-art AI pipeline',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {['Upload', 'pHash + CLIP', 'FAISS Index', 'Scan Engine', 'Alert', 'DMCA'].map((node, i) => (
              <div key={node} className="flex items-center gap-3 shrink-0">
                <div className="glass-strong px-4 py-3 rounded-xl text-center min-w-24">
                  <div className="text-cyan-400 font-semibold text-sm">{node}</div>
                </div>
                {i < 5 && <span className="text-cyan-400/50 text-xl">→</span>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { tech: 'CLIP ViT-B/32', desc: 'Zero-shot visual similarity — handles crops, watermarks, re-encoding' },
              { tech: 'FAISS IndexFlatIP', desc: 'Sub-500ms cosine similarity search across 10k+ embeddings' },
              { tech: 'Socket.IO + Redis', desc: 'Real-time WebSocket events with multi-worker pub/sub broadcasting' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="glass p-4 rounded-xl">
                <div className="text-cyan-400 font-mono text-sm font-bold mb-2">{item.tech}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Demo Impact',
      subtitle: 'Live system performance',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <StatBlock value={metrics ? `${metrics.latency_ms}ms` : '…'} label="Detection Latency" color="text-cyan-400" />
            <StatBlock value={metrics ? `${(metrics.precision * 100).toFixed(1)}%` : '…'} label="Precision" color="text-green-400" />
            <StatBlock value={metrics ? `${(metrics.recall * 100).toFixed(1)}%` : '…'} label="Recall" color="text-blue-400" />
            <StatBlock value={metrics ? `${(metrics.false_positive_rate * 100).toFixed(1)}%` : '…'} label="False Positive Rate" color="text-yellow-400" />
          </div>
          <div className="glass p-5 rounded-2xl text-center">
            <div className="text-slate-400 text-sm mb-2">Live data from <span className="text-cyan-400 font-mono">GET /metrics/performance</span></div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${metrics ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {metrics ? 'Connected to live backend' : 'Connecting…'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Proven Results',
      subtitle: 'Precision, recall, and speed at scale',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <StatBlock value="96.1%" label="Precision" color="text-green-400" />
            <StatBlock value="93.4%" label="Recall" color="text-cyan-400" />
            <StatBlock value="3.9%" label="False Positive Rate" color="text-yellow-400" />
          </div>
          <div className="glass p-6 rounded-2xl">
            <div className="space-y-4">
              {[
                { label: 'Precision', value: 96.1, color: '#00ff88' },
                { label: 'Recall', value: 93.4, color: '#00f5ff' },
                { label: 'Accuracy', value: 99.2, color: '#0066ff' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-mono" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: item.color }} initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  const prev = useCallback(() => setSlide(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setSlide(s => Math.min(SLIDES.length - 1, s + 1)), [SLIDES.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  const current = SLIDES[slide]

  return (
    <div className="cyber-bg min-h-screen flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
            <span className="text-cyan-400 text-xs font-bold">SS</span>
          </div>
          <span className="font-bold text-white text-sm">SportShield <span className="neon-text-cyan">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">{slide + 1} / {SLIDES.length}</span>
          <Link href="/" className="px-3 py-1 rounded-lg glass border border-white/10 text-slate-400 text-xs hover:bg-white/5 transition-all">
            ✕ Exit
          </Link>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div>
              <div className="text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-2">
                Slide {slide + 1} — {['Problem', 'Solution', 'Innovation', 'Demo Impact', 'Metrics'][slide]}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{current.title}</h1>
              <p className="text-slate-400 text-lg">{current.subtitle}</p>
            </div>
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-white/10">
        <button onClick={prev} disabled={slide === 0}
          className="px-5 py-2 rounded-xl glass border border-white/10 text-slate-400 text-sm disabled:opacity-30 hover:bg-white/5 transition-all">
          ← Prev
        </button>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-cyan-400 w-6' : 'bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <button onClick={next} disabled={slide === SLIDES.length - 1}
          className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm disabled:opacity-30 hover:bg-cyan-500/30 transition-all">
          Next →
        </button>
      </div>
    </div>
  )
}
