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

export async function DarkAuroraFooter({
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
    <footer
      style={{ backgroundColor: '#0B0F1A', borderTop: '1px solid rgba(139,92,246,0.2)' }}
      className="mt-16"
    >
      {/* Gradient top accent */}
      <div
        className="h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #8B5CF6, #22D3EE, transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <p
              className="text-xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(90deg, #8B5CF6, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {blogName}
            </p>
            {companyEmail && (
              <a
                href={`mailto:${companyEmail}`}
                className="text-xs mt-4 block transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {companyEmail}
              </a>
            )}
          </div>

          {/* Categories */}
          {cats.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#8B5CF6' }}>
                Categorias
              </p>
              <ul className="space-y-2.5">
                {cats.slice(0, 7).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/categoria/${cat.slug}`}
                      className="text-sm transition-colors"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nav / Social */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#22D3EE' }}>
              Navegação
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Início
                </Link>
              </li>
              {hasSocial && (
                <>
                  {socialFacebook && (
                    <li>
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialInstagram && (
                    <li>
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialTwitter && (
                    <li>
                      <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Twitter
                      </a>
                    </li>
                  )}
                  {socialYoutube && (
                    <li>
                      <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        YouTube
                      </a>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>

        <div
          className="border-t mt-10 pt-6 text-center text-xs"
          style={{ borderColor: 'rgba(139,92,246,0.15)', color: 'rgba(255,255,255,0.2)' }}
        >
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
          {'  ·  '}
          <Link href="/politica-de-privacidade" className="transition-colors underline" style={{ color: 'rgba(255,255,255,0.3)' }}>Política de Privacidade</Link>
        </div>
      </div>
    </footer>
  )
}
