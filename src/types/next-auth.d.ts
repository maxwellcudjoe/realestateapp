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
       * The value is the admin's user id. In read-mode (default) mutations
       * are blocked by middleware. In write-mode mutations go through but
       * every AuditEvent records `impersonator` in metadata.
       */
      impersonator?: string
      /**
       * Mode of the active impersonation session (only set when `impersonator`
       * is also set). Drives the banner copy and the middleware write-gate.
       */
      impersonationMode?: 'read' | 'write'
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
