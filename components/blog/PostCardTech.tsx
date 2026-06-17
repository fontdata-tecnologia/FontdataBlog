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
  variant?: 'card' | 'featured' | 'secondary' | 'highlight'
}

export function PostCardTech({ post, variant = 'card' }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'featured') {
    return (
      <Link href={`/${post.slug}`} className="group block relative rounded-xl overflow-hidden bg-gray-900 h-full min-h-[220px]">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            unoptimized
            className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--color-primary)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {firstCategory && (
            <span
              className="inline-block text-white text-xs font-bold px-2 py-0.5 rounded mb-2 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h2 className="text-white text-xl font-bold leading-snug line-clamp-3 group-hover:underline underline-offset-2">
            {post.title}
          </h2>
          <p className="text-white/60 text-xs mt-2">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
          </p>
        </div>
      </Link>
    )
  }

  if (variant === 'secondary') {
    return (
      <Link
        href={`/${post.slug}`}
        className="group relative rounded-xl overflow-hidden bg-gray-900 block h-full min-h-[100px]"
      >
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            unoptimized
            className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--color-primary)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {firstCategory && (
            <span
              className="inline-block text-white text-xs font-bold px-2 py-0.5 rounded mb-1.5 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h3 className="text-white text-sm font-bold leading-snug line-clamp-2 group-hover:underline underline-offset-2">
            {post.title}
          </h3>
          <p className="text-white/50 text-xs mt-1">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
          </p>
        </div>
      </Link>
    )
  }

  if (variant === 'highlight') {
    return (
      <Link
        href={`/${post.slug}`}
        className="group flex rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow bg-white"
      >
        <div className="relative w-2/5 shrink-0 overflow-hidden" style={{ minHeight: '160px' }}>
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
        <div className="flex flex-col justify-center p-6">
          {firstCategory && (
            <span
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h3 className="text-lg font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{post.excerpt}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/${post.slug}`}
      className="group bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow block border border-gray-100"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
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
      <div className="p-4">
        {firstCategory && (
          <span
            className="text-xs font-bold uppercase tracking-wider mb-2 block"
            style={{ color: 'var(--color-secondary)' }}
          >
            {firstCategory.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
          {post.title}
        </h3>
        <p className="text-xs text-gray-400 mt-2">
          {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
        </p>
      </div>
    </Link>
  )
}
