/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // nodejieba is a native module; exclude it from webpack bundling
  // so it loads directly from node_modules at runtime
  experimental: {
    serverComponentsExternalPackages: ["nodejieba"],
  },
  // 避免 dev 下 webpack 持久缓存与 build 产物混用导致 MODULE_NOT_FOUND
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false;
    }
    // Treat .node files as external assets for native modules
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("nodejieba");
    }
    return config;
  },
};

export default nextConfig;
