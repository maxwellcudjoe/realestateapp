import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  providers: [], // Providers added in auth.ts (keeps this file edge-safe)
} satisfies NextAuthConfig
