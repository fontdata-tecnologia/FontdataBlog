// app/api/newsletter/unsubscribe/route.ts
// Rota PÚBLICA — cancela inscrição pelo token único do inscrito.
// GET /api/newsletter/unsubscribe?token=...

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(errorPage('Token inválido ou ausente.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    // Tenta encontrar pelo unsubscribe_token primeiro; fallback por id (compatibilidade com registros antigos sem token)
    let rows = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.unsubscribe_token, token))
      .limit(1)

    // Fallback: token pode ser o id numérico legado
    if (rows.length === 0) {
      const id = parseInt(token, 10)
      if (!isNaN(id)) {
        rows = await db
          .select()
          .from(newsletterSubscribers)
          .where(eq(newsletterSubscribers.id, id))
          .limit(1)
      }
    }

    if (rows.length === 0) {
      return new NextResponse(errorPage('Link de cancelamento inválido ou já utilizado.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const sub = rows[0]

    if (sub.status === 'unsubscribed') {
      return new NextResponse(alreadyUnsubscribedPage(sub.email), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    await db
      .update(newsletterSubscribers)
      .set({ status: 'unsubscribed', unsubscribed_at: new Date() })
      .where(eq(newsletterSubscribers.id, sub.id))

    return new NextResponse(successPage(sub.email), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('[unsubscribe]', err)
    return new NextResponse(errorPage('Erro interno. Tente novamente mais tarde.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #F9FAFB; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; border: 1px solid #E5E7EB; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    h1 { font-size: 22px; font-weight: 700; color: #1A1A2E; margin: 0 0 12px; }
    p { font-size: 15px; color: #4B5563; line-height: 1.6; margin: 0; }
    .icon { font-size: 40px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`
}

function successPage(email: string): string {
  return layout(
    'Inscrição cancelada',
    `<div class="icon">✓</div>
     <h1>Inscrição cancelada</h1>
     <p>O e-mail <strong>${escapeHtml(email)}</strong> foi removido da nossa newsletter com sucesso.</p>`
  )
}

function alreadyUnsubscribedPage(email: string): string {
  return layout(
    'Já cancelado',
    `<div class="icon">ℹ</div>
     <h1>Inscrição já cancelada</h1>
     <p>O e-mail <strong>${escapeHtml(email)}</strong> já não está na nossa lista.</p>`
  )
}

function errorPage(message: string): string {
  return layout(
    'Erro',
    `<div class="icon">✗</div>
     <h1>Algo deu errado</h1>
     <p>${escapeHtml(message)}</p>`
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
