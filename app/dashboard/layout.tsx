'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type DeployStatus = 'idle' | 'loading' | 'ok' | 'error'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeploy = async () => {
    setDeployStatus('loading')
    try {
      const res = await fetch('/admin/api/deploy', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setDeployStatus('ok')
      setTimeout(() => setDeployStatus('idle'), 4000)
    } catch {
      setDeployStatus('error')
      setTimeout(() => setDeployStatus('idle'), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="w-60 bg-stone-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-stone-700/50">
          <img src="/admin/logo.png" alt="Ritta Estudio" className="h-6 w-auto max-w-[140px] object-contain brightness-0 invert" />
          <p className="text-stone-500 text-xs mt-2 tracking-widest uppercase">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Contenido</p>
          <Link
            href="/dashboard/proyectos"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
              pathname?.includes('/proyectos')
                ? 'bg-white/10 text-white'
                : 'text-stone-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Proyectos
          </Link>
        </nav>

        {/* Deploy */}
        <div className="px-3 pb-3">
          <button
            onClick={handleDeploy}
            disabled={deployStatus === 'loading'}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
              deployStatus === 'ok'
                ? 'bg-emerald-500/20 text-emerald-400'
                : deployStatus === 'error'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/10 text-white hover:bg-white/15'
            } disabled:opacity-50`}
          >
            {deployStatus === 'loading' ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : deployStatus === 'ok' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20,6 9,17 4,12"/></svg>
            ) : deployStatus === 'error' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
            )}
            {deployStatus === 'loading' ? 'Publicando...' : deployStatus === 'ok' ? 'Deploy iniciado' : deployStatus === 'error' ? 'Error al publicar' : 'Publicar sitio'}
          </button>
        </div>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-stone-700/50">
          <div className="px-3 py-2 mb-1">
            <p className="text-stone-400 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-stone-400 hover:bg-white/5 hover:text-red-400 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
