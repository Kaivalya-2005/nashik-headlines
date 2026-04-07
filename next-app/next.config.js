/** @type {import('next').NextConfig} */
const adminPanelUrl = (process.env.ADMIN_PANEL_URL || 'http://localhost:5173').replace(/\/$/, '');

const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost', port: '5000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '5000' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: `${adminPanelUrl}/admin`,
      },
      {
        source: '/admin/:path*',
        destination: `${adminPanelUrl}/admin/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
