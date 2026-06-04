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

export function MinimalFooter({
  blogName,
  companyName,
  companyEmail,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
}: Props) {
  const hasSocial = socialFacebook || socialInstagram || socialTwitter || socialYoutube

  return (
    <footer className="bg-white border-t border-gray-100 mt-24">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center gap-6 text-center">
        <p className="text-lg font-bold tracking-tight text-neutral-900 font-serif">{blogName}</p>

        <nav className="flex items-center gap-6 flex-wrap justify-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-neutral-900 transition-colors">
            Início
          </Link>
          {hasSocial && (
            <>
              {socialFacebook && (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-neutral-900 transition-colors">
                  Facebook
                </a>
              )}
              {socialInstagram && (
                <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-neutral-900 transition-colors">
                  Instagram
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-neutral-900 transition-colors">
                  Twitter
                </a>
              )}
              {socialYoutube && (
                <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-neutral-900 transition-colors">
                  YouTube
                </a>
              )}
            </>
          )}
        </nav>

        {companyEmail && (
          <a href={`mailto:${companyEmail}`} className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
            {companyEmail}
          </a>
        )}

        <p className="text-xs text-gray-300">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
