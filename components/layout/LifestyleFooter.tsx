import Link from 'next/link'

interface Props {
  blogName: string
  companyName: string
  companyEmail: string
  socialFacebook: string
  socialInstagram: string
  socialTwitter: string
  socialYoutube: string
}

export function LifestyleFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  return (
    <footer className="bg-stone-50 border-t border-stone-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="font-serif text-3xl font-bold italic text-neutral-900 mb-2">{blogName}</p>
          {companyEmail && (
            <a
              href={`mailto:${companyEmail}`}
              className="text-sm text-gray-500 hover:text-neutral-900 transition-colors"
            >
              {companyEmail}
            </a>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-neutral-900 transition-colors">
            Início
          </Link>
          {socialFacebook && (
            <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-neutral-900 transition-colors">
              Facebook
            </a>
          )}
          {socialInstagram && (
            <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-neutral-900 transition-colors">
              Instagram
            </a>
          )}
          {socialTwitter && (
            <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-neutral-900 transition-colors">
              Twitter
            </a>
          )}
          {socialYoutube && (
            <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-neutral-900 transition-colors">
              YouTube
            </a>
          )}
        </div>

        <div className="border-t border-stone-200 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
          {' · '}
          <Link href="/politica-de-privacidade" className="hover:text-gray-600 transition-colors underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  )
}
