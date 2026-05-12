const ALL_STAGES = [
  { key: 'SUBMITTED', label: 'Application Submitted', desc: 'Your application has been received.' },
  { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'Our team is reviewing your profile.' },
  { key: 'DOCUMENTS_REQUESTED', label: 'Documents Requested', desc: 'Please upload your KYC documents.' },
  { key: 'DOCUMENTS_RECEIVED', label: 'Documents Received', desc: 'We are reviewing your documents.' },
  { key: 'KYC_APPROVED', label: 'KYC Approved', desc: 'Your identity has been verified.' },
  { key: 'ACTIVE_INVESTOR', label: 'Active Investor', desc: 'Your profile is live. Deals incoming.' },
  { key: 'DEAL_SENT', label: 'Deal Sent', desc: 'A deal matching your criteria has been sent.' },
]

interface HistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
}

interface Props {
  currentStatus: string
  history: HistoryEntry[]
}

export function StatusTimeline({ currentStatus, history }: Props) {
  const currentIndex = ALL_STAGES.findIndex((s) => s.key === currentStatus)

  const dateForStatus = (statusKey: string): string | null => {
    const entry = history.find((h) => h.toStatus === statusKey)
    if (!entry) return null
    return new Date(entry.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="space-y-0">
      {ALL_STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={stage.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  isCompleted ? 'bg-gold border-gold' :
                  isCurrent ? 'border-gold bg-obsidian' :
                  'border-carbon bg-obsidian'
                }`}
              />
              {i < ALL_STAGES.length - 1 && (
                <div className={`w-px h-12 ${isCompleted ? 'bg-gold' : 'bg-carbon'}`} />
              )}
            </div>

            <div className="pb-8 -mt-0.5">
              <p className={`font-sans text-sm font-medium ${isCurrent ? 'text-gold' : isCompleted ? 'text-ivory' : 'text-stone'}`}>
                {stage.label}
              </p>
              {(isCompleted || isCurrent) && (
                <p className="font-sans text-xs text-stone mt-1">{stage.desc}</p>
              )}
              {dateForStatus(stage.key) && (
                <p className="font-sans text-[0.6rem] uppercase tracking-widest text-stone mt-1">
                  {dateForStatus(stage.key)}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {history.length > 0 && (
        <div className="border-t border-carbon pt-8 mt-4">
          <h3 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Activity Log</h3>
          <div className="space-y-3">
            {[...history].reverse().map((entry) => (
              <div key={entry.id} className="border-l-2 border-carbon pl-4">
                <p className="font-sans text-xs text-stone">
                  Status changed to <span className="text-ivory">{entry.toStatus.replace(/_/g, ' ')}</span>
                </p>
                {entry.note && (
                  <p className="font-sans text-xs text-stone italic mt-1">&ldquo;{entry.note}&rdquo;</p>
                )}
                <p className="font-sans text-[0.55rem] text-[#555] mt-1">
                  {new Date(entry.createdAt).toLocaleString('en-GB')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
