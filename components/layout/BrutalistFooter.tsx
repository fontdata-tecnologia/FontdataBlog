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

export function BrutalistFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  return (
    <footer className="bg-black text-white border-t-4 border-brand-secondary mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <p className="font-mono text-xl font-black uppercase tracking-tight text-white mb-3">
              {blogName}
            </p>
            {companyEmail && (
              <a
                href={`mailto:${companyEmail}`}
                className="font-mono text-sm text-brand-secondary hover:underline transition-colors"
              >
                {companyEmail}
              </a>
            )}
          </div>

          {/* Navigation */}
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-widest text-brand-secondary mb-3">
              / Navegação
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="font-mono text-sm text-gray-300 hover:text-white hover:underline transition-colors">
                  Início
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            {(socialFacebook || socialInstagram || socialTwitter || socialYoutube) && (
              <>
                <p className="font-mono text-xs font-black uppercase tracking-widest text-brand-secondary mb-3">
                  / Redes
                </p>
                <ul className="space-y-2">
                  {socialFacebook && (
                    <li>
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-gray-300 hover:text-white hover:underline transition-colors">
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialInstagram && (
                    <li>
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-gray-300 hover:text-white hover:underline transition-colors">
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialTwitter && (
                    <li>
                      <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-gray-300 hover:text-white hover:underline transition-colors">
                        Twitter
                      </a>
                    </li>
                  )}
                  {socialYoutube && (
                    <li>
                      <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-gray-300 hover:text-white hover:underline transition-colors">
                        YouTube
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="border-t-2 border-gray-700 pt-6 text-center font-mono text-xs text-gray-500">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
          {' · '}
          <Link href="/politica-de-privacidade" className="hover:text-white transition-colors underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  )
}
