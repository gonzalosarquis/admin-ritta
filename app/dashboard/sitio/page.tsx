'use client'

import { useState, useEffect } from 'react'
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

const SECTION_ICONS: Record<string, string> = {
  testimonios: '🗣',
  equipo: '👥',
  faq: '❓',
  banner_cta: '📢',
  video_destacado: '🎬',
}

export default function SitioPage() {
  const [tab, setTab] = useState('hero')
  const [content, setContent] = useState<ContentMap>({})
  const [sections, setSections] = useState<SiteSection[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'error' | null>(null)
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
        .filter(([k]) => !k.startsWith('sections.'))
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

  async function toggleSection(id: string, activo: boolean) {
    const { error } = await supabase.from('site_sections').update({ activo, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setSections(prev => prev.map(s => s.id === id ? { ...s, activo } : s))
  }

  async function saveSectionContent(id: string, sectionContent: Record<string, string>) {
    setSaving(true)
    setSaveMsg(null)
    try {
      const { error } = await supabase.from('site_sections').update({ content: sectionContent, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setSections(prev => prev.map(s => s.id === id ? { ...s, content: sectionContent } : s))
      setSaveMsg('ok')
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
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
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
            ) : saveMsg === 'ok' ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>Guardado</>
            ) : saveMsg === 'error' ? '✕ Error' : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>Guardar cambios</>
            )}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">

        {/* ── HERO ── */}
        {tab === 'hero' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <p className="text-sm font-medium text-stone-700 mb-4">
                Textos de la sección principal del sitio (hero)
              </p>
            </div>
            <div>
              <label className={labelClass}>Eyebrow / Tagline</label>
              <input type="text" value={get('hero.tagline')} onChange={e => set('hero.tagline', e.target.value)}
                className={inputClass} placeholder="Diseño de Interiores · Buenos Aires · Est. 2022" />
              <p className="text-xs text-stone-400 mt-1">Texto pequeño que aparece arriba del título principal</p>
            </div>
            <div>
              <label className={labelClass}>Subtítulo</label>
              <textarea value={get('hero.subtitle')} onChange={e => set('hero.subtitle', e.target.value)}
                rows={3} className={`${inputClass} resize-none`}
                placeholder="Transformamos espacios en experiencias únicas..." />
              <p className="text-xs text-stone-400 mt-1">Párrafo descriptivo debajo del título grande</p>
            </div>
          </div>
        )}

        {/* ── NOSOTROS ── */}
        {tab === 'about' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <label className={labelClass}>Título de sección</label>
              <input type="text" value={get('about.title')} onChange={e => set('about.title', e.target.value)}
                className={inputClass} placeholder="UNA HISTORIA DE FAMILIA, DISEÑO Y REINVENCIÓN" />
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
          <div className="space-y-6 max-w-2xl">
            <p className="text-sm text-stone-500">Los cuatro números que aparecen en la sección Nosotros</p>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-4 border border-stone-100 rounded-lg">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Estadística {n}</p>
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
                  <div className="col-span-1">
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
            <p className="text-sm text-stone-500">La frase grande que aparece entre Nosotros y los Proyectos</p>
            <div>
              <label className={labelClass}>Frase</label>
              <textarea value={get('quote.text')} onChange={e => set('quote.text', e.target.value)}
                rows={2} className={`${inputClass} resize-none`}
                placeholder="Cada proyecto tiene alma, cuerpo y corazón." />
            </div>
            <div>
              <label className={labelClass}>Atribución</label>
              <input type="text" value={get('quote.attribution')} onChange={e => set('quote.attribution', e.target.value)}
                className={inputClass} placeholder="— Marita, fundadora de RITTA Estudio" />
            </div>
            {get('quote.text') && (
              <div className="mt-4 p-6 bg-stone-50 rounded-lg border border-stone-100 text-center">
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
              <label className={labelClass}>Texto introductorio de la sección Proyectos</label>
              <textarea value={get('proyectos.intro')} onChange={e => set('proyectos.intro', e.target.value)}
                rows={3} className={`${inputClass} resize-none`}
                placeholder="Cada uno de los proyectos que ven a continuación..." />
            </div>
          </div>
        )}

        {/* ── SECCIONES EXTRA ── */}
        {tab === 'sections' && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500 mb-6">
              Activá o desactivá secciones adicionales del sitio. Podés editar el contenido de cada una expandiéndola.
            </p>
            {sections.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                onToggle={(activo) => toggleSection(section.id, activo)}
                onSave={(content) => saveSectionContent(section.id, content)}
                inputClass={inputClass}
                labelClass={labelClass}
                saving={saving}
                saveMsg={saveMsg}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function SectionCard({ section, onToggle, onSave, inputClass, labelClass, saving, saveMsg }: {
  section: SiteSection
  onToggle: (activo: boolean) => void
  onSave: (content: Record<string, string>) => void
  inputClass: string
  labelClass: string
  saving: boolean
  saveMsg: 'ok' | 'error' | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [localContent, setLocalContent] = useState<Record<string, string>>(section.content || {})

  function setField(key: string, value: string) {
    setLocalContent(prev => ({ ...prev, [key]: value }))
  }

  const fields = SECTION_FIELDS[section.slug] || []

  return (
    <div className={`border rounded-xl transition-colors ${section.activo ? 'border-stone-300' : 'border-stone-100'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{SECTION_ICONS[section.slug] || '📄'}</span>
          <div>
            <p className="text-sm font-medium text-stone-900">{section.nombre}</p>
            <p className="text-xs text-stone-400">{section.activo ? 'Visible en el sitio' : 'Oculta'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {fields.length > 0 && section.activo && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-stone-500 hover:text-stone-700 font-medium transition-colors"
            >
              {expanded ? 'Cerrar' : 'Editar contenido'}
            </button>
          )}
          <button
            onClick={() => onToggle(!section.activo)}
            className={`relative w-11 h-6 rounded-full transition-colors ${section.activo ? 'bg-stone-900' : 'bg-stone-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${section.activo ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {expanded && fields.length > 0 && (
        <div className="border-t border-stone-100 p-4 space-y-4">
          {fields.map(field => (
            <div key={field.key}>
              <label className={labelClass}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={localContent[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  rows={field.rows || 3}
                  className={`${inputClass} resize-none`}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type="text"
                  value={localContent[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  className={inputClass}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          <button
            onClick={() => onSave(localContent)}
            disabled={saving}
            className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Guardando...' : saveMsg === 'ok' ? '✓ Guardado' : 'Guardar sección'}
          </button>
        </div>
      )}
    </div>
  )
}

const SECTION_FIELDS: Record<string, { key: string; label: string; type?: string; rows?: number; placeholder?: string }[]> = {
  testimonios: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Lo que dicen nuestros clientes' },
    { key: 'testimonio_1_nombre', label: 'Cliente 1 — Nombre', placeholder: 'María González' },
    { key: 'testimonio_1_texto', label: 'Cliente 1 — Testimonio', type: 'textarea', rows: 3, placeholder: 'Trabajar con RITTA fue una experiencia increíble...' },
    { key: 'testimonio_2_nombre', label: 'Cliente 2 — Nombre', placeholder: 'Carlos Martínez' },
    { key: 'testimonio_2_texto', label: 'Cliente 2 — Testimonio', type: 'textarea', rows: 3, placeholder: '' },
    { key: 'testimonio_3_nombre', label: 'Cliente 3 — Nombre', placeholder: 'Ana López' },
    { key: 'testimonio_3_texto', label: 'Cliente 3 — Testimonio', type: 'textarea', rows: 3, placeholder: '' },
  ],
  equipo: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Nuestro equipo' },
    { key: 'miembro_1_nombre', label: 'Miembro 1 — Nombre', placeholder: 'Marita' },
    { key: 'miembro_1_rol', label: 'Miembro 1 — Rol', placeholder: 'Fundadora & Directora de diseño' },
    { key: 'miembro_2_nombre', label: 'Miembro 2 — Nombre', placeholder: '' },
    { key: 'miembro_2_rol', label: 'Miembro 2 — Rol', placeholder: '' },
    { key: 'miembro_3_nombre', label: 'Miembro 3 — Nombre', placeholder: '' },
    { key: 'miembro_3_rol', label: 'Miembro 3 — Rol', placeholder: '' },
  ],
  faq: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Preguntas frecuentes' },
    { key: 'pregunta_1', label: 'Pregunta 1', placeholder: '¿Cuánto tarda un proyecto?' },
    { key: 'respuesta_1', label: 'Respuesta 1', type: 'textarea', rows: 2, placeholder: 'Depende del alcance del proyecto...' },
    { key: 'pregunta_2', label: 'Pregunta 2', placeholder: '¿Trabajan en todo Buenos Aires?' },
    { key: 'respuesta_2', label: 'Respuesta 2', type: 'textarea', rows: 2, placeholder: '' },
    { key: 'pregunta_3', label: 'Pregunta 3', placeholder: '' },
    { key: 'respuesta_3', label: 'Respuesta 3', type: 'textarea', rows: 2, placeholder: '' },
  ],
  banner_cta: [
    { key: 'titulo', label: 'Título', placeholder: '¿Listo para transformar tu espacio?' },
    { key: 'subtitulo', label: 'Subtítulo', placeholder: 'Contanos tu idea y empezamos a trabajar juntos' },
    { key: 'boton_texto', label: 'Texto del botón', placeholder: 'Contactarme' },
  ],
  video_destacado: [
    { key: 'titulo', label: 'Título de sección', placeholder: 'Conocé nuestro trabajo' },
    { key: 'url_youtube', label: 'URL de YouTube', placeholder: 'https://www.youtube.com/watch?v=...' },
    { key: 'descripcion', label: 'Descripción (opcional)', type: 'textarea', rows: 2, placeholder: '' },
  ],
}
