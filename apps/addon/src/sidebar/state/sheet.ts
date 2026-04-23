import { signal } from '@preact/signals'
import {
  getLinkedSheet as gasGetLinkedSheet,
  getSheetColumns as gasGetSheetColumns,
  extractNamesFromColumn as gasExtractNames,
  createScoreSheet as gasCreateScoreSheet,
  linkSheet as gasLinkSheet,
  unlinkSheet as gasUnlinkSheet,
} from '../lib/gas'
import { studentRoster, loadRoster } from './students'

export type SetupStep =
  | 'choose-method'
  | 'choose-students'
  | 'import-url'
  | 'import-columns'
  | 'import-preview'
  | 'manual-entry'
  | 'creating'
  | 'done'

export const linkedSheet = signal<{ id: string; name: string; url: string } | null>(null)
export const setupStep = signal<SetupStep>('choose-method')
export const setupError = signal<string | null>(null)
export const importedColumns = signal<ColumnPreview[] | null>(null)
export const previewNames = signal<string[] | null>(null)
export const importSheetUrl = signal<string>('')
export const asyncBusy = signal<boolean>(false)

const stepHistory: SetupStep[] = []

export function startCreateNew(): void {
  stepHistory.push(setupStep.value)
  setupError.value = null
  setupStep.value = 'choose-students'
}

export function startLinkExisting(): void {
  // Disabled — Story 1.4
}

export function selectImportFromSheet(): void {
  stepHistory.push(setupStep.value)
  setupError.value = null
  setupStep.value = 'import-url'
}

export function selectManualEntry(): void {
  stepHistory.push(setupStep.value)
  setupError.value = null
  setupStep.value = 'manual-entry'
}

export async function submitSheetUrl(url: string): Promise<void> {
  if (asyncBusy.value) return
  setupError.value = null
  const sheetUrlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/
  if (!sheetUrlPattern.test(url)) {
    setupError.value = 'Please paste a valid Google Sheets URL'
    return
  }

  asyncBusy.value = true
  try {
    importSheetUrl.value = url
    const columns = await gasGetSheetColumns(url)
    if (columns.length === 0) {
      setupError.value = 'This Sheet appears to be empty'
      return
    }
    importedColumns.value = columns
    stepHistory.push(setupStep.value)
    setupStep.value = 'import-columns'
  } catch (err) {
    setupError.value = err instanceof Error ? err.message : 'Failed to load Sheet'
  } finally {
    asyncBusy.value = false
  }
}

export async function selectColumn(index: number): Promise<void> {
  if (asyncBusy.value) return
  setupError.value = null
  asyncBusy.value = true
  try {
    const names = await gasExtractNames(importSheetUrl.value, index)
    if (names.length === 0) {
      setupError.value = 'No names found in this column'
      return
    }
    previewNames.value = names
    stepHistory.push(setupStep.value)
    setupStep.value = 'import-preview'
  } catch (err) {
    setupError.value = err instanceof Error ? err.message : 'Failed to extract names'
  } finally {
    asyncBusy.value = false
  }
}

export async function confirmNames(names: string[]): Promise<void> {
  if (asyncBusy.value) return
  setupError.value = null
  const previousStep = setupStep.value
  setupStep.value = 'creating'
  asyncBusy.value = true

  try {
    const sheetInfo = await gasCreateScoreSheet(names)
    await gasLinkSheet(sheetInfo.id, sheetInfo.name, sheetInfo.url)
    linkedSheet.value = sheetInfo
    studentRoster.value = names
    stepHistory.push(previousStep)
    setupStep.value = 'done'
  } catch (err) {
    setupStep.value = previousStep
    setupError.value = err instanceof Error ? err.message : 'Failed to create Score Sheet'
  } finally {
    asyncBusy.value = false
  }
}

export function submitManualNames(text: string): void {
  setupError.value = null

  const parts = text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Deduplicate case-insensitive, keep first occurrence
  const seen = new Set<string>()
  const unique: string[] = []
  for (const name of parts) {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(name)
    }
  }

  if (unique.length === 0) {
    setupError.value = 'Please enter at least one student name'
    return
  }
  if (unique.length > 200) {
    setupError.value = 'Maximum 200 students allowed'
    return
  }

  previewNames.value = unique
  stepHistory.push(setupStep.value)
  setupStep.value = 'import-preview'
}

export function goBack(): void {
  setupError.value = null
  const prev = stepHistory.pop()
  if (prev) {
    setupStep.value = prev
  }
}

export function resetSetup(): void {
  setupStep.value = 'choose-method'
  setupError.value = null
  importedColumns.value = null
  previewNames.value = null
  importSheetUrl.value = ''
  asyncBusy.value = false
  stepHistory.length = 0
}

export async function initializeSheet(): Promise<void> {
  try {
    const sheet = await gasGetLinkedSheet()
    if (!sheet) {
      linkedSheet.value = null
      return
    }

    linkedSheet.value = sheet
    try {
      await loadRoster()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const isPermanent = message.includes('no longer accessible') || message.includes('No Score Sheet')
      if (isPermanent) {
        await gasUnlinkSheet()
        linkedSheet.value = null
      } else {
        // Transient error — keep linked sheet, surface error to user
        setupError.value = 'Could not load students — please reopen the sidebar to retry'
      }
    }
  } catch {
    linkedSheet.value = null
  }
}
