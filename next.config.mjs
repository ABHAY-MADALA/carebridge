/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A stray lockfile in the home directory otherwise makes Next pick the wrong
  // project root and warn on every start.
  outputFileTracingRoot: import.meta.dirname,
  webpack(config) {
    config.module.rules.push({
      test: /@react-three[\\/]fiber[\\/]dist[\\/]events-.*\.js$/,
      use: [{ loader: `${import.meta.dirname}/scripts/fiber-timer-loader.cjs` }],
    });
    return config;
  },
};

export default nextConfig;
