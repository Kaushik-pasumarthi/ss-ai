'use client'
import { motion } from 'framer-motion'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'

export default function ArchitecturePage() {
  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-1">
            System <span className="neon-text-cyan">Architecture</span>
          </h1>
          <p className="text-slate-500 text-sm">Hover over nodes to see technology details</p>
        </motion.div>

        <GlassCard>
          <ArchitectureDiagram />
        </GlassCard>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Frontend', tech: 'Next.js 14 App Router', desc: 'React Server Components + Client Components, Tailwind CSS, Framer Motion, Socket.IO client', color: 'text-cyan-400' },
            { title: 'Backend API', tech: 'FastAPI + PostgreSQL', desc: 'JWT auth, rate limiting, MIME validation, WebSocket server, Celery task dispatch', color: 'text-blue-400' },
            { title: 'AI Worker', tech: 'Celery + CLIP + FAISS', desc: 'pHash fingerprinting, CLIP ViT-B/32 embeddings, FAISS IndexFlatIP, GradCAM heatmaps', color: 'text-purple-400' },
          ].map((item, i) => (
            <GlassCard key={item.title} delay={i * 0.1}>
              <div className={`font-bold text-lg mb-1 ${item.color}`}>{item.title}</div>
              <div className="text-slate-300 text-sm font-mono mb-2">{item.tech}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{item.desc}</div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
