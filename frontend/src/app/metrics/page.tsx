'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import type { PerformanceMetrics } from '@/types'

type Window = '1h' | '24h' | '7d'

function generateTimeSeries(window: Window, baseValue: number, variance: number) {
  const points = window === '1h' ? 12 : window === '24h' ? 24 : 28
  const label = (i: number) => {
    if (window === '1h') return `${i * 5}m`
    if (window === '24h') return `${i}h`
    return `Day ${i + 1}`
  }
  return Array.from({ length: points }, (_, i) => ({
    time: label(i),
    value: Math.max(0, baseValue + (Math.random() - 0.5) * variance),
  }))
}

const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', stable: '→' }
const TREND_COLOR: Record<string, string> = { up: 'text-green-400', down: 'text-red-400', stable: 'text-yellow-400' }

export default function MetricsPage() {
  const [window, setWindow] = useState<Window>('24h')
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = (w: Window) => {
    setLoading(true)
    api.get<PerformanceMetrics>('/metrics/performance', { params: { window: w } })
      .then(r => setMetrics(r.data))
      .catch(() => setMetrics(MOCK_METRICS))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMetrics(window) }, [window])

  useEffect(() => {
    const socket = getSocket()
    socket.on('metrics.updated', (data: PerformanceMetrics) => setMetrics(data))
    return () => { socket.off('metrics.updated') }
  }, [])

  const m = metrics ?? MOCK_METRICS

  const metricCards = [
    { label: 'Detection Latency', value: `${m.latency_ms}ms`, raw: m.latency_ms, series: generateTimeSeries(window, m.latency_ms, 80), color: '#00f5ff', unit: 'ms', lowerBetter: true },
    { label: 'Precision', value: `${(m.precision * 100).toFixed(1)}%`, raw: m.precision * 100, series: generateTimeSeries(window, m.precision * 100, 5), color: '#00ff88', unit: '%', lowerBetter: false },
    { label: 'Recall', value: `${(m.recall * 100).toFixed(1)}%`, raw: m.recall * 100, series: generateTimeSeries(window, m.recall * 100, 5), color: '#0066ff', unit: '%', lowerBetter: false },
    { label: 'False Positive Rate', value: `${(m.false_positive_rate * 100).toFixed(1)}%`, raw: m.false_positive_rate * 100, series: generateTimeSeries(window, m.false_positive_rate * 100, 2), color: '#f59e0b', unit: '%', lowerBetter: true },
  ]

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
            Metrics <span className="neon-text-cyan">Dashboard</span>
          </motion.h1>

          {/* Time Window Selector */}
          <div className="flex gap-1 glass p-1 rounded-xl">
            {(['1h', '24h', '7d'] as Window[]).map(w => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  window === w ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <GlassCard key={card.label} delay={i * 0.08}>
              {loading ? <SkeletonLoader lines={2} /> : (
                <>
                  <div className="text-slate-400 text-xs mb-1">{card.label}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black" style={{ color: card.color }}>{card.value}</span>
                    <span className={`text-lg font-bold mb-0.5 ${TREND_COLOR[m.trend]}`}>
                      {TREND_ICON[m.trend]}
                    </span>
                  </div>
                  <div className="text-slate-600 text-xs mt-1">vs previous {window}</div>
                </>
              )}
            </GlassCard>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {metricCards.map(card => (
            <GlassCard key={`chart-${card.label}`}>
              <h3 className="text-white font-semibold mb-4 text-sm">{card.label} over time</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={card.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0a0f1e', border: `1px solid ${card.color}33`, borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(1)}${card.unit}`, card.label]}
                  />
                  <Line type="monotone" dataKey="value" stroke={card.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          ))}
        </div>

        {/* No data state */}
        {!loading && !metrics && (
          <GlassCard>
            <div className="text-center py-8 text-slate-500">
              <div className="text-3xl mb-2">📊</div>
              <p>No data for this period — run a scan to generate metrics</p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

const MOCK_METRICS: PerformanceMetrics = {
  latency_ms: 342,
  precision: 0.961,
  recall: 0.934,
  false_positive_rate: 0.039,
  trend: 'up',
  window: '24h',
}
