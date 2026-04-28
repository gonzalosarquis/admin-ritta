'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Proyecto {
  id: string
  titulo: string
  descripcion: string
  descripcion_larga: string
  categoria: string
  ubicacion: string
  cliente: string
  area: number | null
  año: number
  estilo: string
  imagen_hero: string | null
  orden: number | null
  publicado: boolean
}

interface Imagen {
  id: string
  proyecto_id: string
  url: string
  orden: number
  titulo: string | null
}

interface Video {
  id: string
  proyecto_id: string
  url_youtube: string
  titulo: string | null
  orden: number
}

export default function EditarProyectoPage() {
  const router = useRouter()
  const params = useParams()
  const proyectoId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'detalles' | 'imagenes' | 'videos'>('detalles')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Proyecto>({
    id: '',
    titulo: '',
    descripcion: '',
    descripcion_larga: '',
    categoria: 'LIVING ROOM',
    ubicacion: '',
    cliente: '',
    area: null,
    año: new Date().getFullYear(),
    estilo: 'MODERN',
    imagen_hero: null,
    orden: null,
    publicado: false,
  })

  const [imagenes, setImagenes] = useState<Imagen[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [addingVideo, setAddingVideo] = useState(false)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoMode, setVideoMode] = useState<'youtube' | 'upload'>('youtube')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoUploadProgress, setVideoUploadProgress] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadProyecto()
  }, [])

  async function loadProyecto() {
    try {
      const { data: proyecto, error: proyectoError } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', proyectoId)
        .single()

      if (proyectoError) throw proyectoError
      setFormData(proyecto)

      const { data: imagenes, error: imagenesError } = await supabase
        .from('proyecto_imagenes')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('orden', { ascending: true })

      if (imagenesError) throw imagenesError
      setImagenes(imagenes || [])

      const { data: videos, error: videosError } = await supabase
        .from('proyecto_videos')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('orden', { ascending: true })

      if (videosError) throw videosError
      setVideos(videos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando proyecto')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'area' || name === 'año' || name === 'orden' ? (value ? parseInt(value) : null) : value,
      ...(name === 'publicado' && { publicado: (e.target as HTMLInputElement).checked }),
    }))
  }

  async function handleSubmitDetalles(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('proyectos')
        .update({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          descripcion_larga: formData.descripcion_larga,
          categoria: formData.categoria,
          ubicacion: formData.ubicacion,
          cliente: formData.cliente,
          area: formData.area,
          año: formData.año,
          estilo: formData.estilo,
          orden: formData.orden,
          publicado: formData.publicado,
        })
        .eq('id', proyectoId)

      if (updateError) throw updateError
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    if (imagenes.length + fileArray.length > 15) {
      setError('Máximo 15 imágenes por proyecto')
      return
    }

    setUploadingImages(true)
    setUploadProgress({ current: 0, total: fileArray.length })
    setError(null)

    try {
      const nextOrden = imagenes.length > 0 ? Math.max(...imagenes.map(i => i.orden)) + 1 : 1

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setUploadProgress({ current: i + 1, total: fileArray.length })

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('proyectoId', proyectoId)

        const uploadResponse = await fetch('/admin/api/upload-image', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`)
        }

        const { url } = await uploadResponse.json()

        const { error: insertError } = await supabase
          .from('proyecto_imagenes')
          .insert([{
            proyecto_id: proyectoId,
            url: url,
            orden: nextOrden + i,
            titulo: file.name.replace(/\.[^/.]+$/, ''),
          }])

        if (insertError) throw insertError
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadProyecto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo imágenes')
    } finally {
      setUploadingImages(false)
      setUploadProgress(null)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files
    if (files) await uploadFiles(files)
  }

  async function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) await uploadFiles(files)
  }

  async function deleteImagen(imagenId: string) {
    if (!confirm('¿Eliminar esta imagen?')) return

    try {
      const { error } = await supabase
        .from('proyecto_imagenes')
        .delete()
        .eq('id', imagenId)

      if (error) throw error
      await loadProyecto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar imagen')
    }
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault()
    setAddingVideo(true)
    setError(null)

    try {
      if (!newVideoUrl.trim()) throw new Error('Ingresa una URL de YouTube')

      const nextOrden = videos.length > 0 ? Math.max(...videos.map(v => v.orden)) + 1 : 1

      const { error: insertError } = await supabase
        .from('proyecto_videos')
        .insert([{
          proyecto_id: proyectoId,
          url_youtube: newVideoUrl,
          orden: nextOrden,
          titulo: `Video ${nextOrden}`,
        }])

      if (insertError) throw insertError

      setNewVideoUrl('')
      await loadProyecto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar video')
    } finally {
      setAddingVideo(false)
    }
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingVideo(true)
    setError(null)

    try {
      // 1. Subir directo a Cloudinary desde el browser
      setVideoUploadProgress('Subiendo a Cloudinary...')
      const cloudForm = new FormData()
      cloudForm.append('file', file)
      cloudForm.append('upload_preset', 'ritta-videos')
      cloudForm.append('folder', 'ritta-estudio')

      const cloudRes = await fetch(
        'https://api.cloudinary.com/v1_1/dni8hhwpo/video/upload',
        { method: 'POST', body: cloudForm }
      )
      if (!cloudRes.ok) {
        const err = await cloudRes.json()
        throw new Error(err.error?.message || `Cloudinary error ${cloudRes.status}`)
      }
      const cloudData = await cloudRes.json()

      // 2. Guardar URL en Supabase (URL original de Cloudinary, sin transformaciones en caliente)
      setVideoUploadProgress('Guardando...')
      const nextOrden = videos.length > 0 ? Math.max(...videos.map(v => v.orden)) + 1 : 1
      const { error: insertError } = await supabase.from('proyecto_videos').insert([{
        proyecto_id: proyectoId,
        url_youtube: cloudData.secure_url,
        orden: nextOrden,
        titulo: file.name.replace(/\.[^.]+$/, ''),
      }])
      if (insertError) throw insertError

      await loadProyecto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir video')
    } finally {
      setUploadingVideo(false)
      setVideoUploadProgress(null)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  async function deleteVideo(videoId: string) {
    if (!confirm('¿Eliminar este video?')) return

    try {
      const { error } = await supabase
        .from('proyecto_videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error
      await loadProyecto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar video')
    }
  }

  async function setAsHero(url: string) {
    try {
      const { error } = await supabase
        .from('proyectos')
        .update({ imagen_hero: url })
        .eq('id', proyectoId)
      if (error) throw error
      setFormData(prev => ({ ...prev, imagen_hero: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al establecer imagen principal')
    }
  }

  function getYouTubeId(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  const categorias = ['LIVING ROOM', 'KITCHEN', 'BEDROOM', 'OFFICE', 'BATHROOM', 'DINING ROOM', 'COCINA', 'DORMITORIO', 'BAÑO', 'ESTUDIO']
  const estilos = ['MODERN', 'CONTEMPORARY', 'WARM MINIMAL', 'INDUSTRIAL', 'CLASSIC', 'ESCANDINAVO', 'BOHO']

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Editar Proyecto</h1>
          <p className="text-stone-500 text-sm mt-1">{formData.titulo}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Volver
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          Cambios guardados correctamente
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('detalles')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'detalles'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Detalles
        </button>
        <button
          onClick={() => setActiveTab('imagenes')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'imagenes'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Imágenes ({imagenes.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'videos'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Videos ({videos.length})
        </button>
      </div>

      {/* Tab: Detalles */}
      {activeTab === 'detalles' && (
        <form onSubmit={handleSubmitDetalles} className="bg-white rounded-xl border border-stone-200 p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Título *</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
                placeholder="Ej: Diseño de Sala de Estar"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Orden</label>
              <input
                type="number"
                name="orden"
                value={formData.orden || ''}
                onChange={handleChange}
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Descripción corta</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              placeholder="Para mostrar en la landing"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Descripción larga</label>
            <textarea
              name="descripcion_larga"
              value={formData.descripcion_larga ?? ''}
              onChange={handleChange}
              rows={5}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              placeholder="Descripción completa para la página del proyecto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Categoría</label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                list="categorias-list"
                placeholder="Ej: LIVING ROOM"
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
              <datalist id="categorias-list">
                {categorias.map((cat) => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Estilo</label>
              <input
                type="text"
                name="estilo"
                value={formData.estilo}
                onChange={handleChange}
                list="estilos-list"
                placeholder="Ej: MODERN"
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
              <datalist id="estilos-list">
                {estilos.map((est) => <option key={est} value={est} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Ubicación</label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion ?? ''}
                onChange={handleChange}
                placeholder="Ej: Buenos Aires"
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Cliente</label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente ?? ''}
                onChange={handleChange}
                placeholder="Nombre del cliente"
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Área m²</label>
              <input
                type="number"
                name="area"
                value={formData.area || ''}
                onChange={handleChange}
                placeholder="Ej: 120"
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Año</label>
              <input
                type="number"
                name="año"
                value={formData.año}
                onChange={handleChange}
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-lg border border-stone-200">
            <input
              type="checkbox"
              name="publicado"
              checked={formData.publicado}
              onChange={handleChange}
              className="w-4 h-4 rounded border-stone-300"
            />
            <label className="text-sm font-medium text-stone-700">Publicado (visible en la landing)</label>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-stone-900 text-white py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-50 text-sm font-semibold transition"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Imágenes */}
      {activeTab === 'imagenes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Galería</p>
                <p className="text-stone-900 font-semibold">{imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''} · máximo 15</p>
              </div>
            </div>

            {/* Drop zone */}
            <div className="mb-8">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages}
                className="hidden"
                id="image-input"
              />
              <label
                htmlFor="image-input"
                className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer ${
                  uploadingImages
                    ? 'border-stone-200 bg-stone-50 cursor-not-allowed'
                    : isDragging
                    ? 'border-stone-900 bg-stone-100 scale-[1.01]'
                    : 'border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'
                }`}
                onDragOver={(e) => { e.preventDefault(); if (!uploadingImages) setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {uploadingImages ? (
                  <>
                    <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                    <div>
                      <p className="text-stone-700 font-medium text-sm">
                        {uploadProgress
                          ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}...`
                          : 'Subiendo...'}
                      </p>
                      <p className="text-stone-400 text-xs mt-0.5">Por favor espera</p>
                    </div>
                  </>
                ) : isDragging ? (
                  <>
                    <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16,16 12,12 8,16"/>
                        <line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39,18.39A5,5,0,0,0,18,9h-1.26A8,8,0,1,0,3,16.3"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-stone-900 font-semibold text-sm">Soltar para subir</p>
                      <p className="text-stone-500 text-xs mt-0.5">máx. {15 - imagenes.length} más</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                        <polyline points="16,16 12,12 8,16"/>
                        <line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39,18.39A5,5,0,0,0,18,9h-1.26A8,8,0,1,0,3,16.3"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-stone-700 font-medium text-sm">Arrastra imágenes aquí o haz clic para seleccionar</p>
                      <p className="text-stone-400 text-xs mt-0.5">JPG, PNG o WebP · máx. {15 - imagenes.length} más</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Image grid */}
            {imagenes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Imágenes subidas</p>
                <div className="grid grid-cols-3 gap-4">
                  {imagenes.map((img) => {
                    const isHero = formData.imagen_hero === img.url
                    return (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden bg-stone-100 aspect-square">
                      <img
                        src={img.url}
                        alt={img.titulo || 'Imagen'}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />

                      {/* Estrella portada — siempre visible */}
                      <button
                        onClick={() => setAsHero(img.url)}
                        title={isHero ? 'Imagen de portada' : 'Usar como portada'}
                        className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                        style={{ background: isHero ? '#f59e0b' : 'rgba(255,255,255,0.85)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24"
                          fill={isHero ? 'white' : '#9ca3af'}
                          stroke={isHero ? 'white' : '#9ca3af'}
                          strokeWidth="1.5">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                        </svg>
                      </button>

                      {/* Botón eliminar — aparece en hover */}
                      <button
                        onClick={() => deleteImagen(img.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                        title="Eliminar imagen"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            {imagenes.length === 0 && !uploadingImages && (
              <p className="text-stone-400 text-sm text-center py-4">Sin imágenes aún. Sube algunas para comenzar.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Videos */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-8">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-6">Videos</p>

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit mb-6">
              <button
                type="button"
                onClick={() => setVideoMode('youtube')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'youtube' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >YouTube</button>
              <button
                type="button"
                onClick={() => setVideoMode('upload')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'upload' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >Subir archivo</button>
            </div>

            {/* YouTube form */}
            {videoMode === 'youtube' && (
              <form onSubmit={handleAddVideo} className="mb-8 p-5 bg-stone-50 rounded-xl border border-stone-200">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">URL de YouTube</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 border border-stone-200 rounded-lg px-4 py-2.5 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition text-stone-900 placeholder-stone-400 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={addingVideo}
                    className="bg-stone-900 text-white px-5 py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-50 text-sm font-semibold transition"
                  >
                    {addingVideo ? 'Agregando...' : '+ Agregar'}
                  </button>
                </div>
              </form>
            )}

            {/* File upload form */}
            {videoMode === 'upload' && (
              <div className="mb-8 p-5 bg-stone-50 rounded-xl border border-stone-200">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Subir video</label>
                <p className="text-xs text-stone-400 mb-4">MP4, MOV, WebM · Máx. 200 MB · Para mejores resultados comprimí el video antes de subir</p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileUpload}
                  disabled={uploadingVideo}
                  className="block w-full text-sm text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-900 file:text-white file:text-sm file:font-medium hover:file:bg-stone-800 file:cursor-pointer disabled:opacity-50 cursor-pointer"
                />
                {uploadingVideo && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-stone-500">
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                    {videoUploadProgress}
                  </div>
                )}
              </div>
            )}

            {/* Video list */}
            {videos.length > 0 && (
              <div className="space-y-3">
                {videos.map((video) => {
                  const isYoutube = /youtube\.com|youtu\.be/.test(video.url_youtube)
                  const videoId = isYoutube ? getYouTubeId(video.url_youtube) : null
                  return (
                    <div key={video.id} className="border border-stone-200 rounded-xl overflow-hidden group hover:border-stone-300 transition-colors">
                      <div className="flex items-stretch">
                        {/* Thumbnail */}
                        {videoId ? (
                          <div className="w-32 shrink-0 bg-stone-100 overflow-hidden">
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                              alt={video.titulo || 'Video'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 shrink-0 bg-stone-100 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-stone-400">
                              <polygon points="5,3 19,12 5,21 5,3" fill="currentColor" opacity="0.3"/>
                              <polygon points="5,3 19,12 5,21 5,3"/>
                            </svg>
                          </div>
                        )}
                        {/* Info */}
                        <div className="flex-1 p-4 flex items-center justify-between min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-stone-900 text-sm">{video.titulo}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isYoutube ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                                {isYoutube ? 'YouTube' : 'Archivo'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 truncate max-w-xs">{video.url_youtube}</p>
                            {isYoutube && videoId && (
                              <a href={video.url_youtube} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-stone-500 hover:text-stone-900 underline mt-1 inline-block transition-colors">
                                Ver en YouTube ↗
                              </a>
                            )}
                            {!isYoutube && (
                              <a href={video.url_youtube} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-stone-500 hover:text-stone-900 underline mt-1 inline-block transition-colors">
                                Ver video ↗
                              </a>
                            )}
                          </div>
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="text-stone-300 hover:text-red-500 text-sm font-medium ml-6 shrink-0 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {videos.length === 0 && (
              <p className="text-stone-400 text-sm text-center py-6">Sin videos aún.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
