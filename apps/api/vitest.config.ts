import { defineConfig } from 'vitest/config'

// Dois projetos: "unit" roda sem Docker (domínio e casos de uso, com
// repositórios em memória); "integration" sobe um PostgreSQL com
// Testcontainers (repositórios Drizzle e e2e com supertest).
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'test/**/*.e2e.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 180_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/domain/**/*.ts',
        'src/modules/*/domain/**/*.ts',
        'src/modules/*/application/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/testing/**', '**/ports.ts'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
})
