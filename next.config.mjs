const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  experimental: { cpus: 2 },
};
export default nextConfig;
