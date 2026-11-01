import { runMigrations } from '../database/migrate'

// pnpm --filter @ufc-flow/api db:migrate
const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL (veja apps/api/.env.example)')
await runMigrations(url)
console.log('Migrations aplicadas')
