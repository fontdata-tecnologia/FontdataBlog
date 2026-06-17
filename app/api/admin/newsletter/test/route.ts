// app/api/admin/newsletter/test/route.ts
// POST: envia e-mail de teste para o endereço remetente configurado.

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getNewsletterFromEmail, getResendApiKey } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const apiKey = await getResendApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: 'Resend API Key não configurada.' }, { status: 400 })
    }

    const fromEmail = await getNewsletterFromEmail()
    if (!fromEmail || fromEmail === 'noreply@blog.com') {
      return NextResponse.json({ error: 'Configure um e-mail remetente válido antes de enviar o teste.' }, { status: 400 })
    }

    const result = await sendEmail({
      to: fromEmail,
      subject: 'Teste de newsletter — ExpxBlog',
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Teste</title></head>
<body style="font-family:Inter,system-ui,sans-serif;padding:40px;color:#1A1A2E;">
  <h1 style="font-size:22px;font-weight:700;">E-mail de teste</h1>
  <p style="font-size:15px;color:#4B5563;">
    Se você está vendo esta mensagem, a integração com o Resend está funcionando corretamente.
  </p>
</body>
</html>`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Falha ao enviar e-mail de teste.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
