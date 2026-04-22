'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { useToast } from '@/components/ToastProvider'
import { api } from '@/lib/api'
import type { Incident } from '@/types'

type SortKey = 'match_score' | 'detection_timestamp' | 'source_type' | 'resolution_status' | 'geo_country'
type SortDir = 'asc' | 'desc'

const STATUS_STYLES: Record<string, string> = {
  Open: 'bg-red-500/20 text-red-400 border-red-500/30',
  Under_Review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  Dismissed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const PAGE_SIZE = 25

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('detection_timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [maxScore, setMaxScore] = useState(100)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    api.get<Incident[]>('/analytics/incidents', {
      params: { page, page_size: PAGE_SIZE, sort: sortKey, dir: sortDir, search, source_type: sourceFilter, status: statusFilter },
    })
      .then(r => setIncidents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setIncidents(MOCK_INCIDENTS))
      .finally(() => setLoading(false))
  }, [page, sortKey, sortDir, search, sourceFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = incidents.filter(inc => {
    const score = inc.match_score * 100
    if (score < minScore || score > maxScore) return false
    if (dateFrom && inc.detection_timestamp < dateFrom) return false
    if (dateTo && inc.detection_timestamp > dateTo) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const exportCsv = async () => {
    try {
      const r = await api.get('/analytics/export/csv', { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = url; a.download = 'incidents.csv'; a.click()
      toast('CSV exported', 'success')
    } catch { toast('Export failed', 'error') }
  }

  const exportPdf = async () => {
    try {
      const r = await api.get('/analytics/export/pdf', { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = url; a.download = 'incidents.pdf'; a.click()
      toast('PDF exported', 'success')
    } catch { toast('Export failed', 'error') }
  }

  const seedDemo = async () => {
    try {
      await api.post('/demo/seed')
      toast('Demo data seeded!', 'success')
      fetchData()
    } catch { toast('Seed failed', 'error') }
  }

  const updateStatus = async (incId: string, status: string) => {
    try {
      await api.patch(`/incidents/${incId}/status`, { resolution_status: status })
      setIncidents(prev => prev.map(i => i.id === incId ? { ...i, resolution_status: status as Incident['resolution_status'] } : i))
      toast('Status updated', 'success')
    } catch { toast('Update failed', 'error') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? <span className="ml-1 text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span> : <span className="ml-1 text-slate-600">↕</span>

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
          Analytics <span className="neon-text-cyan">Panel</span>
        </motion.h1>

        {/* Filter Bar */}
        <GlassCard>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search assets…"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
            <select
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="" className="bg-slate-900">All Sources</option>
              <option value="youtube" className="bg-slate-900">YouTube</option>
              <option value="website" className="bg-slate-900">Website</option>
              <option value="social_media" className="bg-slate-900">Social Media</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="Open" className="bg-slate-900">Open</option>
              <option value="Under_Review" className="bg-slate-900">Under Review</option>
              <option value="Resolved" className="bg-slate-900">Resolved</option>
              <option value="Dismissed" className="bg-slate-900">Dismissed</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>{minScore}%</span>
              <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="flex-1 accent-cyan-400" />
              <span>{maxScore}%</span>
              <input type="range" min={0} max={100} value={maxScore} onChange={e => setMaxScore(+e.target.value)} className="flex-1 accent-cyan-400" />
            </div>
          </div>
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg glass border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-all">
            📥 Export CSV
          </button>
          <button onClick={exportPdf} className="px-4 py-2 rounded-lg glass border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-all">
            📄 Export PDF
          </button>
          <button onClick={seedDemo} className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-all">
            🌱 Demo Seed
          </button>
          <span className="ml-auto text-slate-500 text-sm self-center">{filtered.length} incidents</span>
        </div>

        {/* Table */}
        <GlassCard className="overflow-x-auto p-0">
          {loading ? (
            <div className="p-6"><SkeletonLoader lines={8} /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  {[
                    { key: null, label: 'ID' },
                    { key: null, label: 'Asset' },
                    { key: 'source_type' as SortKey, label: 'Source' },
                    { key: 'match_score' as SortKey, label: 'Score' },
                    { key: 'resolution_status' as SortKey, label: 'Status' },
                    { key: 'geo_country' as SortKey, label: 'Country' },
                    { key: 'detection_timestamp' as SortKey, label: 'Date' },
                    { key: null, label: 'Actions' },
                  ].map(col => (
                    <th
                      key={col.label}
                      className={`text-left py-3 px-4 font-medium ${col.key ? 'cursor-pointer hover:text-slate-300' : ''}`}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      {col.label}{col.key && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((inc, i) => (
                  <motion.tr
                    key={inc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-all"
                  >
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{inc.id.slice(0, 8)}…</td>
                    <td className="py-3 px-4 text-slate-300">{inc.asset_id.slice(0, 8)}…</td>
                    <td className="py-3 px-4 text-slate-400 capitalize">{inc.source_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${
                        inc.match_score >= 0.9 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        inc.match_score >= 0.75 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-green-500/20 text-green-400 border-green-500/30'
                      }`}>
                        {(inc.match_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={inc.resolution_status}
                        onChange={e => updateStatus(inc.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border bg-transparent cursor-pointer focus:outline-none ${STATUS_STYLES[inc.resolution_status]}`}
                      >
                        {['Open', 'Under_Review', 'Resolved', 'Dismissed'].map(s => (
                          <option key={s} value={s} className="bg-slate-900 text-slate-200">{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inc.geo_country ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{new Date(inc.detection_timestamp).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <a href={`/incidents/${inc.id}`} className="text-cyan-400 hover:text-cyan-300 text-xs">View →</a>
                    </td>
                  </motion.tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-slate-600">No incidents match your filters</td></tr>
                )}
              </tbody>
            </table>
          )}
        </GlassCard>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg glass border border-white/10 text-slate-400 text-sm disabled:opacity-40 hover:bg-white/5 transition-all">
            ← Prev
          </button>
          <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg glass border border-white/10 text-slate-400 text-sm disabled:opacity-40 hover:bg-white/5 transition-all">
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

const MOCK_INCIDENTS: Incident[] = Array.from({ length: 50 }, (_, i) => ({
  id: `inc-${i.toString().padStart(3, '0')}`,
  scan_job_id: `job-${i}`,
  asset_id: `asset-${i % 5}`,
  organization_id: 'org-1',
  source_url: ['https://youtube.com/watch?v=abc', 'https://pirate.tv/live', 'https://t.me/stream'][i % 3],
  source_type: (['youtube', 'website', 'social_media'] as const)[i % 3],
  match_score: 0.65 + Math.random() * 0.34,
  detection_timestamp: new Date(Date.now() - i * 3600000 * 12).toISOString(),
  geo_country: ['India', 'USA', 'Brazil', 'Indonesia', 'Pakistan'][i % 5],
  resolution_status: (['Open', 'Under_Review', 'Resolved', 'Dismissed'] as const)[i % 4],
  tampering_flags: {},
}))
