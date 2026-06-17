import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'
import { randomBytes } from 'crypto'
import { hashPassword } from '@/lib/auth'
import { SETUP_SQL } from '@/drizzle/setup-sql'
import { ensureCrons, normalizeUrl } from '@/lib/supabase-cron'

/** Deriva a URL pública de produção do projeto via API Vercel (alias de produção). */
async function deriveProductionUrl(
  projectId: string,
  vercelToken: string,
  teamId: string | undefined
): Promise<string | null> {
  try {
    const teamParam = teamId ? `?teamId=${teamId}` : ''
    const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}${teamParam}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    // targets.production.alias é a lista de domínios de produção; o último costuma ser o domínio custom.
    const alias: string[] | undefined = data?.targets?.production?.alias
    const host = (alias && alias.length > 0 ? alias[alias.length - 1] : undefined) ?? data?.name
    if (!host) return null
    return host.startsWith('http') ? normalizeUrl(host) : `https://${normalizeUrl(host)}`
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const body = await req.json()
  const { vercelToken, databaseUrl, supabaseUrl, serviceRoleKey, adminName, adminEmail, adminPassword, appUrl: appUrlFromBody } = body

  if (!vercelToken || !databaseUrl || !supabaseUrl || !serviceRoleKey || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!projectId) {
    return NextResponse.json({ error: 'VERCEL_PROJECT_ID não encontrado. O projeto deve estar hospedado na Vercel.' }, { status: 400 })
  }

  const warnings: string[] = []

  // Resolver a URL pública do app: usa a fornecida pelo wizard ou deriva da Vercel.
  let appUrl = appUrlFromBody ? normalizeUrl(String(appUrlFromBody)) : ''
  if (!appUrl) {
    appUrl = (await deriveProductionUrl(projectId, vercelToken, teamId)) ?? ''
  }

  let client: ReturnType<typeof postgres> | null = null
  try {
    // 1. Conectar ao banco
    client = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
    })

    // 2. Rodar migrations
    await client.unsafe(SETUP_SQL)

    // 2b. Provisionar crons (estrutura versionada): habilitar extensões e
    //     reconciliar os jobs. Mesmo reconciliador usado nas atualizações do
    //     banco — garante paridade de comportamento entre setup e update.
    //     Passamos client/appUrl/serviceKey explicitamente: process.env ainda
    //     não existe neste request (DATABASE_URL nem está setado).
    if (!appUrl) {
      warnings.push(
        'Crons não agendadas: URL pública do blog indisponível. ' +
        'Defina NEXT_PUBLIC_APP_URL e atualize o banco pelo painel admin.'
      )
    } else {
      try {
        const report = await ensureCrons({ client, appUrl, serviceKey: serviceRoleKey })
        if (!report.extensionsOk) {
          warnings.push(
            `Não foi possível habilitar ${report.missingExtensions.join(' e ')} automaticamente. ` +
            'Habilite em Supabase Dashboard → Database → Extensions para as crons funcionarem.'
          )
        }
        for (const e of report.errors) {
          warnings.push(`Cron ${e.job}: ${e.message}`)
        }
      } catch (cronErr) {
        const m = cronErr instanceof Error ? cronErr.message : String(cronErr)
        warnings.push(`Falha ao provisionar crons: ${m}`)
      }
    }

    // 3. Criar usuário admin
    const passwordHash = await hashPassword(adminPassword)
    await client`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${adminEmail}, ${passwordHash}, ${adminName}, 'admin')
      ON CONFLICT (email) DO NOTHING
    `

    // 4. Gerar secrets
    const jwtSecret = randomBytes(32).toString('base64')
    const cronSecret = randomBytes(32).toString('base64')

    // 5. Salvar env vars na Vercel
    const envVars = [
      { key: 'DATABASE_URL', value: databaseUrl, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl, type: 'plain', target: ['production', 'preview'] },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: serviceRoleKey, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'JWT_SECRET', value: jwtSecret, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'CRON_SECRET', value: cronSecret, type: 'encrypted', target: ['production', 'preview'] },
      ...(appUrl
        ? [{ key: 'NEXT_PUBLIC_APP_URL', value: appUrl, type: 'plain', target: ['production', 'preview'] }]
        : []),
    ]

    const teamParam = teamId ? `?teamId=${teamId}` : ''
    const envRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envVars),
    })

    if (!envRes.ok) {
      const errBody = await envRes.text()
      return NextResponse.json({ error: `Falha ao salvar env vars na Vercel: ${errBody}` }, { status: 500 })
    }

    // 6. Buscar último deployment para usar como base do redeploy
    const deploysRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1${teamId ? `&teamId=${teamId}` : ''}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const deploysData = await deploysRes.json()
    if (!deploysRes.ok) {
      return NextResponse.json({ error: `Falha ao listar deployments: ${JSON.stringify(deploysData)}` }, { status: 500 })
    }
    const lastDeployment = deploysData.deployments?.[0]

    if (!lastDeployment) {
      return NextResponse.json({ error: 'Nenhum deployment encontrado para redesployar' }, { status: 500 })
    }

    // 7. Disparar redeploy
    const redeployRes = await fetch(`https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ''}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deploymentId: lastDeployment.uid,
        name: lastDeployment.name,
        target: 'production',
      }),
    })

    const redeployData = await redeployRes.json()

    if (!redeployRes.ok) {
      return NextResponse.json({ error: `Falha ao redesployar: ${JSON.stringify(redeployData)}` }, { status: 500 })
    }

    return NextResponse.json({ deploymentId: redeployData.id ?? redeployData.uid, warnings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (client) await client.end()
  }
}
