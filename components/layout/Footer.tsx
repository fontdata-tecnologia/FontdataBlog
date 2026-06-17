interface Props {
  blogName: string
  companyName: string
  companyEmail: string
  companyPhone: string
  socialFacebook: string
  socialInstagram: string
  socialTwitter: string
  socialYoutube: string
}

export function Footer({ blogName, companyName, companyEmail, companyPhone, socialFacebook, socialInstagram, socialTwitter, socialYoutube }: Props) {
  const hasSocial = socialFacebook || socialInstagram || socialTwitter || socialYoutube

  return (
    <footer className="bg-brand-primary text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-bold text-lg">{blogName}</p>
            <p className="text-white/70 text-sm mt-1">Tecnologia, gestão e inovação para empresas</p>
          </div>
          <nav className="flex gap-6 text-sm text-white/70">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            {hasSocial && (
              <>
                {socialFacebook && <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>}
                {socialInstagram && <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>}
                {socialTwitter && <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>}
                {socialYoutube && <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>}
              </>
            )}
          </nav>
        </div>
        <div className="border-t border-white/20 mt-6 pt-4 text-center text-white/60 text-xs">
          © {new Date().getFullYear()} {companyName || blogName}. Todos os direitos reservados.
          {'  ·  '}
          <a href="/politica-de-privacidade" className="hover:text-white transition-colors underline">Política de Privacidade</a>
        </div>
      </div>
    </footer>
  )
}
