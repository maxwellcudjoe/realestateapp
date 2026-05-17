import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { isIpLockedOut, recordLoginAttempt } from '@/lib/login-tracking'
import { getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const ip = request instanceof Request ? getClientIp(request) : 'unknown'
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase().trim()

        // Lockout check — return null silently to avoid IP enumeration via timing.
        if (await isIpLockedOut(ip)) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, reason: 'locked-out' })
          return null
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, reason: 'no-user' })
          return null
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'bad-password' })
          return null
        }

        // Gate sign-in on verified email. Admin role is always allowed —
        // admins are seeded server-side and never go through the wizard.
        if (!user.emailVerifiedAt && user.role !== 'admin') {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'unverified' })
          return null
        }

        await recordLoginAttempt({ email, ipAddress: ip, success: true, userId: user.id })
        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
})
