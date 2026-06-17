/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['css-tree'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Art. 46/47 LGPD — medidas técnicas de segurança
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // CSP permissiva o suficiente para TipTap (editor rico), imagens remotas
            // autorizadas (imgur, cloudinary, unsplash, supabase) e Resend (pixel de tracking)
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (necessário para TipTap/Next.js hydration)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Estilos: self + inline (TipTap injeta estilos inline)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fontes: Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Imagens: self + data URIs + todos os domínios autorizados
              "img-src 'self' data: blob: https://i.imgur.com https://*.cloudinary.com https://images.unsplash.com https://*.supabase.co",
              // Conexões: self + Supabase + OpenRouter
              "connect-src 'self' https://*.supabase.co https://openrouter.ai https://api.resend.com",
              // Frames: nenhum
              "frame-ancestors 'none'",
              // Formulários: apenas self
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
