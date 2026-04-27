import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE_MB = 200
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const proyectoId = formData.get('proyectoId') as string

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (!proyectoId) return NextResponse.json({ error: 'Falta proyectoId' }, { status: 400 })

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `El video supera el límite de ${MAX_SIZE_MB} MB` },
        { status: 413 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Faltan credenciales de Supabase' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const ext = file.name.split('.').pop() || 'mp4'
    const filename = `${proyectoId}/videos/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('proyectos')
      .upload(filename, buffer, {
        contentType: file.type || 'video/mp4',
        upsert: false,
      })

    if (error) throw new Error(`Supabase: ${error.message}`)

    const { data: publicUrl } = supabase.storage.from('proyectos').getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
