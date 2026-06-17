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
  published_at: Date | null
  categories: { id: number; name: string; slug: string }[]
}

function formatDate(d: Date | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  post: Post
  variant?: 'featured' | 'secondary' | 'grid'
}

export function PostCardBusiness({ post, variant = 'grid' }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'featured') {
    return (
      <Link href={`/${post.slug}`} className="group block relative overflow-hidden rounded-xl">
        <div className="relative aspect-[16/9]">
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-300" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {firstCategory && (
              <span className="inline-block bg-brand-secondary text-white text-xs font-semibold px-2.5 py-1 rounded mb-3">
                {firstCategory.name}
              </span>
            )}
            <h2 className="text-white text-xl font-bold font-serif leading-snug line-clamp-3 group-hover:opacity-90">
              {post.title}
            </h2>
            <p className="text-white/60 text-xs mt-2">
              {formatDate(post.published_at)} · {readTime} min de leitura
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === 'secondary') {
    return (
      <Link href={`/${post.slug}`} className="group flex flex-row gap-3 bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
        <div className="relative w-28 shrink-0" style={{ minHeight: '80px' }}>
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
        <div className="p-3 flex flex-col justify-center min-w-0">
          {firstCategory && (
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-primary mb-1">
              {firstCategory.name}
            </span>
          )}
          <h3 className="text-sm font-bold line-clamp-2 text-neutral-900 group-hover:text-brand-primary">
            {post.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(post.published_at)} · {readTime} min
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/${post.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow block">
      <div className="relative aspect-[16/9]">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-primary-light to-gray-100" />
        )}
      </div>
      <div className="p-4">
        {firstCategory && (
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-primary mb-2 block">
            {firstCategory.name}
          </span>
        )}
        <h3 className="font-bold text-neutral-900 leading-snug line-clamp-2 mb-2 group-hover:text-brand-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{post.excerpt}</p>
        )}
        <p className="text-xs text-gray-400">
          {formatDate(post.published_at)} · {readTime} min de leitura
        </p>
      </div>
    </Link>
  )
}
