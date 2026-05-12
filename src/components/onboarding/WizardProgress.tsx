const STEPS = ['Account', 'Personal', 'Criteria', 'Review']

export function WizardProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-12">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`
              w-8 h-8 flex items-center justify-center border text-xs font-semibold
              ${i < current ? 'bg-gold border-gold text-obsidian' : ''}
              ${i === current ? 'border-gold text-gold' : ''}
              ${i > current ? 'border-carbon text-stone' : ''}
            `}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`font-sans text-[0.6rem] uppercase tracking-widest hidden sm:inline ${
              i <= current ? 'text-ivory' : 'text-stone'
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < current ? 'bg-gold' : 'bg-carbon'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
