'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface Stats {
  total: number
  published: number
  draft: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('publicado')

      if (error) throw error

      const total = data?.length || 0
      const published = data?.filter((p) => p.publicado).length || 0
      const draft = total - published

      setStats({ total, published, draft })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Bienvenida</h1>
        <p className="text-stone-500 text-sm mt-1">Panel de administración — Ritta Estudio</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Total */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Total proyectos</p>
            <p className="text-4xl font-bold text-stone-900 tracking-tight">{stats.total}</p>
            <p className="text-stone-400 text-sm mt-1">en el portfolio</p>
          </div>

          {/* Published */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Publicados</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-stone-900 tracking-tight">{stats.published}</p>
              {stats.total > 0 && (
                <p className="text-stone-400 text-sm mb-1">
                  ({Math.round((stats.published / stats.total) * 100)}%)
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-stone-400 text-sm">visibles en la landing</p>
            </div>
          </div>

          {/* Drafts */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Borradores</p>
            <p className="text-4xl font-bold text-stone-900 tracking-tight">{stats.draft}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              <p className="text-stone-400 text-sm">no visibles</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Acciones rápidas</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/proyectos"
            className="flex items-center gap-2 border border-stone-200 text-stone-700 px-4 py-2.5 rounded-lg hover:bg-stone-50 text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Ver proyectos
          </Link>
          <Link
            href="/dashboard/proyectos/nuevo"
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-lg hover:bg-stone-800 text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo proyecto
          </Link>
        </div>
      </div>
    </div>
  )
}
