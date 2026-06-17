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

export async function MagazineHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="bg-white sticky top-0 z-40 shadow-sm">
      {/* Top strip with date and search */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <p className="text-xs text-gray-400 tracking-widest uppercase">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="w-44">
            <SearchBar variant="light" />
          </div>
        </div>
      </div>

      {/* Main masthead */}
      <div className="border-b-4 border-[#C8102E]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {logoUrl ? (
              <Image src={logoUrl} alt="" height={40} width={180} className="h-10 w-auto" unoptimized />
            ) : (
              <span className="text-4xl font-black tracking-tight text-neutral-900 font-serif italic">
                {blogName}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Category nav strip */}
      <div className="bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center overflow-x-auto scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2.5 text-sm font-bold text-white whitespace-nowrap hover:bg-[#C8102E] transition-colors border-r border-white/10"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-4 py-2.5 text-sm font-medium text-white/70 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors border-r border-white/10"
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
