import Link from 'next/link'
import { SearchBar } from '@/components/blog/SearchBar'

interface Props {
  blogName: string
  logoUrl?: string
}

export function Header({ blogName, logoUrl }: Props) {
  return (
    <header className="bg-brand-primary text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
          {logoUrl && <img src={logoUrl} alt="" className="h-9 w-auto" />}
          <span className="text-xl font-bold tracking-tight">{blogName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-brand-secondary transition-colors">Home</Link>
          <Link href="/categoria" className="hover:text-brand-secondary transition-colors">Categorias</Link>
        </nav>

        <div className="w-full max-w-xs">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
