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
  serverExternalPackages: ['css-tree'],
  outputFileTracingIncludes: {
    '/api/admin/db-migrate': ['./drizzle/migrations/**/*'],
    '/admin': ['./drizzle/migrations/**/*'],
  },
}

module.exports = nextConfig
