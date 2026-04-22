'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NavBar from '@/components/NavBar'
import GlassCard from '@/components/GlassCard'

interface Step {
  title: string
  description: string
  visual: React.ReactNode
}

function UploadCard({ label, color, icon }: { label: string; color: string; icon: string }) {
  return (
    <div className={`glass p-4 rounded-xl border ${color} flex items-center gap-3`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="text-white font-semibold text-sm">{label}</div>
        <div className="text-slate-400 text-xs">IPL_Final_2024.mp4 · 512 MB</div>
        <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden w-32">
          <motion.div className="h-full bg-cyan-400 rounded-full" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5 }} />
        </div>
      </div>
    </div>
  )
}

function MatchScoreAnimator() {
  const [score, setScore] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setScore(s => { if (s >= 94) { clearInterval(t); return 94 } return s + 2 }), 40)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-center">
      <div className="text-7xl font-black neon-text-cyan mb-2">{score}%</div>
      <div className="text-slate-400">Match Score</div>
      <div className="mt-3 h-3 bg-white/10 rounded-full overflow-hidden w-64 mx-auto">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-red-500" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function AlertNotification() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 1500); return () => clearTimeout(t) }, [])
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass-strong border border-red-500/50 p-4 rounded-xl max-w-sm mx-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm">LIVE ALERT</span>
          </div>
          <div className="text-white font-medium">Unauthorized broadcast detected</div>
          <div className="text-slate-400 text-xs mt-1">youtube.com/watch?v=pirate123 · 94% match · India</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ForensicsPreview() {
  const [pos, setPos] = useState(50)
  return (
    <div className="space-y-3">
      <div
        className="relative h-32 rounded-xl overflow-hidden border border-white/10 cursor-col-resize"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          setPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-cyan-900/60 flex items-center justify-center">
          <span className="text-slate-400 text-sm">Original</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 to-orange-900/60 flex items-center justify-center" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <span className="text-slate-400 text-sm">Pirated</span>
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: `${pos}%` }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {['crop: ✓', 'watermark: ✓', 'recompression: ✓'].map(f => (
          <span key={f} className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs">{f}</span>
        ))}
      </div>
    </div>
  )
}

export default function DemoPage() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const STEPS: Step[] = [
    {
      title: 'Official Asset Upload',
      description: 'The IPL uploads their official match highlights to SportShield AI. The system generates a CLIP embedding and pHash fingerprint, then issues a blockchain certificate.',
      visual: <UploadCard label="IPL Final 2024 — Official Upload" color="border-cyan-500/50" icon="🎬" />,
    },
    {
      title: 'Pirate Upload Detected',
      description: 'Our mock crawler discovers a suspicious upload on YouTube. The content appears to be a re-encoded version of the official broadcast.',
      visual: (
        <div className="space-y-3">
          <UploadCard label="IPL Final 2024 — Official Upload" color="border-cyan-500/30" icon="🎬" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <UploadCard label="Suspicious: youtube.com/watch?v=pirate123" color="border-red-500/50" icon="⚠️" />
          </motion.div>
        </div>
      ),
    },
    {
      title: 'AI Flagging Incident',
      description: 'FAISS similarity search compares the suspicious upload\'s CLIP embedding against our index. The match score climbs to 94% — well above the 80% threshold.',
      visual: <MatchScoreAnimator />,
    },
    {
      title: 'Dashboard Alert',
      description: 'A real-time WebSocket event fires, pushing the incident to all connected dashboards within milliseconds. The compliance team is notified instantly.',
      visual: <AlertNotification />,
    },
    {
      title: 'Forensics Evidence',
      description: 'The forensics viewer shows side-by-side comparison with tampering flags. A DMCA notice is auto-drafted and ready for submission.',
      visual: <ForensicsPreview />,
    },
  ]

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setStep(s => {
        if (s >= STEPS.length - 1) {
          clearInterval(timerRef.current!)
          setDone(true)
          return s
        }
        return s + 1
      })
    }, 5000)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const goTo = (i: number) => {
    setStep(i)
    setDone(false)
    startTimer()
  }

  const prev = () => { if (step > 0) goTo(step - 1) }
  const next = () => { if (step < STEPS.length - 1) goTo(step + 1); else setDone(true) }

  return (
    <div className="cyber-bg min-h-screen">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white text-center">
          Guided <span className="neon-text-cyan">Demo</span>
        </motion.h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => goTo(i)}
                className={`w-8 h-8 rounded-full border text-xs font-bold transition-all ${
                  i < step ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                  i === step ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' :
                  'bg-white/5 border-white/10 text-slate-600'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </button>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-green-500/50' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard neon>
                <div className="text-cyan-400 text-xs font-semibold mb-1">STEP {step + 1} OF {STEPS.length}</div>
                <h2 className="text-xl font-bold text-white mb-3">{STEPS[step].title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{STEPS[step].description}</p>
                <div className="min-h-32 flex items-center justify-center">
                  {STEPS[step].visual}
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <GlassCard neon>
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-3">Demo Complete!</h2>
                  <p className="text-slate-400 mb-6">SportShield AI detected, analyzed, and prepared enforcement action in under 2 seconds.</p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Detection Time', value: '<500ms' },
                      { label: 'Match Score', value: '94%' },
                      { label: 'DMCA Ready', value: '✓' },
                    ].map(s => (
                      <div key={s.label} className="glass p-3 rounded-xl text-center">
                        <div className="text-xl font-black neon-text-cyan">{s.value}</div>
                        <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => goTo(0)} className="px-6 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all">
                    Restart Demo
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {!done && (
          <div className="flex items-center justify-between">
            <button onClick={prev} disabled={step === 0}
              className="px-5 py-2 rounded-xl glass border border-white/10 text-slate-400 text-sm disabled:opacity-40 hover:bg-white/5 transition-all">
              ← Prev
            </button>
            <span className="text-slate-600 text-xs">Auto-advances every 5s</span>
            <button onClick={next}
              className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all">
              {step === STEPS.length - 1 ? 'Finish →' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
