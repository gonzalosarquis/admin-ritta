import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const proyectoId = formData.get('proyectoId') as string

    console.log('Upload request:', { proyectoId, fileName: file?.name })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!proyectoId) {
      return NextResponse.json({ error: 'No proyecto ID provided' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials')
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Create a unique filename
    const filename = `${proyectoId}/${Date.now()}-${file.name}`
    console.log('Uploading file:', filename)

    // Convert File to ArrayBuffer directly
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('proyectos')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    console.log('Upload successful:', data)

    // Get the public URL
    const { data: publicUrl } = supabase.storage
      .from('proyectos')
      .getPublicUrl(data.path)

    console.log('Public URL:', publicUrl.publicUrl)
    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (error) {
    console.error('Full upload error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
