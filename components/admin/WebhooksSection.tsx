'use client'
import { useState, useEffect } from 'react'
import type { Webhook } from '@/drizzle/schema'
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS, type WebhookEvent } from '@/lib/webhook-events'

interface Toast { type: 'success' | 'error'; msg: string }

interface WebhookForm {
  url: string
  secret: string
  events: WebhookEvent[]
  enabled: boolean
}

const EMPTY_FORM: WebhookForm = { url: '', secret: '', events: [], enabled: true }

export default function WebhooksSection() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<WebhookForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    fetch('/api/admin/webhooks')
      .then((r) => r.json())
      .then((data: { webhooks?: Webhook[] }) => {
        if (data.webhooks) setWebhooks(data.webhooks)
      })
      .catch(() => setToast({ type: 'error', msg: 'Erro ao carregar webhooks' }))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(wh: Webhook) {
    setEditingId(wh.id)
    setForm({
      url: wh.url,
      secret: wh.secret ?? '',
      events: (wh.events as WebhookEvent[]),
      enabled: wh.enabled,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function toggleEvent(ev: WebhookEvent) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(ev)
        ? prev.events.filter((e) => e !== ev)
        : [...prev.events, ev],
    }))
  }

  async function save() {
    if (!form.url.trim()) {
      setToast({ type: 'error', msg: 'URL obrigatória' })
      return
    }
    if (form.events.length === 0) {
      setToast({ type: 'error', msg: 'Selecione pelo menos um evento' })
      return
    }
    setSaving(true)
    try {
      const isEdit = editingId !== null
      const res = await fetch(
        isEdit ? `/api/admin/webhooks/${editingId}` : '/api/admin/webhooks',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: form.url,
            secret: form.secret || undefined,
            events: form.events,
            enabled: form.enabled,
          }),
        }
      )
      const data = await res.json() as { webhook?: Webhook; error?: string }
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error ?? 'Erro ao salvar' })
        return
      }
      if (data.webhook) {
        if (isEdit) {
          setWebhooks((prev) => prev.map((w) => (w.id === editingId ? data.webhook! : w)))
        } else {
          setWebhooks((prev) => [data.webhook!, ...prev])
        }
      }
      setToast({ type: 'success', msg: isEdit ? 'Webhook atualizado!' : 'Webhook criado!' })
      cancelForm()
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar webhook' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(wh: Webhook) {
    try {
      const res = await fetch(`/api/admin/webhooks/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !wh.enabled }),
      })
      const data = await res.json() as { webhook?: Webhook; error?: string }
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error ?? 'Erro ao atualizar' })
        return
      }
      if (data.webhook) {
        setWebhooks((prev) => prev.map((w) => (w.id === wh.id ? data.webhook! : w)))
      }
      setToast({ type: 'success', msg: data.webhook?.enabled ? 'Webhook ativado' : 'Webhook desativado' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar webhook' })
    }
  }

  async function testWebhook(id: number) {
    setTesting(id)
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, { method: 'POST' })
      const data = await res.json() as { success?: boolean; error?: string }
      if (data.success) {
        setToast({ type: 'success', msg: 'Teste enviado com sucesso!' })
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Falha no teste' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro ao testar webhook' })
    } finally {
      setTesting(null)
    }
  }

  async function deleteWebhook(id: number) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error ?? 'Erro ao remover' })
        return
      }
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
      setToast({ type: 'success', msg: 'Webhook removido' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao remover webhook' })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Endpoints configurados</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada endpoint recebe uma requisição POST quando o evento selecionado ocorre.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-blue-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar endpoint
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <h4 className="text-sm font-semibold text-neutral-900">
            {editingId ? 'Editar endpoint' : 'Novo endpoint'}
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL do endpoint</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Secret (opcional — usado para assinar o payload via HMAC-SHA256)
            </label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
              placeholder="Deixe em branco para desabilitar assinatura"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Eventos</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs">
                    <span className="font-medium">{WEBHOOK_EVENT_LABELS[ev]}</span>
                    <span className="text-gray-400 ml-1">({ev})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Endpoint ativo
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Nenhum endpoint configurado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`border rounded-xl p-4 bg-white ${wh.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-neutral-900 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(wh.events as string[]).map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-brand-primary border border-blue-100"
                      >
                        {WEBHOOK_EVENT_LABELS[ev as WebhookEvent] ?? ev}
                      </span>
                    ))}
                    {wh.secret && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                        HMAC assinado
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle enabled */}
                  <button
                    onClick={() => toggleEnabled(wh)}
                    title={wh.enabled ? 'Desativar' : 'Ativar'}
                    className={`p-1.5 rounded-lg border text-xs ${wh.enabled ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      {wh.enabled
                        ? <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
                        : <path d="M18.36 6.64A9 9 0 0 1 21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 2.64-6.36M12 2v10" />
                      }
                    </svg>
                  </button>
                  {/* Test */}
                  <button
                    onClick={() => testWebhook(wh.id)}
                    disabled={testing === wh.id}
                    title="Testar"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-blue-50 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(wh)}
                    title="Editar"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-blue-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => deleteWebhook(wh.id)}
                    disabled={deleting === wh.id}
                    title="Remover"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
