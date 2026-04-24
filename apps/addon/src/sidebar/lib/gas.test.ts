import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkBackendHealth,
  getSheetColumns,
  extractNamesFromColumn,
  createScoreSheet,
  getLinkedSheet,
  linkSheet,
  unlinkSheet,
  getStudentRoster,
  addStudentToRoster,
  getSheetMeta,
} from './gas'

function createMockRun() {
  const mockRun: Record<string, ReturnType<typeof vi.fn>> = {
    withSuccessHandler: vi.fn().mockReturnThis(),
    withFailureHandler: vi.fn().mockReturnThis(),
    checkBackendHealth: vi.fn(),
    getSheetColumns: vi.fn(),
    extractNamesFromColumn: vi.fn(),
    createScoreSheet: vi.fn(),
    getLinkedSheet: vi.fn(),
    linkSheet: vi.fn(),
    unlinkSheet: vi.fn(),
    getStudentRoster: vi.fn(),
    addStudentToRoster: vi.fn(),
    getSheetMeta: vi.fn(),
  }
  ;(globalThis as any).google = { script: { run: mockRun } }
  return mockRun
}

function simulateSuccess(mockRun: Record<string, ReturnType<typeof vi.fn>>, fnName: string, result: unknown) {
  mockRun[fnName].mockImplementation(() => {
    const handler = mockRun.withSuccessHandler.mock.calls.at(-1)![0]
    handler(result)
  })
}

function simulateFailure(mockRun: Record<string, ReturnType<typeof vi.fn>>, fnName: string, error: Error) {
  mockRun[fnName].mockImplementation(() => {
    const handler = mockRun.withFailureHandler.mock.calls.at(-1)![0]
    handler(error)
  })
}

describe('gas.ts promise wrapper', () => {
  let mockRun: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockRun = createMockRun()
  })

  it('checkBackendHealth resolves on success', async () => {
    simulateSuccess(mockRun, 'checkBackendHealth', { data: { status: 'ok' } })
    const result = await checkBackendHealth()
    expect(result).toEqual({ data: { status: 'ok' } })
  })

  it('checkBackendHealth rejects on failure', async () => {
    simulateFailure(mockRun, 'checkBackendHealth', new Error('Server error'))
    await expect(checkBackendHealth()).rejects.toThrow('Server error')
  })

  it('wires up handlers in correct order', async () => {
    simulateSuccess(mockRun, 'checkBackendHealth', { data: { status: 'ok' } })
    await checkBackendHealth()
    expect(mockRun.withSuccessHandler).toHaveBeenCalledOnce()
    expect(mockRun.withFailureHandler).toHaveBeenCalledOnce()
    expect(mockRun.checkBackendHealth).toHaveBeenCalledOnce()
  })

  it('getSheetColumns resolves with column data', async () => {
    const columns = [{ index: 0, header: 'Name', preview: ['Alice', 'Bob'] }]
    simulateSuccess(mockRun, 'getSheetColumns', columns)
    const result = await getSheetColumns('https://docs.google.com/spreadsheets/d/abc123/edit')
    expect(result).toEqual(columns)
  })

  it('getSheetColumns rejects on access error', async () => {
    simulateFailure(mockRun, 'getSheetColumns', new Error("Can't access this Sheet"))
    await expect(getSheetColumns('https://docs.google.com/spreadsheets/d/abc/edit')).rejects.toThrow("Can't access")
  })

  it('extractNamesFromColumn resolves with names', async () => {
    const names = ['Minh', 'Trang', 'Anh']
    simulateSuccess(mockRun, 'extractNamesFromColumn', names)
    const result = await extractNamesFromColumn('https://docs.google.com/spreadsheets/d/abc/edit', 0)
    expect(result).toEqual(names)
  })

  it('createScoreSheet resolves with sheet info', async () => {
    const info = { id: 'new-id', name: 'IELTS Score Sheet', url: 'https://docs.google.com/spreadsheets/d/new-id' }
    simulateSuccess(mockRun, 'createScoreSheet', info)
    const result = await createScoreSheet(['Minh', 'Trang'])
    expect(result).toEqual(info)
  })

  it('getLinkedSheet resolves with sheet info', async () => {
    const info = { id: 'linked-id', name: 'My Sheet', url: 'https://docs.google.com/spreadsheets/d/linked-id' }
    simulateSuccess(mockRun, 'getLinkedSheet', info)
    const result = await getLinkedSheet()
    expect(result).toEqual(info)
  })

  it('getLinkedSheet resolves with null when no sheet linked', async () => {
    simulateSuccess(mockRun, 'getLinkedSheet', null)
    const result = await getLinkedSheet()
    expect(result).toBeNull()
  })

  it('linkSheet resolves on success', async () => {
    simulateSuccess(mockRun, 'linkSheet', undefined)
    await expect(linkSheet('id', 'name', 'url', 0)).resolves.toBeUndefined()
  })

  it('unlinkSheet resolves on success', async () => {
    simulateSuccess(mockRun, 'unlinkSheet', undefined)
    await expect(unlinkSheet()).resolves.toBeUndefined()
  })

  it('getStudentRoster resolves with names', async () => {
    const names = ['Minh', 'Trang', 'Anh']
    simulateSuccess(mockRun, 'getStudentRoster', names)
    const result = await getStudentRoster()
    expect(result).toEqual(names)
  })

  it('getStudentRoster rejects when sheet inaccessible', async () => {
    simulateFailure(mockRun, 'getStudentRoster', new Error('Score Sheet is no longer accessible'))
    await expect(getStudentRoster()).rejects.toThrow('no longer accessible')
  })

  it('addStudentToRoster resolves with updated roster', async () => {
    const updatedRoster = ['Minh', 'Trang', 'Anh', 'Huy']
    simulateSuccess(mockRun, 'addStudentToRoster', updatedRoster)
    const result = await addStudentToRoster('Huy')
    expect(result).toEqual(updatedRoster)
  })

  it('addStudentToRoster rejects on duplicate', async () => {
    simulateFailure(mockRun, 'addStudentToRoster', new Error('A student with this name already exists in the Sheet'))
    await expect(addStudentToRoster('Minh')).rejects.toThrow('already exists')
  })

  it('getSheetMeta resolves with sheet metadata', async () => {
    const meta = { id: 'abc', name: 'My Sheet', url: 'https://docs.google.com/spreadsheets/d/abc' }
    simulateSuccess(mockRun, 'getSheetMeta', meta)
    const result = await getSheetMeta('https://docs.google.com/spreadsheets/d/abc/edit')
    expect(result).toEqual(meta)
  })

  it('getSheetMeta rejects when sheet inaccessible', async () => {
    simulateFailure(mockRun, 'getSheetMeta', new Error("Can't access this Sheet"))
    await expect(getSheetMeta('https://docs.google.com/spreadsheets/d/abc/edit')).rejects.toThrow("Can't access")
  })
})
