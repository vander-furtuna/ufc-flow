import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Raiz do monorepo: o build standalone precisa rastrear dependências a partir dela
const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  reactCompiler: true,
  // Pacotes internos exportam TypeScript direto
  transpilePackages: ['@ufc-flow/academic-core', '@ufc-flow/contracts'],
  allowedDevOrigins: ['192.168.18.*', '127.0.0.1'],
  // O log de server actions do dev mostra os argumentos, e as de login
  // recebem a senha
  logging: { serverFunctions: false },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
}

export default nextConfig
