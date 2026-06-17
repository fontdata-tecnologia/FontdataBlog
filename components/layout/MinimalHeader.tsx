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

export async function MinimalHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col items-center gap-4">
        {/* Logo / Blog name — centered, large */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          {logoUrl ? (
            <Image src={logoUrl} alt="" height={32} width={160} className="h-8 w-auto" unoptimized />
          ) : (
            <span className="text-2xl font-bold tracking-tight text-neutral-900 font-serif">
              {blogName}
            </span>
          )}
        </Link>

        {/* Nav + search row */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <Link
            href="/"
            className="px-3 py-1 text-sm text-gray-500 hover:text-neutral-900 transition-colors"
          >
            Início
          </Link>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="px-3 py-1 text-sm text-gray-400 hover:text-neutral-900 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          <span className="mx-2 text-gray-200">|</span>
          <div className="w-40">
            <SearchBar variant="light" />
          </div>
        </div>
      </div>
    </header>
  )
}
