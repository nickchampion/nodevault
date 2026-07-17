import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // monorepo: allow importing @platform/* sources from outside the app directory
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    externalDir: true,
  },

  // shared components use `.js` extensions in relative imports (module: preserve) —
  // map them back to their TypeScript sources when bundling
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    }

    return config
  },
}

export default nextConfig
