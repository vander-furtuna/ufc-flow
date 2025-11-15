import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import eslintPrettierConfig from 'eslint-plugin-prettier/recommended'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintPrettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
]

export default eslintConfig
