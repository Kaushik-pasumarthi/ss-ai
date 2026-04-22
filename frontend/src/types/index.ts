export interface Asset {
  id: string
  organization_id: string
  title: string
  asset_type: 'video' | 'image' | 'logo' | 'broadcast_clip'
  file_size_bytes: number
  duration_seconds?: number
  mime_type: string
  status: 'uploading' | 'processing' | 'registered' | 'failed'
  fingerprint_hash?: string
  upload_timestamp: string
  created_by: string
}

export interface Incident {
  id: string
  scan_job_id: string
  asset_id: string
  organization_id: string
  source_url: string
  source_type: 'youtube' | 'website' | 'social_media'
  match_score: number
  detection_timestamp: string
  heatmap_path?: string
  geo_country?: string
  resolution_status: 'Open' | 'Under_Review' | 'Resolved' | 'Dismissed'
  resolution_updated_at?: string
  resolution_previous_status?: string
  perceptual_hash_score?: number
  embedding_score?: number
  keyframe_match_count?: number
  tampering_flags: Record<string, boolean>
}

export interface Certificate {
  id: string
  asset_id: string
  transaction_hash: string
  block_number: number
  fingerprint_hash: string
  organization_name: string
  issued_at: string
}

export interface AnalyticsSummary {
  total_assets: number
  total_incidents: number
  active_threats: number
  scan_frequency: number
}

export interface PerformanceMetrics {
  latency_ms: number
  precision: number
  recall: number
  false_positive_rate: number
  trend: 'up' | 'down' | 'stable'
  window: string
}
