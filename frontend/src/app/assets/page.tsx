'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { useToast } from '@/components/ToastProvider'
import { api } from '@/lib/api'
import type { Asset } from '@/types'

const STATUS_STYLES: Record<Asset['status'], string> = {
  uploading: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  registered: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function AssetsPage() {
  const { toast } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [orgId, setOrgId] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const storedOrgId = localStorage.getItem('org_id')
    if (storedOrgId) setOrgId(storedOrgId)

    api.get<Asset[]>('/assets/')
      .then(r => setAssets(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAssets(MOCK_ASSETS))
      .finally(() => setLoading(false))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setProgress(0)

    // Simulate progress 0→100 over 2s
    const interval = setInterval(() => {
      setProgress(p => {
        if (p === null || p >= 100) { clearInterval(interval); return 100 }
        return p + 5
      })
    }, 100)

    const form = new FormData()
    form.append('file', file)
    form.append('title', title || file.name)
    if (orgId) form.append('organization_id', orgId)

    try {
      await api.post('/assets/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast('Asset uploaded successfully!', 'success')
      setFile(null); setTitle(''); setOrgId('')
      const r = await api.get<Asset[]>('/assets/')
      setAssets(Array.isArray(r.data) ? r.data : [])
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error'
      toast(`Upload failed: ${detail}`, 'error')
      console.error('Upload error:', err?.response?.data)
    } finally {
      setTimeout(() => { setProgress(null); setSubmitting(false) }, 500)
    }
  }

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
          Asset <span className="neon-text-cyan">Registration</span>
        </motion.h1>

        {/* Upload Zone */}
        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 hover:border-cyan-500/50 hover:bg-white/3'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*,image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">{file.type.startsWith('video') ? '🎬' : '🖼️'}</div>
                  <div className="text-cyan-400 font-semibold">{file.name}</div>
                  <div className="text-slate-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">⬆️</div>
                  <div className="text-slate-300 font-medium">Drag & drop or click to upload</div>
                  <div className="text-slate-500 text-sm mt-1">Supports MP4, MOV, AVI, JPG, PNG, WebP (max 500 MB)</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <AnimatePresence>
              {progress !== null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Uploading…</span><span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. IPL 2024 Final Highlights"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Organization ID</label>
                <input
                  value={orgId}
                  onChange={e => setOrgId(e.target.value)}
                  placeholder="org-uuid"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 text-sm font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || submitting}
              className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Uploading…' : 'Register Asset'}
            </button>
          </form>
        </GlassCard>

        {/* Asset Table */}
        <GlassCard>
          <h2 className="text-white font-semibold mb-4">Registered Assets</h2>
          {loading ? <SkeletonLoader lines={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-all"
                    >
                      <td className="py-3 pr-4 text-slate-200 font-medium">{a.title}</td>
                      <td className="py-3 pr-4 text-slate-400 capitalize">{a.asset_type.replace('_', ' ')}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 text-xs">
                        {new Date(a.upload_timestamp).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                  {assets.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-600">No assets registered yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

const MOCK_ASSETS: Asset[] = [
  { id: '1', organization_id: 'org-1', title: 'IPL 2024 Final Highlights', asset_type: 'broadcast_clip', file_size_bytes: 524288000, mime_type: 'video/mp4', status: 'registered', upload_timestamp: new Date(Date.now() - 86400000).toISOString(), created_by: 'user-1', fingerprint_hash: 'abc123' },
  { id: '2', organization_id: 'org-1', title: 'Team Logo Official', asset_type: 'logo', file_size_bytes: 204800, mime_type: 'image/png', status: 'registered', upload_timestamp: new Date(Date.now() - 172800000).toISOString(), created_by: 'user-1' },
  { id: '3', organization_id: 'org-1', title: 'Match Preview Clip', asset_type: 'video', file_size_bytes: 104857600, mime_type: 'video/mp4', status: 'processing', upload_timestamp: new Date(Date.now() - 3600000).toISOString(), created_by: 'user-1' },
]
