export interface EntitlementResult {
  entitled: boolean
  remaining: number
}

export async function checkEntitlement(_teacherId: string): Promise<EntitlementResult> {
  // Phase 1 stub — always entitled. Phase 2 will enforce limits.
  return { entitled: true, remaining: Infinity }
}
