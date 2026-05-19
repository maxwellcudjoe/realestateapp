import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { cookies } from 'next/headers'
import { authConfig } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { isIpLockedOut, recordLoginAttempt } from '@/lib/login-tracking'
import { getClientIp } from '@/lib/rate-limit'
import { verifyTotpCode, findMatchingRecoveryCode } from '@/lib/totp'
import { IMPERSONATE_COOKIE, verifyImpersonateCookie } from '@/lib/impersonate'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Audit PR #4 (H1) — re-validate that the user is still active on every
    // server-side `auth()` call. Without this, a deleted user's JWT keeps
    // working until natural expiry; sensitive routes would still execute on
    // behalf of an erased account. Middleware uses authConfig directly (edge
    // runtime) so it can't do this check — but every Node API route + page
    // calls auth() server-side, which now goes through here.
    //
    // Returning a session without `user` is the documented signal for "no
    // session" — downstream `if (!session?.user) return 401` checks short
    // out the request.
    async session(args) {
      const baseSession = (authConfig.callbacks?.session
        ? await authConfig.callbacks.session(args)
        : args.session) as typeof args.session

      const tokenId = (args.token as { id?: string })?.id
      if (!tokenId) return baseSession

      const dbUser = await prisma.user.findUnique({
        where: { id: tokenId },
        select: { deletedAt: true, role: true },
      })
      if (!dbUser || dbUser.deletedAt) {
        // Strip user fields — every authenticated route checks `session?.user?.id`
        return { ...baseSession, user: undefined as unknown as typeof baseSession.user }
      }

      // PR I — admin impersonation overlay. If the actor is an admin AND the
      // signed impersonate cookie is present + valid + unexpired, overlay the
      // session to appear as the target user, with `impersonator` set to the
      // admin's id. Middleware blocks all /api/* mutations while this is set.
      if (dbUser.role === 'admin' && baseSession.user) {
        try {
          const secret = process.env.NEXTAUTH_SECRET
          if (secret) {
            const cookieValue = cookies().get(IMPERSONATE_COOKIE)?.value
            const payload = await verifyImpersonateCookie(secret, cookieValue)
            if (payload && payload.adminId === tokenId) {
              const target = await prisma.user.findUnique({
                where: { id: payload.targetUserId },
                select: { id: true, email: true, role: true, deletedAt: true },
              })
              if (target && target.role !== 'admin' && !target.deletedAt) {
                return {
                  ...baseSession,
                  user: {
                    ...baseSession.user,
                    id: target.id,
                    email: target.email,
                    role: target.role,
                    impersonator: payload.adminId,
                    impersonationMode: payload.mode,
                  },
                }
              }
            }
          }
        } catch (e) {
          console.error('[impersonate] session overlay failed (non-fatal):', e)
        }
      }

      return baseSession
    },
  },
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

        const user = await prisma.user.findUnique({
          where: { email },
          include: { recoveryCodes: { where: { usedAt: null } } },
        })
        if (!user) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, reason: 'no-user' })
          return null
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'bad-password' })
          return null
        }

        if (user.deletedAt) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'deleted' })
          return null
        }

        // Gate sign-in on verified email. Admin role is always allowed —
        // admins are seeded server-side and never go through the wizard.
        if (!user.emailVerifiedAt && user.role !== 'admin') {
          await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'unverified' })
          return null
        }

        // TOTP gate — only enforced if user has enabled 2FA
        if (user.totpEnabledAt && user.totpSecret) {
          const code = parsed.data.totpCode?.trim() ?? ''
          if (!code) {
            await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'totp-required' })
            return null
          }
          const totpOk = await verifyTotpCode(user.totpSecret, code)
          if (!totpOk) {
            const recoveryId = await findMatchingRecoveryCode(code, user.recoveryCodes)
            if (!recoveryId) {
              await recordLoginAttempt({ email, ipAddress: ip, success: false, userId: user.id, reason: 'bad-totp' })
              return null
            }
            // Recovery code used — burn it
            await prisma.recoveryCode.update({ where: { id: recoveryId }, data: { usedAt: new Date() } })
            await recordLoginAttempt({ email, ipAddress: ip, success: true, userId: user.id, reason: 'recovery-code' })
            return { id: user.id, email: user.email, role: user.role }
          }
        }

        await recordLoginAttempt({ email, ipAddress: ip, success: true, userId: user.id })
        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
})
