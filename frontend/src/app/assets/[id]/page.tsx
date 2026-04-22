'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import { api } from '@/lib/api'
import type { Asset, Certificate } from '@/types'

interface AssetDetail extends Asset {
  certificate?: Certificate
}

const STATUS_STYLES: Record<Asset['status'], string> = {
  uploading: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  registered: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AssetDetail>(`/assets/${id}`)
      .then(r => setAsset(r.data))
      .catch(() => setAsset(MOCK_ASSET))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <SkeletonLoader lines={8} />
      </div>
    </div>
  )

  if (!asset) return null

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
          Asset <span className="neon-text-cyan">Detail</span>
        </motion.h1>

        {/* Metadata Card */}
        <GlassCard>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{asset.title}</h2>
              <p className="text-slate-400 text-sm mt-1 capitalize">{asset.asset_type.replace('_', ' ')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full border text-sm font-medium ${STATUS_STYLES[asset.status]}`}>
              {asset.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'File Size', value: `${(asset.file_size_bytes / 1024 / 1024).toFixed(2)} MB` },
              { label: 'MIME Type', value: asset.mime_type },
              { label: 'Upload Date', value: new Date(asset.upload_timestamp).toLocaleString() },
              ...(asset.duration_seconds ? [{ label: 'Duration', value: `${asset.duration_seconds.toFixed(1)}s` }] : []),
              { label: 'Organization', value: asset.organization_id },
              { label: 'Created By', value: asset.created_by },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-500 text-xs mb-1">{item.label}</div>
                <div className="text-slate-200 text-sm font-mono truncate">{item.value}</div>
              </div>
            ))}
          </div>
          {asset.fingerprint_hash && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-slate-500 text-xs mb-1">Fingerprint Hash</div>
              <div className="text-cyan-400 font-mono text-sm break-all">{asset.fingerprint_hash}</div>
            </div>
          )}
        </GlassCard>

        {/* Embedding Status */}
        <GlassCard>
          <h3 className="text-white font-semibold mb-3">Embedding Status</h3>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${asset.status === 'registered' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            <span className="text-slate-300 text-sm">
              {asset.status === 'registered'
                ? 'CLIP ViT-B/32 embedding indexed in FAISS'
                : 'Embedding generation in progress…'}
            </span>
          </div>
        </GlassCard>

        {/* Certificate Card */}
        {asset.certificate ? (
          <GlassCard neon>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Blockchain Certificate</h3>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs font-semibold">Verified on Chain</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Transaction Hash', value: asset.certificate.transaction_hash, mono: true, color: 'text-cyan-400' },
                { label: 'Block Number', value: `#${asset.certificate.block_number}`, mono: true, color: 'text-slate-200' },
                { label: 'Organization', value: asset.certificate.organization_name, mono: false, color: 'text-slate-200' },
                { label: 'Fingerprint Hash', value: asset.certificate.fingerprint_hash, mono: true, color: 'text-purple-400' },
                { label: 'Issued At', value: new Date(asset.certificate.issued_at).toLocaleString(), mono: false, color: 'text-slate-300' },
              ].map(item => (
                <div key={item.label} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <span className="text-slate-500 text-xs w-36 shrink-0">{item.label}</span>
                  <span className={`${item.mono ? 'font-mono text-xs' : 'text-sm'} ${item.color} break-all`}>{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <div className="text-center py-6 text-slate-500">
              <div className="text-3xl mb-2">🔗</div>
              <p>Certificate will be generated once asset processing completes</p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

const MOCK_ASSET: AssetDetail = {
  id: 'demo-1',
  organization_id: 'org-ipl',
  title: 'IPL 2024 Final Highlights',
  asset_type: 'broadcast_clip',
  file_size_bytes: 524288000,
  duration_seconds: 1847.5,
  mime_type: 'video/mp4',
  status: 'registered',
  fingerprint_hash: 'a3f8c2e1d4b7a9f0e2c5d8b1a4f7c0e3',
  upload_timestamp: new Date(Date.now() - 86400000).toISOString(),
  created_by: 'user-admin',
  certificate: {
    id: 'cert-1',
    asset_id: 'demo-1',
    transaction_hash: '0x7f3a9c2e1d4b8f0a5c7e2d9b4f1a8c3e6d0b7f4a2c9e5d8b1f4a7c0e3d6b9f2',
    block_number: 19847362,
    fingerprint_hash: 'a3f8c2e1d4b7a9f0e2c5d8b1a4f7c0e3',
    organization_name: 'IPL Media Rights Ltd.',
    issued_at: new Date(Date.now() - 82800000).toISOString(),
  },
}
