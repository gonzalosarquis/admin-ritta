import { NextResponse } from 'next/server'

export async function POST() {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK

  if (!hookUrl) {
    return NextResponse.json(
      { error: 'VERCEL_DEPLOY_HOOK no está configurado' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' })
    if (!res.ok) throw new Error(`Vercel respondió ${res.status}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
