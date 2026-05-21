import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'
import { randomBytes } from 'crypto'
import { hashPassword } from '@/lib/auth'
import { SETUP_SQL } from '@/drizzle/setup-sql'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const body = await req.json()
  const { vercelToken, databaseUrl, supabaseUrl, serviceRoleKey, adminName, adminEmail, adminPassword } = body

  if (!vercelToken || !databaseUrl || !supabaseUrl || !serviceRoleKey || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!projectId) {
    return NextResponse.json({ error: 'VERCEL_PROJECT_ID não encontrado. O projeto deve estar hospedado na Vercel.' }, { status: 400 })
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

    return NextResponse.json({ deploymentId: redeployData.id ?? redeployData.uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (client) await client.end()
  }
}
