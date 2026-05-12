import { PrismaClient } from '@/generated/prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaMssql(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
