'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type ContentMap = Record<string, string>
type SiteSection = { id: string; slug: string; nombre: string; activo: boolean; orden: number; content: Record<string, string> }

const TABS = [
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'Nosotros' },
  { id: 'stats', label: 'Estadísticas' },
  { id: 'quote', label: 'Frase' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'sections', label: 'Secciones extra' },
]

export default function SitioPage() {
  const [tab, setTab] = useState('hero')
  const [content, setContent] = useState<ContentMap>({})
  const [sections, setSections] = useState<SiteSection[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'error' | null>(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroFileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: contentData }, { data: sectionsData }] = await Promise.all([
      supabase.from('site_content').select('section, key, value'),
      supabase.from('site_sections').select('*').order('orden'),
    ])
    if (contentData) {
      const map: ContentMap = {}
      contentData.forEach(r => { map[`${r.section}.${r.key}`] = r.value || '' })
      setContent(map)
    }
    if (sectionsData) setSections(sectionsData)
  }

  function get(key: string) { return content[key] ?? '' }
  function set(key: string, value: string) {
    setContent(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const rows = Object.entries(content)
        .map(([fullKey, value]) => {
          const dot = fullKey.indexOf('.')
          return { section: fullKey.slice(0, dot), key: fullKey.slice(dot + 1), value, updated_at: new Date().toISOString() }
        })
      const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'section,key' })
      if (error) throw error
      setSaveMsg('ok')
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function uploadHeroImage(file: File) {
    setUploadingHero(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/admin/api/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        set('hero.image_url', data.url)
        await supabase.from('site_content').upsert(
          { section: 'hero', key: 'image_url', value: data.url, updated_at: new Date().toISOString() },
          { onConflict: 'section,key' }
        )
      }
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploadingHero(false)
    }
  }

  async function toggleSection(id: string, activo: boolean) {
    const { error } = await supabase.from('site_sections').update({ activo, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setSections(prev => prev.map(s => s.id === id ? { ...s, activo } : s))
  }

  async function saveSectionContent(id: string, sectionContent: Record<string, string>) {
    const { error } = await supabase.from('site_sections').update({ content: sectionContent, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setSections(prev => prev.map(s => s.id === id ? { ...s, content: sectionContent } : s))
  }

  const inputClass = "w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-stone-900 text-sm placeholder-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none transition"
  const labelClass = "block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Editar sitio</h1>
          <p className="text-stone-500 text-sm mt-0.5">Los cambios se aplican al instante en el sitio</p>
        </div>
        {tab !== 'sections' && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-40 text-sm font-medium transition-colors">
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
              : saveMsg === 'ok' ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>Guardado</>
              : saveMsg === 'error' ? '✕ Error'
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>Guardar cambios</>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">

        {/* ── HERO ── */}
        {tab === 'hero' && (
          <div className="space-y-6 max-w-2xl">
            {/* Image upload */}
            <div>
              <label className={labelClass}>Imagen de fondo</label>
              <div className="flex gap-4 items-start">
                <div className="w-40 h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                  {get('hero.image_url') ? (
                    <img src={get('hero.image_url')} alt="Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-stone-300"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                      <p className="text-xs text-stone-300">Sin imagen</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => heroFileRef.current?.click()} disabled={uploadingHero}
                    className="flex items-center gap-2 border border-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 disabled:opacity-40 transition-colors">
                    {uploadingHero ? <><div className="w-3.5 h-3.5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />Subiendo...</>
                      : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Cambiar imagen</>}
                  </button>
                  <p className="text-xs text-stone-400">JPG o PNG · Mínimo 1920×1080px recomendado</p>
                  {get('hero.image_url') && (
                    <button onClick={() => set('hero.image_url', '')} className="text-xs text-red-400 hover:text-red-600 text-left transition-colors">
                      Quitar imagen
                    </button>
                  )}
                </div>
              </div>
              <input ref={heroFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeroImage(f); e.target.value = '' }} />
            </div>

            <div className="border-t border-stone-100 pt-5">
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Eyebrow / Tagline</label>
                  <input type="text" value={get('hero.tagline')} onChange={e => set('hero.tagline', e.target.value)}
                    className={inputClass} placeholder="Diseño de Interiores · Buenos Aires · Est. 2022" />
                  <p className="text-xs text-stone-400 mt-1">Texto pequeño arriba del título principal</p>
                </div>
                <div>
                  <label className={labelClass}>Subtítulo</label>
                  <textarea value={get('hero.subtitle')} onChange={e => set('hero.subtitle', e.target.value)}
                    rows={3} className={`${inputClass} resize-none`} placeholder="Transformamos espacios en experiencias únicas..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NOSOTROS ── */}
        {tab === 'about' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <label className={labelClass}>Título de sección</label>
              <input type="text" value={get('about.title')} onChange={e => set('about.title', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Párrafo 1</label>
              <textarea value={get('about.text1')} onChange={e => set('about.text1', e.target.value)}
                rows={4} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Párrafo 2</label>
              <textarea value={get('about.text2')} onChange={e => set('about.text2', e.target.value)}
                rows={4} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}

        {/* ── ESTADÍSTICAS ── */}
        {tab === 'stats' && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-stone-500 mb-2">Los números que aparecen en la sección Nosotros. Dejá vacío el número para ocultar una estadística.</p>
            {([1, 2, 4] as const).map((n, i) => (
              <div key={n} className="p-4 border border-stone-100 rounded-lg">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Estadística {i + 1}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Número</label>
                    <input type="text" value={get(`stats.${n}_num`)} onChange={e => set(`stats.${n}_num`, e.target.value)}
                      className={inputClass} placeholder="10" />
                  </div>
                  <div>
                    <label className={labelClass}>Sufijo</label>
                    <input type="text" value={get(`stats.${n}_suffix`)} onChange={e => set(`stats.${n}_suffix`, e.target.value)}
                      className={inputClass} placeholder="+" />
                  </div>
                  <div>
                    <label className={labelClass}>Etiqueta</label>
                    <input type="text" value={get(`stats.${n}_label`)} onChange={e => set(`stats.${n}_label`, e.target.value)}
                      className={inputClass} placeholder="años de experiencia" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FRASE ── */}
        {tab === 'quote' && (
          <div className="space-y-5 max-w-2xl">
            <p className="text-sm text-stone-500">La frase grande entre Nosotros y los Proyectos</p>
            <div>
              <label className={labelClass}>Frase</label>
              <textarea value={get('quote.text')} onChange={e => set('quote.text', e.target.value)}
                rows={2} className={`${inputClass} resize-none`} placeholder="Cada proyecto tiene alma, cuerpo y corazón." />
            </div>
            <div>
              <label className={labelClass}>Atribución</label>
              <input type="text" value={get('quote.attribution')} onChange={e => set('quote.attribution', e.target.value)}
                className={inputClass} placeholder="— Marita, fundadora de RITTA Estudio" />
            </div>
            {get('quote.text') && (
              <div className="mt-2 p-6 bg-stone-50 rounded-lg border border-stone-100 text-center">
                <p className="text-lg italic text-stone-700">"{get('quote.text')}"</p>
                <p className="text-xs text-stone-400 mt-2 uppercase tracking-wider">{get('quote.attribution')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── PROYECTOS ── */}
        {tab === 'proyectos' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <label className={labelClass}>Texto introductorio</label>
              <textarea value={get('proyectos.intro')} onChange={e => set('proyectos.intro', e.target.value)}
                rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}

        {/* ── SECCIONES EXTRA ── */}
        {tab === 'sections' && (
          <div className="space-y-5">
            <p className="text-sm text-stone-500">Activá secciones adicionales. Cada una muestra un preview de cómo se va a ver en el sitio.</p>
            {sections.map(section => (
              <SectionCard key={section.id} section={section}
                onToggle={(activo) => toggleSection(section.id, activo)}
                onSave={(c) => saveSectionContent(section.id, c)}
                inputClass={inputClass} labelClass={labelClass} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Section previews ─────────────────────────── */
const SECTION_PREVIEWS: Record<string, React.FC> = {
  testimonios: () => (
    <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
      <div className="grid grid-cols-3 gap-2">
        {['María G.', 'Carlos M.', 'Ana L.'].map(name => (
          <div key={name} className="bg-white border border-stone-200 rounded p-3">
            <div className="flex gap-1 mb-2">{[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-xs">★</span>)}</div>
            <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="h-1.5 bg-stone-100 rounded" style={{width: i===3?'60%':'100%'}} />)}</div>
            <p className="text-xs text-stone-500 mt-2 font-medium">{name}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  equipo: () => (
    <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-stone-200" />
            <div className="h-2 w-14 bg-stone-200 rounded" />
            <div className="h-1.5 w-10 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  ),
  faq: () => (
    <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-stone-200 rounded px-3 py-2 flex items-center justify-between">
            <div className="h-2 bg-stone-200 rounded" style={{width: `${50 + i*15}%`}} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-300 shrink-0 ml-2"><polyline points="6,9 12,15 18,9"/></svg>
          </div>
        ))}
      </div>
    </div>
  ),
  banner_cta: () => (
    <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
      <div className="bg-stone-900 rounded-lg p-5 flex flex-col items-center gap-3 text-center">
        <div className="h-3 w-48 bg-white/20 rounded" />
        <div className="h-2 w-36 bg-white/10 rounded" />
        <div className="mt-1 bg-white rounded-full px-4 py-1.5">
          <div className="h-2 w-20 bg-stone-300 rounded" />
        </div>
      </div>
    </div>
  ),
  video_destacado: () => (
    <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
      <div className="bg-stone-800 rounded-lg aspect-video flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
  ),
}

function SectionCard({ section, onToggle, onSave, inputClass, labelClass }: {
  section: SiteSection
  onToggle: (activo: boolean) => void
  onSave: (content: Record<string, string>) => void
  inputClass: string
  labelClass: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [localContent, setLocalContent] = useState<Record<string, string>>(section.content || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const Preview = SECTION_PREVIEWS[section.slug]
  const fields = SECTION_FIELDS[section.slug] || []

  function setField(key: string, value: string) {
    setLocalContent(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(localContent)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const ICONS: Record<string, string> = { testimonios: '🗣', equipo: '👥', faq: '❓', banner_cta: '📢', video_destacado: '🎬' }

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${section.activo ? 'border-stone-300' : 'border-stone-100'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{ICONS[section.slug] || '📄'}</span>
          <div>
            <p className="text-sm font-medium text-stone-900">{section.nombre}</p>
            <p className="text-xs text-stone-400">{section.activo ? 'Visible en el sitio' : 'Oculta'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-stone-400 hover:text-stone-700 font-medium transition-colors">
            {expanded ? 'Cerrar' : 'Ver detalle'}
          </button>
          <button onClick={() => onToggle(!section.activo)}
            className={`relative w-11 h-6 rounded-full transition-colors ${section.activo ? 'bg-stone-900' : 'bg-stone-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${section.activo ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Expanded: preview + fields */}
      {expanded && (
        <div className="border-t border-stone-100 p-4 space-y-4 bg-stone-50/50">
          {/* Visual preview */}
          {Preview && <Preview />}

          {/* Edit fields */}
          {fields.length > 0 && (
            <div className="space-y-3 bg-white rounded-lg p-4 border border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Contenido</p>
              {fields.map(field => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={localContent[field.key] || ''} onChange={e => setField(field.key, e.target.value)}
                      rows={field.rows || 3} className={`${inputClass} resize-none`} placeholder={field.placeholder} />
                  ) : (
                    <input type="text" value={localContent[field.key] || ''} onChange={e => setField(field.key, e.target.value)}
                      className={inputClass} placeholder={field.placeholder} />
                  )}
                </div>
              ))}
              <button onClick={handleSave} disabled={saving}
                className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors">
                {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar contenido'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SECTION_FIELDS: Record<string, { key: string; label: string; type?: string; rows?: number; placeholder?: string }[]> = {
  testimonios: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Lo que dicen nuestros clientes' },
    { key: 't1_nombre', label: 'Cliente 1 — Nombre', placeholder: 'María González' },
    { key: 't1_texto', label: 'Cliente 1 — Testimonio', type: 'textarea', rows: 2, placeholder: 'Trabajar con RITTA fue increíble...' },
    { key: 't2_nombre', label: 'Cliente 2 — Nombre', placeholder: 'Carlos Martínez' },
    { key: 't2_texto', label: 'Cliente 2 — Testimonio', type: 'textarea', rows: 2 },
    { key: 't3_nombre', label: 'Cliente 3 — Nombre', placeholder: 'Ana López' },
    { key: 't3_texto', label: 'Cliente 3 — Testimonio', type: 'textarea', rows: 2 },
  ],
  equipo: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Nuestro equipo' },
    { key: 'm1_nombre', label: 'Miembro 1 — Nombre', placeholder: 'Marita' },
    { key: 'm1_rol', label: 'Miembro 1 — Rol', placeholder: 'Fundadora & Directora de diseño' },
    { key: 'm2_nombre', label: 'Miembro 2 — Nombre' },
    { key: 'm2_rol', label: 'Miembro 2 — Rol' },
    { key: 'm3_nombre', label: 'Miembro 3 — Nombre' },
    { key: 'm3_rol', label: 'Miembro 3 — Rol' },
  ],
  faq: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Preguntas frecuentes' },
    { key: 'p1', label: 'Pregunta 1', placeholder: '¿Cuánto tarda un proyecto?' },
    { key: 'r1', label: 'Respuesta 1', type: 'textarea', rows: 2, placeholder: 'Depende del alcance...' },
    { key: 'p2', label: 'Pregunta 2', placeholder: '¿Trabajan en todo Buenos Aires?' },
    { key: 'r2', label: 'Respuesta 2', type: 'textarea', rows: 2 },
    { key: 'p3', label: 'Pregunta 3' },
    { key: 'r3', label: 'Respuesta 3', type: 'textarea', rows: 2 },
  ],
  banner_cta: [
    { key: 'titulo', label: 'Título', placeholder: '¿Listo para transformar tu espacio?' },
    { key: 'subtitulo', label: 'Subtítulo', placeholder: 'Contanos tu idea y empezamos juntos' },
    { key: 'boton', label: 'Texto del botón', placeholder: 'Contactarme' },
  ],
  video_destacado: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Conocé nuestro trabajo' },
    { key: 'url', label: 'URL de YouTube', placeholder: 'https://www.youtube.com/watch?v=...' },
    { key: 'descripcion', label: 'Descripción (opcional)', type: 'textarea', rows: 2 },
  ],
}
