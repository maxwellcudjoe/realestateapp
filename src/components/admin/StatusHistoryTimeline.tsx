interface HistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  changedByEmail: string | null
  createdAt: string
}

interface Props {
  history: HistoryEntry[]
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DOCUMENTS_REQUESTED: 'Documents Requested',
  DOCUMENTS_RECEIVED: 'Documents Received',
  KYC_APPROVED: 'KYC Approved',
  ACTIVE_INVESTOR: 'Active Investor',
  DEAL_SENT: 'Deal Sent',
}

function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s.replace(/_/g, ' ')
}

export function StatusHistoryTimeline({ history }: Props) {
  if (history.length === 0) {
    return <p className="font-sans text-xs text-stone">No status changes recorded yet.</p>
  }

  return (
    <div className="space-y-3">
      {[...history].reverse().map((entry) => (
        <div
          key={entry.id}
          className={`pl-4 border-l-2 ${entry.note ? 'border-gold/40' : 'border-carbon'}`}
        >
          <p className="font-sans text-xs text-ivory">
            {entry.fromStatus ? (
              <>
                <span className="text-stone">{statusLabel(entry.fromStatus)}</span>
                <span className="text-stone mx-1">→</span>
              </>
            ) : null}
            <span className="text-gold">{statusLabel(entry.toStatus)}</span>
          </p>
          {entry.note && (
            <div className="mt-2 py-2 px-3 bg-gold/5 border-l-2 border-gold/60">
              <p className="font-sans text-xs text-ivory/90 italic leading-relaxed">
                &ldquo;{entry.note}&rdquo;
              </p>
            </div>
          )}
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 mt-2">
            {new Date(entry.createdAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {entry.changedByEmail && (
              <span className="normal-case tracking-normal text-stone ml-2">· {entry.changedByEmail}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
