'use client'

import { passwordStrength } from '@/lib/password'

const LABELS = ['', 'Very weak', 'Weak', 'Good', 'Strong']
const COLOURS = ['bg-carbon', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-gold']

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const score = passwordStrength(password)
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 transition-colors ${i <= score ? COLOURS[score] : 'bg-carbon'}`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-stone mt-1">
          {LABELS[score]}
        </p>
      )}
    </div>
  )
}
