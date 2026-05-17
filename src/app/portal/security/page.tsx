import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { recentAttemptsForUser } from '@/lib/login-tracking'

export const dynamic = 'force-dynamic'

const REASON_LABEL: Record<string, string> = {
  'no-user': 'Unknown account',
  'bad-password': 'Wrong password',
  'unverified': 'Email not verified',
  'locked-out': 'IP temporarily locked',
}

function formatDate(d: Date) {
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function PortalSecurityPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const attempts = await recentAttemptsForUser(session.user.id, 10)

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Security</h1>
      <p className="font-sans text-sm text-stone mb-12">
        Recent sign-in activity for your account. Spot something you don&apos;t recognise?{' '}
        <a href="/forgot-password" className="text-gold hover:text-ivory transition-colors">
          Reset your password
        </a>.
      </p>

      <section>
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">
          Recent Sign-In Activity
        </p>
        {attempts.length === 0 ? (
          <p className="font-sans text-sm text-stone">No sign-in attempts recorded yet.</p>
        ) : (
          <div className="border border-carbon">
            <table className="w-full">
              <thead>
                <tr className="border-b border-carbon">
                  <th className="text-left font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 p-4">When</th>
                  <th className="text-left font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 p-4">IP</th>
                  <th className="text-left font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 p-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-carbon last:border-b-0">
                    <td className="font-sans text-xs text-ivory p-4">{formatDate(a.createdAt)}</td>
                    <td className="font-sans text-xs text-stone p-4">{a.ipAddress}</td>
                    <td className="p-4">
                      {a.success ? (
                        <span className="font-sans text-xs text-gold">Successful sign-in</span>
                      ) : (
                        <span className="font-sans text-xs text-stone">
                          Failed — {REASON_LABEL[a.reason ?? ''] ?? 'unknown'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
