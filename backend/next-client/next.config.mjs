/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5005/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5005/uploads/:path*',
      },
    ];
  },
  // Suppress hydration warnings during migration
  reactStrictMode: false,
};

export default nextConfig;
