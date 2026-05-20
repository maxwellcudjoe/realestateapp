/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output File Tracing — ships only the dependencies actually used into
  // .next/standalone, instead of the full node_modules. Required to stay under
  // the Azure Static Web Apps 250 MB hybrid-Next.js managed-functions limit.
  // The build script copies .next/static + public into the standalone folder.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/adapter-mssql', 'bcryptjs'],
  },
}

export default nextConfig
