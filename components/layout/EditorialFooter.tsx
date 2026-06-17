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

export function EditorialFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <p className="font-serif text-xl font-bold text-white mb-3">{blogName}</p>
            {companyEmail && (
              <a
                href={`mailto:${companyEmail}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {companyEmail}
              </a>
            )}
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Navegação
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Início
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            {(socialFacebook || socialInstagram || socialTwitter || socialYoutube) && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Redes Sociais
                </p>
                <ul className="space-y-2">
                  {socialFacebook && (
                    <li>
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialInstagram && (
                    <li>
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialTwitter && (
                    <li>
                      <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Twitter
                      </a>
                    </li>
                  )}
                  {socialYoutube && (
                    <li>
                      <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">
                        YouTube
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
          {' · '}
          <Link href="/politica-de-privacidade" className="hover:text-gray-300 transition-colors underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  )
}
