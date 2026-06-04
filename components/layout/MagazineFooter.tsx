import Link from 'next/link'
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
  companyName: string
  companyEmail: string
  socialFacebook: string
  socialInstagram: string
  socialTwitter: string
  socialYoutube: string
}

export async function MagazineFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  const cats = await getCategories()
  const hasSocial = socialFacebook || socialInstagram || socialTwitter || socialYoutube

  return (
    <footer className="bg-[#1A1A1A] text-white mt-16">
      {/* Top accent bar */}
      <div className="h-1 bg-[#C8102E]" />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="md:col-span-2">
            <p className="text-3xl font-black tracking-tight font-serif italic mb-4">{blogName}</p>
            {companyEmail && (
              <a
                href={`mailto:${companyEmail}`}
                className="text-white/40 text-xs hover:text-white/70 transition-colors"
              >
                {companyEmail}
              </a>
            )}
          </div>

          {/* Sections */}
          {cats.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-4">
                Seções
              </p>
              <ul className="space-y-2.5">
                {cats.slice(0, 7).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/categoria/${cat.slug}`}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-4">
              Siga-nos
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
                  Início
                </Link>
              </li>
              {hasSocial && (
                <>
                  {socialFacebook && (
                    <li>
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialInstagram && (
                    <li>
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialTwitter && (
                    <li>
                      <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
                        Twitter
                      </a>
                    </li>
                  )}
                  {socialYoutube && (
                    <li>
                      <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
                        YouTube
                      </a>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-white/30 text-xs">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
