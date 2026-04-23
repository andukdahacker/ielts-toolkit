import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getLinkedSheet: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import { linkedSheet } from '../state/sheet'
import { studentRoster } from '../state/students'
import { SheetInfo } from './sheet-info'

describe('SheetInfo', () => {
  beforeEach(() => {
    linkedSheet.value = null
    studentRoster.value = []
  })

  it('renders nothing when no sheet linked', () => {
    const { container } = render(<SheetInfo />)
    expect(container.innerHTML).toBe('')
  })

  it('displays sheet name as link', () => {
    linkedSheet.value = { id: 'abc', name: 'My Score Sheet', url: 'https://docs.google.com/spreadsheets/d/abc', studentColumn: 0 }
    render(<SheetInfo />)
    const link = screen.getByText('My Score Sheet') as HTMLAnchorElement
    expect(link.href).toBe('https://docs.google.com/spreadsheets/d/abc')
    expect(link.target).toBe('_blank')
  })

  it('displays student count', () => {
    linkedSheet.value = { id: 'abc', name: 'Sheet', url: 'https://docs.google.com/spreadsheets/d/abc', studentColumn: 0 }
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    render(<SheetInfo />)
    expect(screen.getByText('3 students')).toBeTruthy()
  })
})
