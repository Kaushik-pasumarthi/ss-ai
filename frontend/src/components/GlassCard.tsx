'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  neon?: boolean
  delay?: number
}

export default function GlassCard({ children, className = '', neon = false, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`${neon ? 'glass-strong neon-border-cyan' : 'glass'} p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}
