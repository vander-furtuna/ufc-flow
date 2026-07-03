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
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      '@next/next/no-img-element': 'off',
    },
  },
]

export default eslintConfig
