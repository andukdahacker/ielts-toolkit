import { signal } from '@preact/signals'

type SheetSetupStatus = 'idle' | 'loading' | 'done' | 'error'

export const linkedSheet = signal<{ id: string; name: string } | null>(null)
export const sheetSetupStatus = signal<SheetSetupStatus>('idle')
