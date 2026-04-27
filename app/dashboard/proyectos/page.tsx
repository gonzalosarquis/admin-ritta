'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProyectos()
  }, [])

  async function loadProyectos() {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*, proyecto_imagenes(url, orden)')
        .order('orden', { ascending: true, nullsFirst: false })

      if (error) throw error
      setProyectos(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteProyecto(id: string) {
    if (!confirm('¿Eliminar este proyecto?')) return
    try {
      const { error } = await supabase.from('proyectos').delete().eq('id', id)
      if (error) throw error
      setProyectos(proyectos.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function togglePublicado(id: string, actual: boolean) {
    try {
      const { error } = await supabase
        .from('proyectos')
        .update({ publicado: !actual })
        .eq('id', id)
      if (error) throw error
      setProyectos(proyectos.map(p => p.id === id ? { ...p, publicado: !actual } : p))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Proyectos</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {loading ? '...' : `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/dashboard/proyectos/nuevo"
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-lg hover:bg-stone-800 text-sm font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Proyecto
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
        </div>
      ) : proyectos.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-16 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <p className="text-stone-600 font-medium mb-1">No hay proyectos aún</p>
          <p className="text-stone-400 text-sm mb-5">Crea tu primer proyecto para empezar</p>
          <Link href="/dashboard/proyectos/nuevo" className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
            Crear proyecto
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider" style={{width: '40%'}}>Proyecto</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider hidden md:table-cell">Ubicación</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider hidden md:table-cell">Categoría</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {proyectos.map((proyecto) => {
                const imgs: { url: string; orden: number }[] = proyecto.proyecto_imagenes || []
                const sorted = [...imgs].sort((a, b) => a.orden - b.orden)
                const thumb = sorted[0]?.url || null
                const imgCount = imgs.length
                return (
                <tr key={proyecto.id} className="hover:bg-stone-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={proyecto.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21,15 16,10 5,21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Title + meta */}
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 text-sm truncate">{proyecto.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-stone-400 text-xs">{proyecto.año} · {proyecto.estilo}</p>
                          {imgCount > 0 && (
                            <span className="text-xs text-stone-400">{imgCount} img{imgCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-500 text-sm hidden md:table-cell">{proyecto.ubicacion}</td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                      {proyecto.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublicado(proyecto.id, proyecto.publicado)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        proyecto.publicado
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${proyecto.publicado ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                      {proyecto.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/proyectos/${proyecto.id}/editar`}
                        className="text-sm text-stone-500 hover:text-stone-900 font-medium transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => deleteProyecto(proyecto.id)}
                        className="text-sm text-stone-300 hover:text-red-500 font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
