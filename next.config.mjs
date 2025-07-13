// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['violet-fierce-impala-900.mypinata.cloud', 'ipfs.io'],
  },
};

export default nextConfig;
