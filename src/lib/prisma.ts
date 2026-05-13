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
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const config = parseDatabaseUrl(url)
  const adapter = new PrismaMssql(config)
  return new PrismaClient({ adapter })
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
