export interface MatchedLead {
  id: string
  email: string
}

export interface LeadLookup {
  findOldestUnconvertedLeadByEmail(email: string): Promise<MatchedLead | null>
}

export async function findLeadForEmail(email: string, lookup: LeadLookup): Promise<MatchedLead | null> {
  if (!email) return null
  const normalised = String(email).trim().toLowerCase()
  if (!normalised) return null
  return lookup.findOldestUnconvertedLeadByEmail(normalised)
}
