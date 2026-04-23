import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getLinkedSheet: vi.fn(),
  getSheetColumns: vi.fn(),
  extractNamesFromColumn: vi.fn(),
  createScoreSheet: vi.fn(),
  linkSheet: vi.fn(),
  unlinkSheet: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import {
  linkedSheet,
  setupStep,
  setupError,
  importedColumns,
  previewNames,
  startCreateNew,
  selectImportFromSheet,
  selectManualEntry,
  submitSheetUrl,
  selectColumn,
  confirmNames,
  submitManualNames,
  goBack,
  resetSetup,
  initializeSheet,
} from './sheet'
import { studentRoster } from './students'
import {
  getLinkedSheet,
  getSheetColumns,
  extractNamesFromColumn,
  createScoreSheet,
  linkSheet,
  unlinkSheet,
  getStudentRoster,
} from '../lib/gas'

const mockGetLinkedSheet = vi.mocked(getLinkedSheet)
const mockGetSheetColumns = vi.mocked(getSheetColumns)
const mockExtractNames = vi.mocked(extractNamesFromColumn)
const mockCreateScoreSheet = vi.mocked(createScoreSheet)
const mockLinkSheet = vi.mocked(linkSheet)
const mockUnlinkSheet = vi.mocked(unlinkSheet)
const mockGetStudentRoster = vi.mocked(getStudentRoster)

describe('sheet state', () => {
  beforeEach(() => {
    linkedSheet.value = null
    setupStep.value = 'choose-method'
    setupError.value = null
    importedColumns.value = null
    previewNames.value = null
    studentRoster.value = []
    vi.clearAllMocks()
  })

  describe('setup flow transitions', () => {
    it('startCreateNew transitions to choose-students', () => {
      startCreateNew()
      expect(setupStep.value).toBe('choose-students')
    })

    it('selectImportFromSheet transitions to import-url', () => {
      startCreateNew()
      selectImportFromSheet()
      expect(setupStep.value).toBe('import-url')
    })

    it('selectManualEntry transitions to manual-entry', () => {
      startCreateNew()
      selectManualEntry()
      expect(setupStep.value).toBe('manual-entry')
    })

    it('goBack returns to previous step', () => {
      startCreateNew()
      selectImportFromSheet()
      expect(setupStep.value).toBe('import-url')
      goBack()
      expect(setupStep.value).toBe('choose-students')
      goBack()
      expect(setupStep.value).toBe('choose-method')
    })

    it('resetSetup clears all state', () => {
      startCreateNew()
      setupError.value = 'some error'
      importedColumns.value = [{ index: 0, header: 'Name', preview: ['a'] }]
      previewNames.value = ['Minh']
      resetSetup()
      expect(setupStep.value).toBe('choose-method')
      expect(setupError.value).toBeNull()
      expect(importedColumns.value).toBeNull()
      expect(previewNames.value).toBeNull()
    })
  })

  describe('submitSheetUrl', () => {
    it('rejects invalid URL', async () => {
      await submitSheetUrl('not-a-url')
      expect(setupError.value).toBe('Please paste a valid Google Sheets URL')
      expect(setupStep.value).toBe('choose-method')
    })

    it('loads columns on valid URL', async () => {
      const columns = [{ index: 0, header: 'Name', preview: ['Alice'] }]
      mockGetSheetColumns.mockResolvedValueOnce(columns)
      startCreateNew()
      selectImportFromSheet()
      await submitSheetUrl('https://docs.google.com/spreadsheets/d/abc123/edit')
      expect(importedColumns.value).toEqual(columns)
      expect(setupStep.value).toBe('import-columns')
    })

    it('shows error when sheet is empty', async () => {
      mockGetSheetColumns.mockResolvedValueOnce([])
      await submitSheetUrl('https://docs.google.com/spreadsheets/d/abc123/edit')
      expect(setupError.value).toBe('This Sheet appears to be empty')
    })

    it('shows error on access failure', async () => {
      mockGetSheetColumns.mockRejectedValueOnce(new Error("Can't access this Sheet"))
      await submitSheetUrl('https://docs.google.com/spreadsheets/d/abc123/edit')
      expect(setupError.value).toBe("Can't access this Sheet")
    })
  })

  describe('selectColumn', () => {
    it('extracts names and transitions to preview', async () => {
      mockExtractNames.mockResolvedValueOnce(['Minh', 'Trang'])
      await selectColumn(0)
      expect(previewNames.value).toEqual(['Minh', 'Trang'])
      expect(setupStep.value).toBe('import-preview')
    })

    it('shows error when no names found', async () => {
      mockExtractNames.mockResolvedValueOnce([])
      await selectColumn(0)
      expect(setupError.value).toBe('No names found in this column')
    })
  })

  describe('confirmNames', () => {
    it('creates sheet, links it, and sets roster', async () => {
      const sheetInfo = { id: 'new-id', name: 'IELTS Score Sheet', url: 'https://docs.google.com/spreadsheets/d/new-id' }
      mockCreateScoreSheet.mockResolvedValueOnce(sheetInfo)
      mockLinkSheet.mockResolvedValueOnce(undefined)

      await confirmNames(['Minh', 'Trang'])

      expect(mockCreateScoreSheet).toHaveBeenCalledWith(['Minh', 'Trang'])
      expect(mockLinkSheet).toHaveBeenCalledWith(sheetInfo.id, sheetInfo.name, sheetInfo.url)
      expect(linkedSheet.value).toEqual(sheetInfo)
      expect(studentRoster.value).toEqual(['Minh', 'Trang'])
      expect(setupStep.value).toBe('done')
    })

    it('reverts step on creation failure', async () => {
      startCreateNew()
      selectImportFromSheet()
      setupStep.value = 'import-preview'
      mockCreateScoreSheet.mockRejectedValueOnce(new Error('Quota exceeded'))

      await confirmNames(['Minh'])

      expect(setupError.value).toBe('Quota exceeded')
      expect(setupStep.value).toBe('import-preview')
    })
  })

  describe('submitManualNames', () => {
    it('parses comma-separated names', () => {
      submitManualNames('Minh, Trang, Anh')
      expect(previewNames.value).toEqual(['Minh', 'Trang', 'Anh'])
      expect(setupStep.value).toBe('import-preview')
    })

    it('parses newline-separated names', () => {
      submitManualNames('Minh\nTrang\nAnh')
      expect(previewNames.value).toEqual(['Minh', 'Trang', 'Anh'])
    })

    it('deduplicates case-insensitively', () => {
      submitManualNames('Minh, minh, MINH')
      expect(previewNames.value).toEqual(['Minh'])
    })

    it('filters empty entries', () => {
      submitManualNames('Minh, , , Trang')
      expect(previewNames.value).toEqual(['Minh', 'Trang'])
    })

    it('errors on empty input', () => {
      submitManualNames('  ,  , ')
      expect(setupError.value).toBe('Please enter at least one student name')
    })

    it('errors when exceeding 200 names', () => {
      const names = Array.from({ length: 201 }, (_, i) => `Student${i}`)
      submitManualNames(names.join('\n'))
      expect(setupError.value).toBe('Maximum 200 students allowed')
    })
  })

  describe('initializeSheet', () => {
    it('sets linkedSheet when sheet exists and roster loads', async () => {
      const sheet = { id: 'abc', name: 'My Sheet', url: 'https://docs.google.com/spreadsheets/d/abc' }
      mockGetLinkedSheet.mockResolvedValueOnce(sheet)
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang'])

      await initializeSheet()

      expect(linkedSheet.value).toEqual(sheet)
      expect(studentRoster.value).toEqual(['Minh', 'Trang'])
    })

    it('sets linkedSheet to null when no sheet linked', async () => {
      mockGetLinkedSheet.mockResolvedValueOnce(null)
      await initializeSheet()
      expect(linkedSheet.value).toBeNull()
    })

    it('unlinks and resets when roster load fails (sheet deleted)', async () => {
      const sheet = { id: 'abc', name: 'My Sheet', url: 'https://docs.google.com/spreadsheets/d/abc' }
      mockGetLinkedSheet.mockResolvedValueOnce(sheet)
      mockGetStudentRoster.mockRejectedValueOnce(new Error('Score Sheet is no longer accessible'))
      mockUnlinkSheet.mockResolvedValueOnce(undefined)

      await initializeSheet()

      expect(mockUnlinkSheet).toHaveBeenCalledOnce()
      expect(linkedSheet.value).toBeNull()
    })

    it('keeps linked sheet on transient error and shows retry message', async () => {
      const sheet = { id: 'abc', name: 'My Sheet', url: 'https://docs.google.com/spreadsheets/d/abc' }
      mockGetLinkedSheet.mockResolvedValueOnce(sheet)
      mockGetStudentRoster.mockRejectedValueOnce(new Error('Network timeout'))

      await initializeSheet()

      expect(mockUnlinkSheet).not.toHaveBeenCalled()
      expect(linkedSheet.value).toEqual(sheet)
      expect(setupError.value).toBe('Could not load students — please reopen the sidebar to retry')
    })

    it('handles getLinkedSheet failure gracefully', async () => {
      mockGetLinkedSheet.mockRejectedValueOnce(new Error('Failed'))
      await initializeSheet()
      expect(linkedSheet.value).toBeNull()
    })
  })
})
