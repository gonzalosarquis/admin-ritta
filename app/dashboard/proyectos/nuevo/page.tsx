'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NuevoProyectoPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    descripcion_larga: '',
    categoria: '',
    ubicacion: '',
    cliente: '',
    area: '',
    año: new Date().getFullYear(),
    estilo: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'area' || name === 'año' ? (value ? parseInt(value) : '') : value,
    }))
  }

  function generateSlug(titulo: string) {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.titulo.trim()) {
      setError('El título es obligatorio')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const slug = generateSlug(formData.titulo)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error: dbError } = await supabase
        .from('proyectos')
        .insert([{
          ...formData,
          area: formData.area === '' ? null : formData.area,
          slug,
          created_by: user.id,
          publicado: false,
        }])
        .select()

      if (dbError) throw dbError
      router.push(`/dashboard/proyectos/${data[0].id}/editar`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const categorias = ['LIVING ROOM', 'KITCHEN', 'BEDROOM', 'OFFICE', 'BATHROOM', 'DINING ROOM', 'COCINA', 'DORMITORIO', 'BAÑO', 'ESTUDIO']
  const estilos = ['MODERN', 'CONTEMPORARY', 'WARM MINIMAL', 'INDUSTRIAL', 'CLASSIC', 'ESCANDINAVO', 'BOHO']

  const inputClass = "w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-stone-900 text-sm placeholder-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition"

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm mb-4 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Volver
        </button>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Nuevo Proyecto</h1>
        <p className="text-stone-500 text-sm mt-0.5">Solo el título es obligatorio, el resto lo podés completar después</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Título *</label>
          <input type="text" name="titulo" value={formData.titulo} onChange={handleChange}
            className={inputClass} placeholder="Ej: Proyecto Beccar" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Descripción corta</label>
          <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Para mostrar en la landing page" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Descripción larga</label>
          <textarea name="descripcion_larga" value={formData.descripcion_larga} onChange={handleChange} rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Descripción completa para la página del proyecto" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Categoría</label>
            <input type="text" name="categoria" value={formData.categoria} onChange={handleChange}
              list="categorias-list" className={inputClass} placeholder="Ej: LIVING ROOM" />
            <datalist id="categorias-list">
              {categorias.map((cat) => <option key={cat} value={cat} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Estilo</label>
            <input type="text" name="estilo" value={formData.estilo} onChange={handleChange}
              list="estilos-list" className={inputClass} placeholder="Ej: MODERN" />
            <datalist id="estilos-list">
              {estilos.map((est) => <option key={est} value={est} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Ubicación</label>
            <input type="text" name="ubicacion" value={formData.ubicacion} onChange={handleChange}
              className={inputClass} placeholder="Palermo, Buenos Aires" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Cliente</label>
            <input type="text" name="cliente" value={formData.cliente} onChange={handleChange}
              className={inputClass} placeholder="Nombre del cliente" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Área (m²)</label>
            <input type="number" name="area" value={formData.area} onChange={handleChange}
              className={inputClass} placeholder="64" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Año</label>
            <input type="number" name="año" value={formData.año} onChange={handleChange}
              className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-stone-900 text-white py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-40 text-sm font-medium transition-colors">
            {loading ? 'Creando...' : 'Crear Proyecto'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-lg hover:bg-stone-50 text-sm font-medium transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
