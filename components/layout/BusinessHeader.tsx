import Link from 'next/link'
import Image from 'next/image'
import { SearchBar } from '@/components/blog/SearchBar'
import { db } from '@/drizzle/db'
import { categories } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'

async function getCategories() {
  try {
    return db.select().from(categories).orderBy(asc(categories.name))
  } catch {
    return []
  }
}

interface Props {
  blogName: string
  logoUrl?: string
}

export async function BusinessHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
          {logoUrl && <Image src={logoUrl} alt="" height={32} width={120} className="h-8 w-auto" unoptimized />}
          <span className="text-lg font-bold tracking-tight whitespace-nowrap text-neutral-900">{blogName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-brand-primary-light rounded-lg transition-colors"
          >
            Início
          </Link>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-brand-primary-light rounded-lg transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="w-full max-w-xs">
          <SearchBar variant="light" />
        </div>
      </div>
    </header>
  )
}
