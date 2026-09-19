/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A stray lockfile in the home directory otherwise makes Next pick the wrong
  // project root and warn on every start.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
