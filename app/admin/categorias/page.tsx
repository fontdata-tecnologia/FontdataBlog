'use client'

import { useState, useEffect } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/lib/admin-types'

export default function CategoriasPage() {
  usePageTitle('Categorias')
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
  }

  useEffect(() => { fetchCategories() }, [])

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
      setName(''); setDescription(''); setEditing(null)
      await fetchCategories()
    } catch { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta categoria?')) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    await fetchCategories()
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-medium text-neutral-900 mb-4">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Descrição (opcional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <Button onClick={handleSave} loading={loading}>{editing ? 'Salvar' : 'Adicionar'}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setName(''); setDescription('') }}>Cancelar</Button>}
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{cat.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditing(cat); setName(cat.name); setDescription(cat.description ?? '') }} className="text-brand-primary hover:underline text-sm">Editar</button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline text-sm">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
