const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.BASE_PATH ?? (isProd ? '/nova-classic' : '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isProd ? { output: 'export' } : {}),
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
