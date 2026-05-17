// One-shot backfill: grandfather all existing users as email-verified so the
// new verify-before-sign-in gate doesn't lock anyone out on deployment.
// Run once after the schema migration: `npx tsx scripts/backfill-email-verified.ts`
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'

function parseDatabaseUrl(url: string) {
  const match = url.match(/^sqlserver:\/\/([^:]+):(\d+);(.+)$/)
  if (!match) throw new Error('Invalid DATABASE_URL format')
  const [, server, port, params] = match
  const parts: Record<string, string> = {}
  for (const pair of params.split(';')) {
    const [k, v] = pair.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }
  return {
    server, port: parseInt(port, 10), database: parts.database,
    user: parts.user, password: parts.password,
    options: { encrypt: parts.encrypt === 'true', trustServerCertificate: parts.trustServerCertificate === 'true' },
  }
}

const config = parseDatabaseUrl(process.env.DATABASE_URL!)
const adapter = new PrismaMssql(config)
const prisma = new PrismaClient({ adapter })

async function main() {
  const result = await prisma.user.updateMany({
    where: { emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  })
  console.log(`Backfilled ${result.count} existing users as email-verified.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
