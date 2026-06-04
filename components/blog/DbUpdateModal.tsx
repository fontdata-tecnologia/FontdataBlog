'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  pending: string[]
}

type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }

type LogLine = {
  text: string
  color: 'green' | 'white' | 'red'
}

type ModalState = 'idle' | 'running' | 'done' | 'error'

const NO_SCHEMA_MARKER = '__banco_sem_schema__'

export function DbUpdateModal({ pending }: Props) {
  const [state, setState] = useState<ModalState>('idle')
  const [logs, setLogs] = useState<LogLine[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  if (pending.length === 0) return null

  // Caso especial: banco vazio mas arquivos .sql não acessíveis no bundle
  const noSchema = pending.includes(NO_SCHEMA_MARKER)

  async function runMigrate() {
    setState('running')
    setLogs([])

    try {
      const res = await fetch('/api/admin/db-migrate', { method: 'POST' })
      if (!res.body) {
        setState('error')
        setLogs([{ text: 'Erro: resposta sem corpo.', color: 'red' }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const event: MigrateEvent = JSON.parse(line)

            if (event.type === 'migration') {
              if (event.status === 'applying') {
                setLogs((prev) => [
                  ...prev,
                  { text: `▸ Aplicando ${event.name}.sql...`, color: 'green' },
                ])
              } else if (event.status === 'done') {
                setLogs((prev) => [
                  ...prev,
                  { text: `✓ ${event.name}.sql`, color: 'white' },
                ])
              } else if (event.status === 'skipped') {
                setLogs((prev) => [
                  ...prev,
                  { text: `— ${event.name}.sql (já aplicado)`, color: 'white' },
                ])
              }
            } else if (event.type === 'complete') {
              setLogs((prev) => [
                ...prev,
                { text: `✓ ${event.message}`, color: 'white' },
              ])
              setState('done')
            } else if (event.type === 'error') {
              setLogs((prev) => [
                ...prev,
                { text: `✗ ${event.message}`, color: 'red' },
              ])
              setState('error')
            }
          } catch {}
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setLogs((prev) => [...prev, { text: `✗ ${message}`, color: 'red' }])
      setState('error')
    }
  }

  const colorClass: Record<LogLine['color'], string> = {
    green: 'text-green-400',
    white: 'text-gray-100',
    red: 'text-red-400',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Atualização necessária</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {state === 'idle'
                ? noSchema
                  ? 'O banco de dados não tem schema criado.'
                  : 'O banco de dados está desatualizado.'
                : state === 'running'
                ? 'Aplicando migrations...'
                : state === 'done'
                ? 'Banco atualizado com sucesso.'
                : 'Ocorreu um erro durante a atualização.'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {state === 'idle' && noSchema && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
              <p className="text-[13px] text-amber-800 font-medium mb-1">Banco em branco detectado</p>
              <p className="text-[13px] text-amber-700">
                O banco de dados existe mas não tem nenhuma tabela criada. Clique em &quot;Atualizar agora&quot; para criar o schema completo.
              </p>
            </div>
          )}

          {state === 'idle' && !noSchema && (
            <>
              <p className="text-[13px] text-gray-600 mb-3">
                As seguintes migrations serão aplicadas:
              </p>
              <ul className="space-y-1 mb-5">
                {pending.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-[13px] font-mono text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary shrink-0" />
                    {name}.sql
                  </li>
                ))}
              </ul>
            </>
          )}

          {(state === 'running' || state === 'done' || state === 'error') && (
            <div
              ref={logRef}
              className="font-mono text-sm bg-neutral-900 rounded-lg p-4 h-48 overflow-y-auto space-y-0.5"
            >
              {logs.map((line, i) => (
                <p key={i} className={colorClass[line.color]}>
                  {line.text}
                </p>
              ))}
              {state === 'running' && (
                <p className="text-green-400 animate-pulse">_</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          {state === 'idle' && (
            <button
              onClick={runMigrate}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-[13px] font-medium hover:bg-brand-primary/90 transition-colors"
            >
              Atualizar agora
            </button>
          )}
          {state === 'running' && (
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-400 text-[13px] font-medium cursor-not-allowed"
            >
              Atualizando...
            </button>
          )}
          {state === 'done' && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 transition-colors"
            >
              Recarregar página
            </button>
          )}
          {state === 'error' && (
            <button
              onClick={() => { setState('idle'); setLogs([]) }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
