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

export async function BrutalistHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 border-2 border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors group">
          {logoUrl ? (
            <Image src={logoUrl} alt="" height={28} width={140} className="h-7 w-auto" unoptimized />
          ) : (
            <span className="font-mono text-lg font-black uppercase tracking-tight text-black group-hover:text-white transition-colors">
              {blogName}
            </span>
          )}
        </Link>

        <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide flex-1">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-mono font-black uppercase tracking-tight text-white bg-black whitespace-nowrap hover:bg-brand-secondary transition-colors"
          >
            Início
          </Link>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="px-3 py-2 text-sm font-mono font-bold uppercase tracking-tight text-black border-l-2 border-black whitespace-nowrap hover:bg-black hover:text-white transition-colors"
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
