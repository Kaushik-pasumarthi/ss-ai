'use client'
import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: string[]
  fallback?: ReactNode
}

export default function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    if (!allowedRoles) {
      setAuthorized(true)
      return
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setAuthorized(allowedRoles.includes(payload.role))
    } catch {
      setAuthorized(false)
    }
  }, [allowedRoles, router])

  if (authorized === null) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" /></div>
  if (!authorized) return fallback ? <>{fallback}</> : <div className="text-center py-20 text-slate-400">Access denied</div>
  return <>{children}</>
}
