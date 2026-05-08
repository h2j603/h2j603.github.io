/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/archive',
        destination: '/archive/index.html',
      },
      {
        source: '/archive/',
        destination: '/archive/index.html',
      },
    ];
  },
};

module.exports = nextConfig;
