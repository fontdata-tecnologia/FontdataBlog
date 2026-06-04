'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  variant?: 'image' | 'logo'
  aiContext?: { title: string; excerpt?: string; content?: string }
}

type ImageSource = 'ai' | 'pexels' | 'code'
type CodeStyle = 'gradient' | 'geometric'

interface AgentsExtraConfig {
  pexels_configured?: boolean
  agents_extra?: {
    designer?: {
      image_source?: ImageSource
      code_style?: CodeStyle
    }
  }
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  )
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 11V5" />
      <circle cx="12" cy="4" r="1" />
      <path d="M8 15h.01M16 15h.01" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

export function ImageUpload({ value, onChange, variant = 'image', aiContext }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [error, setError] = useState('')
  const [imageSource, setImageSource] = useState<ImageSource>('pexels')
  const [codeStyle, setCodeStyle] = useState<CodeStyle>('gradient')
  const [pexelsConfigured, setPexelsConfigured] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aiContext) return
    fetch('/api/admin/agents/extra')
      .then(r => r.json())
      .then((data: AgentsExtraConfig) => {
        const source = data.agents_extra?.designer?.image_source ?? 'pexels'
        const style = data.agents_extra?.designer?.code_style ?? 'gradient'
        setImageSource(source)
        setCodeStyle(style)
        setPexelsConfigured(data.pexels_configured ?? false)
      })
      .catch(() => {
        // falha silenciosa — mantém defaults
      })
  }, [aiContext])

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao fazer upload'); return }
      onChange(data.url)
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
    }
  }

  async function handleAIGenerate() {
    if (!aiContext?.title) {
      setError('Preencha o título do artigo antes de gerar a imagem')
      return
    }
    setError('')
    setGeneratingAI(true)
    try {
      const body: Record<string, string> = {
        ...aiContext,
        image_source: imageSource,
      }
      if (imageSource === 'code') {
        body.code_style = codeStyle
      }
      const res = await fetch('/api/admin/ai/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao gerar imagem de capa')
        return
      }
      onChange(data.url)
    } catch {
      setError('Erro de conexão ao gerar imagem')
    } finally {
      setGeneratingAI(false)
    }
  }

  function getGenerateButtonLabel() {
    if (generatingAI) return 'Gerando...'
    if (imageSource === 'pexels') return 'Buscar imagem (Pexels)'
    if (imageSource === 'code') return 'Gerar capa (SVG)'
    return 'Gerar imagem de capa'
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {value ? (
        <div className={`relative group ${variant === 'logo' ? 'h-24' : 'aspect-video'} w-full`}>
          <Image
            src={value}
            alt="Preview"
            fill
            unoptimized
            className={variant === 'logo'
              ? 'rounded-lg object-contain bg-gray-100'
              : 'rounded-lg object-cover'
            }
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-medium hover:bg-gray-100"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-brand-primary hover:bg-brand-primary-light transition-colors text-gray-400 hover:text-brand-primary ${variant === 'logo' ? 'h-24' : 'aspect-video'}`}
        >
          {uploading ? (
            <>
              <span className="text-2xl">⏳</span>
              <span className="text-xs">Enviando...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🖼️</span>
              <span className="text-xs font-medium">Clique para fazer upload</span>
              <span className="text-xs">JPG, PNG, WebP · Máx. 5MB</span>
            </>
          )}
        </button>
      )}

      {aiContext && (
        <div className="mt-2 space-y-2">
          {/* Seletor de fonte */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setImageSource('ai')}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                imageSource === 'ai'
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-gray-200 text-gray-600 hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              <BotIcon />
              IA
            </button>
            <button
              type="button"
              onClick={() => pexelsConfigured && setImageSource('pexels')}
              disabled={!pexelsConfigured}
              title={!pexelsConfigured ? 'Configure a chave Pexels em Configurações para usar esta opção' : undefined}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                imageSource === 'pexels'
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : pexelsConfigured
                    ? 'border-gray-200 text-gray-600 hover:border-brand-primary hover:text-brand-primary'
                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
            >
              <CameraIcon />
              Pexels
            </button>
            <button
              type="button"
              onClick={() => setImageSource('code')}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                imageSource === 'code'
                  ? 'border-brand-secondary bg-brand-secondary text-white'
                  : 'border-gray-200 text-gray-600 hover:border-brand-secondary hover:text-brand-secondary'
              }`}
            >
              <CodeIcon />
              SVG
            </button>
          </div>

          {/* Sub-seletor de estilo (visível apenas quando fonte = 'code') */}
          {imageSource === 'code' && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCodeStyle('gradient')}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                  codeStyle === 'gradient'
                    ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary'
                    : 'border-gray-200 text-gray-500 hover:border-brand-secondary hover:text-brand-secondary'
                }`}
              >
                Gradiente + título
              </button>
              <button
                type="button"
                onClick={() => setCodeStyle('geometric')}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                  codeStyle === 'geometric'
                    ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary'
                    : 'border-gray-200 text-gray-500 hover:border-brand-secondary hover:text-brand-secondary'
                }`}
              >
                Padrão geométrico
              </button>
            </div>
          )}

          {/* Botão de geração */}
          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={generatingAI || !aiContext.title}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-brand-primary text-brand-primary hover:bg-brand-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingAI ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando imagem...
              </>
            ) : (
              <>
                <SparkleIcon className="h-4 w-4" />
                {getGenerateButtonLabel()}
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
