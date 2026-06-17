'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface SetupState {
  vercelToken: string
  projectId: string | null
  teamId: string | null
  databaseUrl: string
  supabaseUrl: string
  serviceRoleKey: string
  dbTested: boolean
  adminName: string
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string
}

const STEPS = [
  'Vercel',
  'Supabase',
  'Banco de dados',
  'Administrador',
  'Finalizando',
  'Concluído',
]

function extractProjectId(supabaseUrl: string): string | null {
  try {
    const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function detectRegion(projectId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.region ?? null
  } catch {
    return null
  }
}

function buildConnectionString(projectId: string, region: string, password: string): string {
  const host = `aws-0-${region}.pooler.supabase.com`
  const encodedPassword = encodeURIComponent(password)
  return `postgresql://postgres.${projectId}:${encodedPassword}@${host}:5432/postgres`
}

function injectPassword(connectionString: string, password: string): string {
  if (!password) return connectionString
  return connectionString
    .replace(/\[YOUR-PASSWORD\]/gi, encodeURIComponent(password))
    .replace(/\[PASSWORD\]/gi, encodeURIComponent(password))
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [supabaseProjectId, setSupabaseProjectId] = useState('')
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)
  const [detectingRegion, setDetectingRegion] = useState(false)
  const [dbPassword, setDbPassword] = useState('')
  const [connectionStringAuto, setConnectionStringAuto] = useState(false)

  const [state, setState] = useState<SetupState>({
    vercelToken: '',
    projectId: null,
    teamId: null,
    databaseUrl: '',
    supabaseUrl: '',
    serviceRoleKey: '',
    dbTested: false,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  })

  function set(field: keyof SetupState, value: string | boolean | null) {
    setState((s) => ({ ...s, [field]: value }))
  }

  async function handleSupabaseUrlBlur(url: string) {
    const pid = extractProjectId(url)
    if (!pid) return
    setSupabaseProjectId(pid)
    setDetectingRegion(true)
    setDetectedRegion(null)
    setConnectionStringAuto(false)
    const region = await detectRegion(pid)
    setDetectedRegion(region)
    setDetectingRegion(false)
    if (region && dbPassword) {
      const connStr = buildConnectionString(pid, region, dbPassword)
      set('databaseUrl', connStr)
      setConnectionStringAuto(true)
    }
  }

  function handlePasswordChange(password: string) {
    setDbPassword(password)
    set('dbTested', false)
    if (supabaseProjectId && detectedRegion) {
      const connStr = buildConnectionString(supabaseProjectId, detectedRegion, password)
      set('databaseUrl', connStr)
      setConnectionStringAuto(true)
    } else if (state.databaseUrl) {
      const injected = injectPassword(state.databaseUrl, password)
      if (injected !== state.databaseUrl) {
        set('databaseUrl', injected)
      }
    }
  }

  function handleConnectionStringChange(value: string) {
    setConnectionStringAuto(false)
    set('dbTested', false)
    const injected = dbPassword ? injectPassword(value, dbPassword) : value
    set('databaseUrl', injected)
  }

  async function verifyVercel() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/setup/verify-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.vercelToken }),
      })
      const data = await res.json()
      if (!data.valid) {
        setError(data.error ?? 'Token inválido')
        return
      }
      setState((s) => ({ ...s, projectId: data.projectId, teamId: data.teamId }))
      setStep(2)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  async function testDb() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseUrl: state.databaseUrl,
          supabaseUrl: state.supabaseUrl,
          serviceRoleKey: state.serviceRoleKey,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? 'Falha na conexão')
        return
      }
      set('dbTested', true)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  async function runMigrations() {
    setError('')
    setLoading(true)
    // migrations rodam dentro do /install — avança direto para step 4
    setLoading(false)
    setStep(4)
  }

  async function install() {
    setError('')
    if (state.adminPassword !== state.adminPasswordConfirm) {
      setError('As senhas não coincidem')
      return
    }
    if (state.adminPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    setStep(5)
    try {
      const res = await fetch('/api/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vercelToken: state.vercelToken,
          databaseUrl: state.databaseUrl,
          supabaseUrl: state.supabaseUrl,
          serviceRoleKey: state.serviceRoleKey,
          adminName: state.adminName,
          adminEmail: state.adminEmail,
          adminPassword: state.adminPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Falha na instalação')
        setStep(4)
        return
      }
      setDeploymentId(data.deploymentId)
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setWarnings(data.warnings)
      }
      pollDeployStatus(data.deploymentId)
    } catch {
      setError('Erro de conexão')
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  function pollDeployStatus(depId: string) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/setup/deploy-status?deploymentId=${depId}&vercelToken=${encodeURIComponent(state.vercelToken)}`
        )
        const data = await res.json()
        if (data.state === 'READY') {
          clearInterval(pollIntervalRef.current!)
          if (data.url) setDeployUrl(data.url)
          setStep(6)
        } else if (data.state === 'ERROR' || data.state === 'CANCELED') {
          clearInterval(pollIntervalRef.current!)
          setError('O redeploy falhou. Acesse o painel da Vercel para mais detalhes. As configurações já foram salvas — basta fazer um redeploy manual.')
        }
      } catch {
        // continua tentando
      }
    }, 3000)
  }

  useEffect(() => {
    if (step === 3) {
      runMigrations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📰</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Configuração inicial</h1>
              <p className="text-sm text-gray-500">Step {step} de {STEPS.length}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`text-xs ${i + 1 <= step ? 'text-brand-primary font-medium' : 'text-gray-400'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1 — Vercel Token */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Conectar à Vercel</h2>
                <p className="text-sm text-gray-500">
                  Gere um Access Token em{' '}
                  <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">vercel.com/account/tokens</span>{' '}
                  e cole abaixo. Ele será usado apenas durante a configuração.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vercel Access Token</label>
                <input
                  type="password"
                  value={state.vercelToken}
                  onChange={(e) => set('vercelToken', e.target.value)}
                  placeholder="vercel_..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
              </div>
              <button
                onClick={verifyVercel}
                disabled={!state.vercelToken || loading}
                className="w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verificando...' : 'Verificar e continuar'}
              </button>
            </div>
          )}

          {/* Step 2 — Supabase */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Credenciais do Supabase</h2>
                <p className="text-sm text-gray-500">
                  Preencha os campos abaixo — vamos gerar a connection string automaticamente quando possível.
                </p>
              </div>

              {/* Campo 1 — Supabase URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do seu projeto Supabase</label>
                <div className="relative">
                  <input
                    type="text"
                    value={state.supabaseUrl}
                    onChange={(e) => {
                      set('supabaseUrl', e.target.value)
                      const pid = extractProjectId(e.target.value)
                      if (pid) setSupabaseProjectId(pid)
                      else { setSupabaseProjectId(''); setDetectedRegion(null); setConnectionStringAuto(false) }
                    }}
                    onBlur={(e) => { if (e.target.value) handleSupabaseUrlBlur(e.target.value) }}
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono pr-8"
                  />
                  {detectingRegion && (
                    <div className="absolute right-2 top-2.5 w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Encontre em:{' '}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                    supabase.com/dashboard
                  </a>
                  {' '}→ selecione o projeto → copie a URL do navegador
                </p>
                {detectedRegion && (
                  <p className="text-xs text-green-600 mt-1">
                    Regiao detectada: {detectedRegion}
                  </p>
                )}
              </div>

              {/* Campo 2 — Senha do banco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha do banco de dados</label>
                <input
                  type="password"
                  value={dbPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="A senha que voce definiu ao criar o projeto"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  E a senha escolhida em: Supabase Dashboard → Project Settings → Database → Database password
                </p>
              </div>

              {/* Campo 3 — Connection String */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Connection String (Session Pooler)</label>
                  {connectionStringAuto && (
                    <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                      Gerado automaticamente
                    </span>
                  )}
                </div>
                {!detectedRegion && !detectingRegion && supabaseProjectId && (
                  <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    Nao conseguimos detectar a regiao automaticamente. Acesse o link abaixo, copie a Session Pooler string e cole aqui:
                    <br />
                    <a
                      href={`https://supabase.com/dashboard/project/${supabaseProjectId}?showConnect=true&connectTab=direct&method=session`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-primary underline font-medium mt-1 inline-block"
                    >
                      Abrir configuracoes de conexao do projeto
                    </a>
                  </div>
                )}
                <input
                  type="password"
                  value={state.databaseUrl}
                  onChange={(e) => handleConnectionStringChange(e.target.value)}
                  placeholder="postgresql://postgres.xxx:senha@aws-0-regiao.pooler.supabase.com:5432/postgres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Formato: postgresql://postgres.{'{ref}'}:{'{senha}'}@aws-0-{'{regiao}'}.pooler.supabase.com:5432/postgres
                </p>
              </div>

              {/* Campo 4 — Service Role Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Role Key</label>
                <input
                  type="password"
                  value={state.serviceRoleKey}
                  onChange={(e) => { set('serviceRoleKey', e.target.value); set('dbTested', false) }}
                  placeholder="eyJ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Encontre em:{' '}
                  {supabaseProjectId ? (
                    <a
                      href={`https://supabase.com/dashboard/project/${supabaseProjectId}/settings/api-keys/legacy`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-primary underline"
                    >
                      Supabase Dashboard → API Keys (clique para abrir)
                    </a>
                  ) : (
                    'Supabase Dashboard → Project Settings → API → Service Role Key'
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={testDb}
                  disabled={!state.databaseUrl || !state.supabaseUrl || !state.serviceRoleKey || loading}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Testando...' : state.dbTested ? 'Conexao OK' : 'Testar conexao'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!state.dbTested}
                  className="flex-1 bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Migrations (automático via useEffect) */}
          {step === 3 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-semibold text-neutral-900">Configurando banco de dados...</h2>
              <p className="text-sm text-gray-500">Criando tabelas. Aguarde um momento.</p>
            </div>
          )}

          {/* Step 4 — Admin user */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Criar administrador</h2>
                <p className="text-sm text-gray-500">Este será o usuário master do painel.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={state.adminName}
                  onChange={(e) => set('adminName', e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={state.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  placeholder="admin@exemplo.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={state.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  value={state.adminPasswordConfirm}
                  onChange={(e) => set('adminPasswordConfirm', e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={install}
                disabled={!state.adminName || !state.adminEmail || !state.adminPassword || !state.adminPasswordConfirm || loading}
                className="w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Instalando...' : 'Finalizar instalação'}
              </button>
            </div>
          )}

          {/* Step 5 — Deploy em progresso */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-semibold text-neutral-900">Redesployando...</h2>
              <p className="text-sm text-gray-500">
                Salvando configurações e iniciando novo deploy na Vercel. Isso pode levar alguns minutos.
              </p>
              {deploymentId && (
                <p className="text-xs text-gray-400 font-mono">{deploymentId}</p>
              )}
              {error && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  {error}
                  <br />
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium mt-2 inline-block"
                  >
                    Abrir painel da Vercel
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Concluído */}
          {step === 6 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-base font-semibold text-neutral-900">Instalação concluída!</h2>
              <p className="text-sm text-gray-500">
                O blog está configurado e pronto. Faça login com as credenciais abaixo.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <div>
                  <span className="text-xs text-gray-500 block">Nome</span>
                  <span className="text-sm font-medium text-neutral-900">{state.adminName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-sm font-mono text-neutral-900">{state.adminEmail}</span>
                </div>
              </div>
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-1.5">
                  <p className="text-[13px] font-medium text-amber-800">Atenção</p>
                  <ul className="space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-[13px] text-amber-700">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {deployUrl && (
                <p className="text-xs text-gray-400">
                  Deploy em:{' '}
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {deployUrl}
                  </a>
                </p>
              )}
              <a
                href="/admin/login"
                className="block w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors text-center"
              >
                Acessar o painel
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
