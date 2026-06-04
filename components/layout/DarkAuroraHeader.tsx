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

export async function DarkAuroraHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="sticky top-0 z-40">
      <div
        style={{ backgroundColor: '#0B0F1A', borderBottom: '1px solid rgba(139,92,246,0.2)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity"
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="" height={28} width={140} className="h-7 w-auto" unoptimized />
            ) : (
              <span
                className="text-xl font-black tracking-tight"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {blogName}
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-semibold text-white whitespace-nowrap rounded hover:bg-white/5 transition-colors"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded transition-colors text-white/55 hover:text-white hover:bg-white/5"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 w-48">
            <SearchBar variant="dark" />
          </div>
        </div>

        {/* Gradient accent line */}
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #8B5CF6, #22D3EE, transparent)' }}
        />
      </div>
    </header>
  )
}
