/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false,
      },
      {
        source: "/hytek",
        destination: "/hytek/admin/dashboard",
        permanent: false,
      },
      {
        source: "/hytek/login",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
