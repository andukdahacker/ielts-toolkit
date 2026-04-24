import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getLinkedSheet: vi.fn(),
  getSheetColumns: vi.fn(),
  extractNamesFromColumn: vi.fn(),
  createScoreSheet: vi.fn(),
  linkSheet: vi.fn(),
  unlinkSheet: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
}))

import { connectionStatus } from '../state/connection'
import { linkedSheet, setupStep, resetSetup } from '../state/sheet'
import { studentRoster, selectedStudent } from '../state/students'
import { checkBackendHealth, getLinkedSheet } from '../lib/gas'
import { App } from './app'

const mockCheckBackendHealth = vi.mocked(checkBackendHealth)
const mockGetLinkedSheet = vi.mocked(getLinkedSheet)

describe('App', () => {
  beforeEach(() => {
    connectionStatus.value = 'idle'
    linkedSheet.value = null
    studentRoster.value = []
    selectedStudent.value = null
    resetSetup()
    vi.clearAllMocks()
    mockGetLinkedSheet.mockResolvedValue(null)
  })

  it('renders without crashing', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)
    expect(screen.getByText('Connecting...')).toBeTruthy()
  })

  it('calls health check on mount', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)
    expect(mockCheckBackendHealth).toHaveBeenCalledOnce()
  })

  it('shows setup flow when connected and no sheet linked', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)

    await waitFor(() => {
      expect(connectionStatus.value).toBe('connected')
    })

    expect(screen.getByText('Set up your Score Sheet to get started')).toBeTruthy()
  })

  it('shows grading-ready state when sheet is linked with student selected', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.getByText('Test Sheet')).toBeTruthy()
    expect(screen.getByText('2 students')).toBeTruthy()
  })

  it('ScoreEditor renders when student is selected', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.getByText('Task Achievement')).toBeTruthy()
    expect(screen.getByText('Overall')).toBeTruthy()
  })

  it('SaveButton renders when student is selected', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.getByText('Save to Sheet')).toBeTruthy()
  })

  it('TaskTypePicker renders when student is selected', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.getByLabelText('Task type')).toBeTruthy()
  })

  it('shows EmptyState when sheet linked but no student selected', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = []
    selectedStudent.value = null

    render(<App />)

    expect(screen.getByText('No scores yet — grade your first essay to get started')).toBeTruthy()
  })

  it('renders StudentNav in grading-ready state', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.getByText('Student 1 of 2')).toBeTruthy()
    expect(screen.getByLabelText('Next student')).toBeTruthy()
  })

  it('does not show setup when sheet is linked', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet', url: 'https://docs.google.com/spreadsheets/d/sheet-1', studentColumn: 0 }
    studentRoster.value = ['Minh']
    selectedStudent.value = 'Minh'

    render(<App />)

    expect(screen.queryByText('Set up your Score Sheet to get started')).toBeNull()
  })

  it('calls initializeSheet after connection check', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)
    await waitFor(() => {
      expect(mockGetLinkedSheet).toHaveBeenCalledOnce()
    })
  })
})
