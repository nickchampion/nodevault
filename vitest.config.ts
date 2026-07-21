import path from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@platform/components.api': path.resolve('./components/api/index.ts'),
  '@platform/components.cache': path.resolve('./components/cache/index.ts'),
  '@platform/components.configuration': path.resolve('./components/configuration/index.ts'),
  '@platform/components.configuration.server': path.resolve('./components/configuration/server.ts'),
  '@platform/components.context': path.resolve('./components/context/index.ts'),
  '@platform/components.nodevault.contracts': path.resolve('./components/nodevault/contracts/index.ts'),
  '@platform/components.nodevault.domain': path.resolve('./components/nodevault/domain/index.ts'),
  '@platform/components.postgres': path.resolve('./components/postgres/index.ts'),
  '@platform/components.utils': path.resolve('./components/utils/index.ts'),
  '@platform/components.utils.server': path.resolve('./components/utils-server/index.ts'),
  '@platform/integrations.gemini': path.resolve('./integrations/gemini/index.ts'),
  '@platform/integrations.resend': path.resolve('./integrations/resend/index.ts'),
  '@platform/integrations.vertexsearch': path.resolve('./integrations/vertexsearch/index.ts'),
}

export default defineConfig({
  test: {
    globals: true,
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['**/*.spec.ts'],
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.next/**', '**/.open-next/**'],
    projects: [
      {
        resolve: { alias },
        test: {
          name: { label: 'components', color: 'green' },
          include: ['components/**/*.spec.ts'],
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'api', color: 'blue' },
          include: ['apps/api/**/*.spec.ts'],
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'integrations', color: 'yellow' },
          include: ['integrations/**/*.spec.ts'],
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'utils', color: 'cyan' },
          include: ['.platform/utils/**/*.spec.ts'],
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'nodevault', color: 'magenta' },
          include: ['apps/nodevault/**/*.spec.ts'],
          globals: true,
          environment: 'happy-dom',
        },
      },
    ],
  },
})
