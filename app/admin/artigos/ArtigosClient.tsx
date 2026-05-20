'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import NewArticleModal from './NewArticleModal'
import type { Post } from '@/drizzle/schema'

type SectionId = 'lista' | 'temas' | 'briefing' | 'automacao' | 'prompts'

const SIDEBAR_ITEMS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'lista', label: 'Lista de Artigos', icon: '📝' },
  { id: 'temas', label: 'Temas', icon: '💡' },
  { id: 'briefing', label: 'Briefing', icon: '📋' },
  { id: 'automacao', label: 'Automação', icon: '🤖' },
  { id: 'prompts', label: 'Prompts de IA', icon: '✨' },
]

export default function ArtigosClient() {
  const [activeSection, setActiveSection] = useState<SectionId>('lista')

  function renderContent() {
    switch (activeSection) {
      case 'lista':
        return <ListaArtigos />
      case 'temas':
        return <TemasSection />
      case 'briefing':
        return <BriefingSection />
      case 'automacao':
        return <AutomacaoSection />
      case 'prompts':
        return <PromptsSection />
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-8">Artigos</h1>

      <div className="flex gap-6">
        <nav className="w-56 shrink-0">
          <ul className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  )
}

function ListaArtigos() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  async function fetchPosts() {
    setLoading(true)
    try {
      const q = status !== 'all' ? `&status=${status}` : ''
      const res = await fetch(`/api/admin/posts?limit=20${q}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [status])

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
      await fetchPosts()
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(d: Date | null) {
    if (!d) return '—'
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{total} artigos</span>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors"
        >
          + Novo Artigo
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'published', 'draft'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              status === s ? 'bg-brand-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {{ all: 'Todos', published: 'Publicados', draft: 'Rascunhos' }[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900 max-w-xs truncate">{post.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={post.status as 'draft' | 'published'}>
                      {{ draft: 'Rascunho', published: 'Publicado' }[post.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(post.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/admin/artigos/${post.id}/editar`} className="text-brand-primary hover:underline text-sm">Editar</Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="text-red-600 hover:underline text-sm disabled:opacity-50"
                      >
                        {deleting === post.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">Nenhum artigo encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <NewArticleModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </>
  )
}

function BriefingSection() {
  const [url, setUrl] = useState('')
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/briefing')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { url?: string; briefing?: string }) => {
        if (data.url) setUrl(data.url)
        if (data.briefing) setBriefing(data.briefing)
      })
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!url.trim()) return
    setLoading(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar briefing')
      setBriefing(data.briefing)
      setToast({ type: 'success', msg: 'Briefing gerado com sucesso!' })
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao gerar briefing' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, briefing }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Briefing salvo com sucesso!' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar briefing' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Briefing</h2>
      <p className="text-sm text-gray-500 mb-5">
        Informe o site da empresa para gerar automaticamente um briefing com análise de público-alvo, pilares de conteúdo e sugestões de artigos. Você também pode editar livremente o texto abaixo.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Site da Empresa</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.empresa.com.br"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando...
              </span>
            ) : (
              'Gerar Briefing'
            )}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo do Briefing</label>
        <textarea
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          rows={20}
          placeholder="O briefing será gerado aqui após informar o site. Você também pode escrever ou colar manualmente."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y leading-relaxed"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Briefing'}
        </button>
      </div>
    </section>
  )
}

type ArticleTheme = {
  id: number
  title: string
  description: string | null
  source: string
  status: string
  created_at: string
}

function TemasSection() {
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTheme, setEditTheme] = useState<ArticleTheme | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function fetchThemes() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/themes')
      const data = await res.json()
      setThemes(data.themes ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchThemes() }, [])

  async function handleGenerate() {
    setGenerating(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar temas')
      setToast({ type: 'success', msg: `${data.total} temas sugeridos pela IA com sucesso!` })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao gerar temas' })
    } finally {
      setGenerating(false)
    }
  }

  async function handleAddManual() {
    if (!newTitle.trim()) return
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao criar tema')
      }
      setNewTitle('')
      setNewDescription('')
      setShowAddModal(false)
      setToast({ type: 'success', msg: 'Tema adicionado com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao criar tema' })
    }
  }

  async function handleEdit() {
    if (!editTheme || !newTitle.trim()) return
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTheme.id, title: newTitle.trim(), description: newDescription.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao editar tema')
      }
      setShowEditModal(false)
      setEditTheme(null)
      setNewTitle('')
      setNewDescription('')
      setToast({ type: 'success', msg: 'Tema atualizado com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao editar tema' })
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este tema?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/themes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao excluir')
      }
      setToast({ type: 'success', msg: 'Tema excluído com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao excluir tema' })
    } finally {
      setDeleting(null)
    }
  }

  function openEditModal(theme: ArticleTheme) {
    setEditTheme(theme)
    setNewTitle(theme.title)
    setNewDescription(theme.description ?? '')
    setShowEditModal(true)
  }

  function formatDate(d: string) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Temas para Artigos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pesquise temas quentes e relevantes com IA ou cadastre manualmente. Esses temas serão usados na criação de artigos.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`mt-4 mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex gap-3 mt-5 mb-5">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Pesquisando temas...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
              </svg>
              Pesquisar Temas com IA
            </>
          )}
        </button>
        <button
          onClick={() => { setNewTitle(''); setNewDescription(''); setShowAddModal(true) }}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Manualmente
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-3">{themes.length} tema{themes.length !== 1 ? 's' : ''} cadastrado{themes.length !== 1 ? 's' : ''}</div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : themes.length === 0 ? (
        <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
          Nenhum tema cadastrado. Use a IA para pesquisar temas ou adicione manualmente.
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">{theme.title}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                        theme.source === 'ai'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {theme.source === 'ai' ? 'IA' : 'Manual'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                        theme.status === 'used'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {theme.status === 'used' ? 'Usado' : 'Pendente'}
                    </span>
                  </div>
                  {theme.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{theme.description}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(theme.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(theme)}
                    className="text-brand-primary hover:text-brand-primary-dark p-1.5 rounded-md hover:bg-brand-primary/5 transition-colors"
                    title="Editar tema"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(theme.id)}
                    disabled={deleting === theme.id}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Excluir tema"
                  >
                    {deleting === theme.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTheme(null) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              {showEditModal ? 'Editar Tema' : 'Novo Tema'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Tema</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Como a IA está transformando o marketing digital"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Breve descrição do tema e por que é relevante..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTheme(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={showEditModal ? handleEdit : handleAddManual}
                disabled={!newTitle.trim()}
                className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showEditModal ? 'Salvar Alterações' : 'Adicionar Tema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const INTERVAL_OPTIONS = [
  { value: 4, label: 'A cada 4 horas' },
  { value: 8, label: 'A cada 8 horas' },
  { value: 12, label: 'A cada 12 horas' },
  { value: 24, label: 'A cada 24 horas' },
  { value: 48, label: 'A cada 2 dias' },
  { value: 168, label: 'A cada 7 dias' },
]

function AutomacaoSection() {
  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [themeMode, setThemeMode] = useState<'all' | 'specific'>('all')
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/automation')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: {
        enabled?: boolean
        interval_hours?: number
        theme_ids?: number[]
        custom_prompt?: string
        last_run_at?: string
        next_run_at?: string
      }) => {
        if (data.enabled !== undefined) setEnabled(data.enabled)
        if (data.interval_hours) setIntervalHours(data.interval_hours)
        if (Array.isArray(data.theme_ids) && data.theme_ids.length > 0) {
          setThemeMode('specific')
          setSelectedThemeIds(data.theme_ids)
        }
        if (data.custom_prompt) setCustomPrompt(data.custom_prompt)
        if (data.last_run_at) setLastRunAt(data.last_run_at)
        if (data.next_run_at) setNextRunAt(data.next_run_at)
      })
      .catch(() => {})

    fetch('/api/admin/themes')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { themes?: ArticleTheme[] }) => setThemes(data.themes ?? []))
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          interval_hours: intervalHours,
          theme_ids: themeMode === 'specific' ? selectedThemeIds : [],
          custom_prompt: customPrompt,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Configuração salva com sucesso!' })
      const updated = await fetch('/api/admin/automation').then((r) => r.json()) as { next_run_at?: string }
      if (updated.next_run_at) setNextRunAt(updated.next_run_at)
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar configuração' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRunNow() {
    setRunning(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/automation/run', { method: 'POST' })
      const data = await res.json() as { success?: boolean; skipped?: boolean; message?: string; error?: string; post_id?: number }
      if (data.success) {
        setToast({ type: 'success', msg: data.message ?? 'Artigo gerado e publicado!' })
        const updated = await fetch('/api/admin/automation').then((r) => r.json()) as { last_run_at?: string; next_run_at?: string }
        if (updated.last_run_at) setLastRunAt(updated.last_run_at)
        if (updated.next_run_at) setNextRunAt(updated.next_run_at)
      } else {
        setToast({ type: 'error', msg: data.message ?? data.error ?? 'Nenhum tema disponível' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro ao executar automação' })
    } finally {
      setRunning(false)
    }
  }

  function toggleThemeId(id: number) {
    setSelectedThemeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function formatDateTime(d: string | null) {
    if (!d) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Automação de Postagens</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure a geração automática de artigos com IA. O sistema selecionará um tema pendente, gerará o artigo completo com imagem de capa e publicará no intervalo configurado.
      </p>

      {toast && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Automação ativa</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {enabled
                ? 'O sistema gerará artigos automaticamente no intervalo configurado.'
                : 'A automação está pausada.'}
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-brand-primary' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo de publicação</label>
          <select
            value={intervalHours}
            onChange={(e) => setIntervalHours(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Temas para geração</label>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={themeMode === 'all'}
                onChange={() => setThemeMode('all')}
                className="text-brand-primary"
              />
              <span className="text-sm text-gray-700">Todos os temas pendentes (rotação automática)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={themeMode === 'specific'}
                onChange={() => setThemeMode('specific')}
                className="text-brand-primary"
              />
              <span className="text-sm text-gray-700">Selecionar temas específicos</span>
            </label>
          </div>

          {themeMode === 'specific' && (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {themes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhum tema cadastrado. Crie temas na seção Temas.
                </p>
              ) : (
                themes.map((theme) => (
                  <label
                    key={theme.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedThemeIds.includes(theme.id)}
                      onChange={() => toggleThemeId(theme.id)}
                      className="mt-0.5 text-brand-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{theme.title}</p>
                      {theme.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{theme.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      theme.status === 'used'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {theme.status === 'used' ? 'Usado' : 'Pendente'}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt adicional <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Instrução extra injetada na geração de cada artigo. Ex: &ldquo;Sempre inclua exemplos práticos&rdquo;, &ldquo;Use tom mais técnico&rdquo;.
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Ex: Sempre inclua ao menos um exemplo prático e uma lista de dicas ao final do artigo."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
          />
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Última execução</p>
            <p className="text-sm text-gray-900">{formatDateTime(lastRunAt)}</p>
          </div>
          <div className="hidden sm:block w-px bg-gray-200" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Próxima execução</p>
            <p className="text-sm text-gray-900">{formatDateTime(nextRunAt)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
        <button
          onClick={handleRunNow}
          disabled={running || saving}
          className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gerando artigo...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Executar agora
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || running}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>
    </section>
  )
}

type PromptField = {
  key: 'title' | 'article' | 'cta' | 'image'
  label: string
  description: string
  placeholder: string
  rows: number
}

const PROMPT_FIELDS: PromptField[] = [
  {
    key: 'title',
    label: 'Prompt para Títulos',
    description: 'Prompt usado pela IA para gerar títulos de artigos.',
    placeholder: 'Ex: Você é um especialista em copywriting. Gere 5 opções de títulos atrativos e otimizados para SEO...',
    rows: 6,
  },
  {
    key: 'article',
    label: 'Prompt para Artigos',
    description: 'Prompt usado pela IA para gerar artigos completos.',
    placeholder: 'Ex: Você é um redator profissional. Escreva um artigo completo sobre o tema proposto...',
    rows: 8,
  },
  {
    key: 'cta',
    label: 'Prompt para CTA',
    description: 'Prompt usado pela IA para gerar chamadas para ação (Call to Action).',
    placeholder: 'Ex: Crie um CTA persuasivo e contextualizado com o conteúdo do artigo...',
    rows: 6,
  },
  {
    key: 'image',
    label: 'Prompt para Imagens',
    description: 'Prompt usado pela IA para gerar descrições de imagens.',
    placeholder: 'Ex: Crie uma descrição detalhada de imagem para ilustrar o artigo...',
    rows: 6,
  },
]

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  )
}

function PromptsSection() {
  const [prompts, setPrompts] = useState<Record<string, string>>({ title: '', article: '', cta: '', image: '' })
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/prompts')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { prompts?: Record<string, string> }) => {
        if (data.prompts) {
          setPrompts({
            title: data.prompts.title ?? '',
            article: data.prompts.article ?? '',
            cta: data.prompts.cta ?? '',
            image: data.prompts.image ?? '',
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleGenerate(key: string) {
    setLoading((prev) => ({ ...prev, [key]: true }))
    setToast(null)
    try {
      const res = await fetch('/api/admin/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar prompt')
      setPrompts((prev) => ({ ...prev, [key]: data.prompt }))
      setToast({ type: 'success', msg: `Prompt de ${PROMPT_FIELDS.find((f) => f.key === key)?.label ?? key} gerado!` })
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao gerar prompt' })
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Prompts salvos com sucesso!' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar prompts' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Prompts de IA</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure os prompts padrão utilizados pela IA para cada tipo de geração. Clique no ícone <SparkleIcon className="inline h-4 w-4 text-brand-primary" /> para que a IA gere o prompt automaticamente com base no briefing do cliente.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {PROMPT_FIELDS.map((field) => (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{field.label}</label>
              <button
                type="button"
                onClick={() => handleGenerate(field.key)}
                disabled={loading[field.key]}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Gerar prompt de ${field.label} com IA`}
              >
                {loading[field.key] ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <SparkleIcon className="h-4 w-4" />
                )}
                {loading[field.key] ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            <textarea
              value={prompts[field.key]}
              onChange={(e) => setPrompts((prev) => ({ ...prev, [field.key]: e.target.value }))}
              rows={field.rows}
              placeholder={field.placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y leading-relaxed"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Prompts'}
        </button>
      </div>
    </section>
  )
}
