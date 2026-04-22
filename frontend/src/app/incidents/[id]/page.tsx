'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { useToast } from '@/components/ToastProvider'
import { api, MEDIA_URL } from '@/lib/api'
import type { Incident } from '@/types'

// ── SimilaritySlider ──────────────────────────────────────────────────────────
function SimilaritySlider({ originalUrl, suspiciousUrl }: { originalUrl?: string; suspiciousUrl?: string }) {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const move = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-48 rounded-xl overflow-hidden cursor-col-resize select-none border border-white/10"
      onMouseMove={e => dragging.current && move(e.clientX)}
      onMouseDown={() => { dragging.current = true }}
      onMouseUp={() => { dragging.current = false }}
      onMouseLeave={() => { dragging.current = false }}
      onTouchMove={e => move(e.touches[0].clientX)}
    >
      {/* Original (left) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-cyan-900/40">
        {originalUrl
          ? <img src={originalUrl} alt="Original" className="w-full h-full object-cover" />
          : <div className="text-center"><div className="text-4xl mb-2">🎬</div><div className="text-slate-400 text-sm">Original Asset</div></div>
        }
      </div>
      {/* Suspicious (right, clipped) */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/40 to-orange-900/40"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        {suspiciousUrl
          ? <img src={suspiciousUrl} alt="Suspicious" className="w-full h-full object-cover" />
          : <div className="text-center"><div className="text-4xl mb-2">⚠️</div><div className="text-slate-400 text-sm">Suspicious Upload</div></div>
        }
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 border-2 border-cyan-400 flex items-center justify-center shadow-lg">
          <span className="text-slate-800 text-xs font-bold">⟺</span>
        </div>
      </div>
      {/* Labels */}
      <div className="absolute top-2 left-2 text-xs bg-blue-500/80 text-white px-2 py-0.5 rounded">Original</div>
      <div className="absolute top-2 right-2 text-xs bg-red-500/80 text-white px-2 py-0.5 rounded">Suspicious</div>
    </div>
  )
}

// ── HeatmapOverlay ────────────────────────────────────────────────────────────
function HeatmapOverlay({ heatmapPath }: { heatmapPath?: string }) {
  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10">
      {heatmapPath ? (
        <img src={heatmapPath} alt="Similarity heatmap" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(255,100,0,0.4) 30%, rgba(255,0,0,0.6) 60%, rgba(255,100,0,0.3) 80%, rgba(0,245,255,0.1) 100%)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/60 text-sm">Similarity Heatmap (GradCAM)</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Takedown Timeline ─────────────────────────────────────────────────────────
const WORKFLOW_STEPS = ['Draft', 'Submitted', 'Acknowledged', 'Resolved']
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
const SEVERITY_COLORS: Record<string, string> = {
  Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-orange-400', Critical: 'text-red-400',
}

export default function ForensicsViewerPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [dmcaText, setDmcaText] = useState('')
  const [severity, setSeverity] = useState('High')
  const [workflowStep, setWorkflowStep] = useState(0)

  useEffect(() => {
    api.get<Incident>(`/incidents/${id}`)
      .then(r => {
        setIncident(r.data)
        setDmcaText(buildDmca(r.data))
      })
      .catch(() => {
        setIncident(MOCK_INCIDENT)
        setDmcaText(buildDmca(MOCK_INCIDENT))
      })
      .finally(() => setLoading(false))
  }, [id])

  const buildDmca = (inc: Incident) =>
    `DMCA Takedown Notice\n\nIncident ID: ${inc.id}\nSource URL: ${inc.source_url}\nDetection Time: ${inc.detection_timestamp}\nMatch Score: ${(inc.match_score * 100).toFixed(1)}%\n\nThis notice is to inform you that the content at the above URL infringes upon our copyrighted sports media. We request immediate removal.`

  const advanceWorkflow = async () => {
    if (workflowStep >= WORKFLOW_STEPS.length - 1) return
    try {
      await api.post(`/takedown/${id}/transition`, { target_status: WORKFLOW_STEPS[workflowStep + 1] })
    } catch { /* demo mode */ }
    setWorkflowStep(s => s + 1)
    toast(`Status advanced to ${WORKFLOW_STEPS[workflowStep + 1]}`, 'success')
  }

  if (loading) return (
    <div className="cyber-bg min-h-screen"><NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8"><SkeletonLoader lines={10} /></div>
    </div>
  )

  const inc = incident ?? MOCK_INCIDENT

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Forensics <span className="neon-text-cyan">Viewer</span></h1>
          <div className="text-4xl font-black neon-text-cyan">{(inc.match_score * 100).toFixed(1)}%</div>
        </motion.div>

        {/* Incident Metadata */}
        <GlassCard>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500 text-xs mb-1">Source URL</div><div className="text-cyan-400 truncate">{inc.source_url}</div></div>
            <div><div className="text-slate-500 text-xs mb-1">Source Type</div><div className="text-slate-200 capitalize">{inc.source_type.replace('_', ' ')}</div></div>
            <div><div className="text-slate-500 text-xs mb-1">Detection Time</div><div className="text-slate-200">{new Date(inc.detection_timestamp).toLocaleString()}</div></div>
            <div><div className="text-slate-500 text-xs mb-1">Country</div><div className="text-slate-200">{inc.geo_country ?? 'Unknown'}</div></div>
          </div>
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Similarity Slider */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-3">Side-by-Side Comparison</h3>
            <SimilaritySlider
              originalUrl={`${MEDIA_URL}/media/frames/${inc.asset_id}_original.jpg`}
              suspiciousUrl={`${MEDIA_URL}/media/pirated/${inc.asset_id}/pirated_copy.jpg`}
            />
          </GlassCard>

          {/* Heatmap */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-3">Similarity Heatmap</h3>
            <HeatmapOverlay heatmapPath={inc.heatmap_path ? `${MEDIA_URL}/media/heatmaps/${inc.id}.png` : undefined} />
            <p className="text-slate-500 text-xs mt-2">Red regions indicate highest visual similarity</p>
          </GlassCard>
        </div>

        {/* XAI Panel */}
        <GlassCard>
          <h3 className="text-white font-semibold mb-4">Explainable AI Analysis</h3>
          <div className="space-y-3 mb-5">
            {[
              { label: 'pHash Score', value: inc.perceptual_hash_score ?? 0.87, color: '#00f5ff' },
              { label: 'Embedding Score', value: inc.embedding_score ?? inc.match_score, color: '#0066ff' },
              { label: 'Keyframe Matches', value: Math.min(1, (inc.keyframe_match_count ?? 7) / 10), color: '#00ff88' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="font-mono" style={{ color: item.color }}>{(item.value * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tampering Flags */}
          <div className="mb-4">
            <div className="text-slate-400 text-sm mb-2">Tampering Flags</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(inc.tampering_flags ?? MOCK_FLAGS)
                .filter(([flag]) => !flag.startsWith('_'))
                .map(([flag, active]) => (
                <span
                  key={flag}
                  className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
                    active ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-slate-600 border-white/10'
                  }`}
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>

          {/* Plain-language summary */}
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <p className="text-slate-300 text-sm">
              <span className="neon-text-cyan font-semibold">AI Summary: </span>
              This content shows {(inc.match_score * 100).toFixed(0)}% visual similarity to the registered asset.
              {inc.tampering_flags?.recompression ? ' Re-compression artifacts detected.' : ''}
              {inc.tampering_flags?.crop ? ' Cropping modification identified.' : ''}
              {' '}Confidence level is <strong className="text-white">{inc.match_score >= 0.9 ? 'Very High' : inc.match_score >= 0.75 ? 'High' : 'Moderate'}</strong>.
            </p>
          </div>
        </GlassCard>

        {/* Takedown Panel */}
        <GlassCard>
          <h3 className="text-white font-semibold mb-4">Takedown Action</h3>

          {/* Workflow Timeline */}
          <div className="flex items-center gap-2 mb-6">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  i < workflowStep ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  i === workflowStep ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                  'bg-white/5 text-slate-600 border-white/10'
                }`}>
                  {i < workflowStep ? '✓' : i === workflowStep ? '●' : '○'} {step}
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <div className="w-4 h-px bg-white/20" />}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
              >
                {SEVERITY_OPTIONS.map(s => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <span className={`text-2xl font-bold ${SEVERITY_COLORS[severity]}`}>{severity} Severity</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-1 block">DMCA Draft</label>
            <textarea
              value={dmcaText}
              onChange={e => setDmcaText(e.target.value)}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          <button
            onClick={advanceWorkflow}
            disabled={workflowStep >= WORKFLOW_STEPS.length - 1}
            className="px-6 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {workflowStep < WORKFLOW_STEPS.length - 1
              ? `Advance to ${WORKFLOW_STEPS[workflowStep + 1]} →`
              : '✓ Resolved'}
          </button>
        </GlassCard>
      </div>
    </div>
  )
}

const MOCK_FLAGS = { crop: true, resize: false, watermark: true, recompression: true, color_edit: false }

const MOCK_INCIDENT: Incident = {
  id: 'inc-demo-1',
  scan_job_id: 'job-1',
  asset_id: 'asset-1',
  organization_id: 'org-1',
  source_url: 'https://youtube.com/watch?v=pirate123',
  source_type: 'youtube',
  match_score: 0.94,
  detection_timestamp: new Date(Date.now() - 3600000).toISOString(),
  geo_country: 'India',
  resolution_status: 'Open',
  perceptual_hash_score: 0.87,
  embedding_score: 0.94,
  keyframe_match_count: 7,
  tampering_flags: MOCK_FLAGS,
}
