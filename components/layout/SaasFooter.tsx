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

export function SaasFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-primary to-blue-500 bg-clip-text text-transparent mb-3">
              {blogName}
            </p>
            {companyEmail && (
              <a
                href={`mailto:${companyEmail}`}
                className="text-sm text-gray-500 hover:text-brand-primary transition-colors"
              >
                {companyEmail}
              </a>
            )}
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Navegação
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                  Início
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            {(socialFacebook || socialInstagram || socialTwitter || socialYoutube) && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Redes Sociais
                </p>
                <ul className="space-y-2">
                  {socialFacebook && (
                    <li>
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialInstagram && (
                    <li>
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialTwitter && (
                    <li>
                      <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                        Twitter
                      </a>
                    </li>
                  )}
                  {socialYoutube && (
                    <li>
                      <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                        YouTube
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
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
