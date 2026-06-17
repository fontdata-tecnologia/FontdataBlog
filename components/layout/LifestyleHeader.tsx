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

export async function LifestyleHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white border-b border-gray-100">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center gap-2">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <Image src={logoUrl} alt="" height={48} width={220} className="h-12 w-auto" unoptimized />
          ) : (
            <span className="font-serif text-4xl font-bold tracking-tight text-neutral-900 italic">
              {blogName}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide flex-1">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-900 border-b-2 border-neutral-900 whitespace-nowrap hover:text-gray-500 transition-colors"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-500 border-b-2 border-transparent whitespace-nowrap hover:text-neutral-900 hover:border-gray-300 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
          <div className="shrink-0 w-48">
            <SearchBar variant="light" />
          </div>
        </div>
      </div>
    </header>
  )
}
