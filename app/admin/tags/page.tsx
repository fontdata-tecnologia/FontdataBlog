'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import type { Tag } from '@/lib/admin-types'

export default function TagsPage() {
  usePageTitle('Tags')
  const [tags, setTags] = useState<Tag[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  async function fetchTags() {
    const res = await fetch('/api/admin/tags')
    const data = await res.json()
    setTags(data.tags ?? [])
  }

  useEffect(() => { fetchTags() }, [])

  async function handleAdd() {
    if (!input.trim()) return
    setError('')
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erro ao criar tag'); return }
    setInput('')
    await fetchTags()
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta tag?')) return
    await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
    await fetchTags()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3">
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Nome da tag (Enter para adicionar)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={handleAdd} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors">
            Adicionar
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm">
            {tag.name}
            <button
              onClick={() => handleDelete(tag.id)}
              aria-label={`Excluir tag ${tag.name}`}
              className="text-gray-400 hover:text-red-600 transition-colors ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-gray-400 text-sm">Nenhuma tag ainda. Adicione a primeira acima.</p>}
      </div>
    </div>
  )
}
