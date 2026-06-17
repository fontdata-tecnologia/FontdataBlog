import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { uploadObject } from '@/lib/storage'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = cookies().get('auth_token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato não suportado. Use JPG, PNG, WebP, GIF ou SVG.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Imagem deve ter menos de 5MB' }, { status: 400 })
  }

  const ext = path.extname(file.name).toLowerCase() || '.jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const bytes = await file.arrayBuffer()
  try {
    const url = await uploadObject(filename, Buffer.from(bytes), file.type)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Storage upload error:', err)
    return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 })
  }
}
