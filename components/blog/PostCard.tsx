import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import type { Post, Category } from '@/drizzle/schema'

interface PostCardProps {
  post: Post & { categories: Category[] }
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(date)
  )
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <Link href={`/${post.slug}`} className="block">
        <div className="relative aspect-video bg-brand-primary-light overflow-hidden">
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">📰</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-5">
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.categories.map((cat) => (
              <Badge key={cat.id} variant="category">{cat.name}</Badge>
            ))}
          </div>
        )}

        <Link href={`/${post.slug}`}>
          <h2 className="font-semibold text-neutral-900 text-lg leading-snug hover:text-brand-primary transition-colors line-clamp-2 mb-2">
            {post.title}
          </h2>
        </Link>

        <p className="text-gray-500 text-sm line-clamp-2 mb-3">{post.excerpt}</p>

        <time className="text-xs text-gray-400">{formatDate(post.published_at)}</time>
      </div>
    </article>
  )
}
