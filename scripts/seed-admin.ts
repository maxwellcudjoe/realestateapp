import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'
import bcrypt from 'bcryptjs'

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
    server,
    port: parseInt(port, 10),
    database: parts.database,
    user: parts.user,
    password: parts.password,
    options: {
      encrypt: parts.encrypt === 'true',
      trustServerCertificate: parts.trustServerCertificate === 'true',
    },
  }
}

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password>')
    process.exit(1)
  }

  const config = parseDatabaseUrl(process.env.DATABASE_URL!)
  const adapter = new PrismaMssql(config)
  const prisma = new PrismaClient({ adapter })

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.log(`User ${email} already exists (role: ${existing.role})`)
      if (existing.role !== 'admin') {
        await prisma.user.update({ where: { email }, data: { role: 'admin' } })
        console.log(`Updated role to admin`)
      }
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: { email, passwordHash, role: 'admin' },
    })
    console.log(`Admin user created: ${email}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
