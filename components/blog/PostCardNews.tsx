import Link from 'next/link'
import Image from 'next/image'
import { estimateReadingTime } from '@/lib/reading-time'

interface Post {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  post: Post
  variant?: 'horizontal' | 'lead' | 'card' | 'mini'
  rank?: number
}

export function PostCardNews({ post, variant = 'card', rank }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'mini') {
    return (
      <Link
        href={`/${post.slug}`}
        className="group flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors px-1 rounded"
      >
        {rank !== undefined && (
          <span
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:opacity-70">
            {post.title}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{formatDate(post.published_at)}</p>
        </div>
        {post.cover_image && (
          <div className="relative w-16 h-11 shrink-0">
            <Image src={post.cover_image} alt="" fill unoptimized className="object-cover rounded" />
          </div>
        )}
      </Link>
    )
  }

  if (variant === 'horizontal') {
    return (
      <article className="group">
        <Link href={`/${post.slug}`} className="flex gap-5 items-start">
          {post.cover_image && (
            <div className="relative w-2/5 shrink-0 overflow-hidden rounded-lg aspect-[16/9]">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="flex-1 py-1">
            {firstCategory && (
              <span
                className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: 'var(--color-secondary)' }}
              >
                {firstCategory.name}
              </span>
            )}
            <h3 className="text-base font-bold text-neutral-900 leading-snug line-clamp-3 group-hover:opacity-75 mb-2">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{post.excerpt}</p>
            )}
            <p className="text-xs text-gray-400">
              {formatDate(post.published_at)}{readTime ? ` · ${readTime} min de leitura` : ''}
            </p>
          </div>
        </Link>
      </article>
    )
  }

  if (variant === 'lead') {
    return (
      <article className="group">
        <Link href={`/${post.slug}`} className="block">
          <div className="relative overflow-hidden rounded-lg mb-3 aspect-[16/9]">
            {post.cover_image ? (
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
          </div>
          {firstCategory && (
            <span
              className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
              style={{ color: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h3 className="text-base font-bold text-neutral-900 leading-snug line-clamp-3 group-hover:opacity-75 mb-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{post.excerpt}</p>
          )}
          <p className="text-xs text-gray-400">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min de leitura` : ''}
          </p>
        </Link>
      </article>
    )
  }

  // 'card' variant — compact horizontal thumbnail, for secondary slots
  return (
    <article className="group">
      <Link href={`/${post.slug}`} className="flex gap-3 items-start">
        {post.cover_image && (
          <div className="relative w-20 h-14 shrink-0 overflow-hidden rounded">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-3 group-hover:opacity-75">
            {post.title}
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
          </p>
        </div>
      </Link>
    </article>
  )
}
