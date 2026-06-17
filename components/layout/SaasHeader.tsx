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

export async function SaasHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <Image src={logoUrl} alt="" height={28} width={140} className="h-7 w-auto" unoptimized />
          ) : (
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-primary to-blue-500 bg-clip-text text-transparent">
              {blogName}
            </span>
          )}
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm font-semibold text-gray-900 rounded-lg bg-gray-100 whitespace-nowrap hover:bg-gray-200 transition-colors"
          >
            Início
          </Link>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg whitespace-nowrap hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 w-48">
          <SearchBar variant="light" />
        </div>
      </div>
    </header>
  )
}
