'use client'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import type { AnalyticsSummary, Incident } from '@/types'

// Mock 30-day area chart data
function generateDailyData() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: Math.floor(Math.random() * 40 + 5),
    }
  })
}

const PIE_COLORS = ['#00f5ff', '#0066ff', '#00ff88']
const SOURCE_DATA = [
  { name: 'YouTube', value: 42 },
  { name: 'Website', value: 31 },
  { name: 'Social', value: 27 },
]

const GEO_DATA = [
  { country: 'India', count: 38, flag: '🇮🇳' },
  { country: 'United States', count: 24, flag: '🇺🇸' },
  { country: 'Brazil', count: 19, flag: '🇧🇷' },
  { country: 'Indonesia', count: 15, flag: '🇮🇩' },
  { country: 'Pakistan', count: 12, flag: '🇵🇰' },
  { country: 'Nigeria', count: 9, flag: '🇳🇬' },
  { country: 'Germany', count: 7, flag: '🇩🇪' },
  { country: 'Mexico', count: 6, flag: '🇲🇽' },
]

const SOURCE_ICONS: Record<string, string> = {
  youtube: '▶',
  website: '🌐',
  social_media: '📱',
}

function scoreColor(score: number) {
  if (score >= 0.9) return 'bg-red-500/20 text-red-400 border-red-500/30'
  if (score >= 0.75) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-green-500/20 text-green-400 border-green-500/30'
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [dailyData] = useState(generateDailyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AnalyticsSummary>('/analytics/summary')
      .then(r => setSummary(r.data))
      .catch(() => setSummary({ total_assets: 1247, total_incidents: 3891, active_threats: 23, scan_frequency: 60 }))
      .finally(() => setLoading(false))

    api.get<Incident[]>('/incidents/?limit=20')
      .then(r => setIncidents(Array.isArray(r.data) ? r.data.slice(0, 20) : []))
      .catch(() => setIncidents(MOCK_INCIDENTS))
  }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.on('incident.created', (data: Incident) => {
      setIncidents(prev => [data, ...prev].slice(0, 20))
    })
    return () => { socket.off('incident.created') }
  }, [])

  const statCards = [
    { label: 'Total Assets', value: summary?.total_assets ?? 0, icon: '🎬', color: 'neon-text-cyan' },
    { label: 'Total Incidents', value: summary?.total_incidents ?? 0, icon: '⚠️', color: 'text-yellow-400' },
    { label: 'Active Threats', value: summary?.active_threats ?? 0, icon: '🔴', color: 'text-red-400' },
    { label: 'Scan Freq (s)', value: summary?.scan_frequency ?? 0, icon: '📡', color: 'neon-text-green' },
  ]

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
          Alert <span className="neon-text-cyan">Dashboard</span>
        </motion.h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <GlassCard key={s.label} delay={i * 0.08} neon={i === 2}>
              {loading ? <SkeletonLoader lines={2} /> : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-400 text-sm">{s.label}</div>
                </>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Incident Feed */}
          <div className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <h2 className="text-white font-semibold">Live Incident Feed</h2>
                <span className="ml-auto text-xs text-slate-500">{incidents.length} recent</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {incidents.length === 0 && <SkeletonLoader lines={5} />}
                {incidents.map((inc, i) => (
                  <motion.div
                    key={inc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-all border border-white/5"
                  >
                    <span className="text-lg w-6 text-center">{SOURCE_ICONS[inc.source_type] ?? '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300 truncate">{inc.source_url}</div>
                      <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                        <span>{inc.geo_country ?? 'Unknown'}</span>
                        <span>·</span>
                        <span>{new Date(inc.detection_timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${scoreColor(inc.match_score)}`}>
                      {(inc.match_score * 100).toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Pie Chart */}
          <GlassCard>
            <h2 className="text-white font-semibold mb-4">By Source Type</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={SOURCE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {SOURCE_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 8, color: '#e2e8f0' }} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Area Chart */}
        <GlassCard>
          <h2 className="text-white font-semibold mb-4">Incidents Per Day (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="incidents" stroke="#00f5ff" strokeWidth={2} fill="url(#incGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Geo Panel */}
        <GlassCard>
          <h2 className="text-white font-semibold mb-4">Geographic Origin</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {GEO_DATA.map((g, i) => (
              <div key={g.country} className="flex items-center gap-2 p-3 rounded-lg bg-white/3">
                <span className="text-xl">{g.flag}</span>
                <div>
                  <div className="text-sm text-slate-300">{g.country}</div>
                  <div className="text-xs neon-text-cyan font-mono">{g.count} incidents</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

const MOCK_INCIDENTS: Incident[] = Array.from({ length: 12 }, (_, i) => ({
  id: `mock-${i}`,
  scan_job_id: `job-${i}`,
  asset_id: `asset-${i}`,
  organization_id: 'org-1',
  source_url: ['https://youtube.com/watch?v=abc123', 'https://pirate.tv/ipl-live', 'https://t.me/sportstream'][i % 3],
  source_type: (['youtube', 'website', 'social_media'] as const)[i % 3],
  match_score: 0.7 + Math.random() * 0.29,
  detection_timestamp: new Date(Date.now() - i * 300000).toISOString(),
  geo_country: ['India', 'USA', 'Brazil', 'Indonesia'][i % 4],
  resolution_status: 'Open',
  tampering_flags: {},
}))
