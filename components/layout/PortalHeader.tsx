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

export async function PortalHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header style={{ backgroundColor: 'var(--color-primary)' }} className="text-white shadow-md">
      {/* Row 1: logo + search */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
          {logoUrl && <Image src={logoUrl} alt="" height={36} width={120} className="h-9 w-auto" unoptimized />}
          <span className="text-xl font-bold tracking-tight whitespace-nowrap">{blogName}</span>
        </Link>
        <div className="w-full max-w-xs">
          <SearchBar />
        </div>
      </div>

      {/* Row 2: category navigation */}
      <div style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 80%, black)' }} className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-white/10 transition-colors border-b-2 border-transparent hover:border-white/50"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-white/10 transition-colors text-white/80 hover:text-white border-b-2 border-transparent hover:border-white/50"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
