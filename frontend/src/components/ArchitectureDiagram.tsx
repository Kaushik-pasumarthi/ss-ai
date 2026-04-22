'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Node {
  id: string
  x: number
  y: number
  label: string
  tech: string
  icon: string
  color: string
}

const NODES: Node[] = [
  { id: 'upload', x: 60, y: 120, label: 'Upload', tech: 'Next.js multipart / FastAPI stream', icon: '⬆', color: '#00f5ff' },
  { id: 'fingerprint', x: 220, y: 120, label: 'Fingerprint Engine', tech: 'pHash (imagehash) + CLIP ViT-B/32', icon: '🔍', color: '#0066ff' },
  { id: 'matcher', x: 400, y: 120, label: 'AI Matcher', tech: 'FAISS IndexFlatIP · cosine similarity', icon: '🤖', color: '#7c3aed' },
  { id: 'scan', x: 580, y: 120, label: 'Scan Engine', tech: 'Celery beat · MockCrawler · Redis', icon: '📡', color: '#00ff88' },
  { id: 'dashboard', x: 760, y: 120, label: 'Alert Dashboard', tech: 'Socket.IO · Recharts · Next.js', icon: '📊', color: '#f59e0b' },
  { id: 'enforcement', x: 940, y: 120, label: 'Enforcement', tech: 'DMCA workflow · Takedown API', icon: '⚖', color: '#ef4444' },
]

const ARROWS = [
  { from: 'upload', to: 'fingerprint' },
  { from: 'fingerprint', to: 'matcher' },
  { from: 'matcher', to: 'scan' },
  { from: 'scan', to: 'dashboard' },
  { from: 'dashboard', to: 'enforcement' },
]

const NODE_W = 120
const NODE_H = 70

export default function ArchitectureDiagram() {
  const [hovered, setHovered] = useState<string | null>(null)
  const viewW = 1060
  const viewH = 260

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full"
        style={{ minWidth: 600 }}
        aria-label="SportShield AI architecture pipeline"
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(0,245,255,0.6)" />
          </marker>
          {NODES.map(n => (
            <filter key={`glow-${n.id}`} id={`glow-${n.id}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Animated flow dots on arrows */}
        {ARROWS.map(({ from, to }) => {
          const fromNode = NODES.find(n => n.id === from)!
          const toNode = NODES.find(n => n.id === to)!
          const x1 = fromNode.x + NODE_W
          const y1 = fromNode.y + NODE_H / 2
          const x2 = toNode.x
          const y2 = toNode.y + NODE_H / 2
          return (
            <g key={`${from}-${to}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,245,255,0.3)" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <motion.circle
                r="4"
                fill="#00f5ff"
                opacity={0.8}
                animate={{ cx: [x1, x2], cy: [y1, y2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: NODES.findIndex(n => n.id === from) * 0.4 }}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {NODES.map((node, i) => {
          const isHovered = hovered === node.id
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <motion.rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isHovered ? `${node.color}22` : 'rgba(255,255,255,0.04)'}
                stroke={node.color}
                strokeWidth={isHovered ? 2 : 1}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                filter={isHovered ? `url(#glow-${node.id})` : undefined}
              />
              <text x={node.x + NODE_W / 2} y={node.y + 22} textAnchor="middle" fontSize="18" fill={node.color}>
                {node.icon}
              </text>
              <text x={node.x + NODE_W / 2} y={node.y + 40} textAnchor="middle" fontSize="10" fontWeight="600" fill="#e2e8f0">
                {node.label.split(' ').map((word, wi) => (
                  <tspan key={wi} x={node.x + NODE_W / 2} dy={wi === 0 ? 0 : 12}>{word}</tspan>
                ))}
              </text>

              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={node.x - 20}
                    y={node.y + NODE_H + 8}
                    width={NODE_W + 40}
                    height={36}
                    rx={6}
                    fill="rgba(10,15,30,0.95)"
                    stroke={node.color}
                    strokeWidth={1}
                  />
                  <text x={node.x + NODE_W / 2} y={node.y + NODE_H + 22} textAnchor="middle" fontSize="8.5" fill={node.color}>
                    {node.tech.split(' · ').map((t, ti) => (
                      <tspan key={ti} x={node.x + NODE_W / 2} dy={ti === 0 ? 0 : 11}>{t}</tspan>
                    ))}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
