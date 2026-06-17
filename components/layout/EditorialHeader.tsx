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

export async function EditorialHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white border-b border-gray-900">
      {/* Masthead */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <Image src={logoUrl} alt="" height={36} width={160} className="h-9 w-auto" unoptimized />
          ) : (
            <span className="font-serif text-2xl font-bold tracking-tight text-gray-900">
              {blogName}
            </span>
          )}
        </Link>
        <div className="w-56">
          <SearchBar variant="light" />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
          <Link
            href="/"
            className="px-4 py-3 text-sm font-semibold text-gray-900 border-b-2 border-gray-900 whitespace-nowrap hover:text-gray-600 transition-colors"
          >
            Início
          </Link>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent whitespace-nowrap hover:text-gray-900 hover:border-gray-400 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
