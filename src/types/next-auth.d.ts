import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
  }
  interface Session {
    user: {
      id: string
      role: string
      /**
       * Set when the current request is running inside an admin impersonation.
       * The value is the admin's user id. Mutation endpoints under /api/* are
       * blocked by middleware while this is set.
       */
      impersonator?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
