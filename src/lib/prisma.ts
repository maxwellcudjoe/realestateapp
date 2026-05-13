import { PrismaClient } from '@/generated/prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

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

function createPrismaClient() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL!)
  const adapter = new PrismaMssql(config)
  return new PrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
