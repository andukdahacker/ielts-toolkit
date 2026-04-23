import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getSheetColumns: vi.fn(),
  extractNamesFromColumn: vi.fn(),
  createScoreSheet: vi.fn(),
  linkSheet: vi.fn(),
  unlinkSheet: vi.fn(),
  getStudentRoster: vi.fn(),
  getLinkedSheet: vi.fn(),
}))

import {
  setupStep,
  setupError,
  importedColumns,
  previewNames,
  resetSetup,
} from '../state/sheet'
import { SetupSheet } from './setup-sheet'

describe('SetupSheet', () => {
  beforeEach(() => {
    resetSetup()
    vi.clearAllMocks()
  })

  describe('choose-method step', () => {
    it('renders create and link buttons', () => {
      render(<SetupSheet />)
      expect(screen.getByText('Create new Score Sheet')).toBeTruthy()
      expect(screen.getByText('Link existing Sheet')).toBeTruthy()
    })

    it('link existing sheet button is disabled', () => {
      render(<SetupSheet />)
      const linkBtn = screen.getByText('Link existing Sheet') as HTMLButtonElement
      expect(linkBtn.disabled).toBe(true)
    })

    it('clicking create transitions to choose-students', () => {
      render(<SetupSheet />)
      fireEvent.click(screen.getByText('Create new Score Sheet'))
      expect(setupStep.value).toBe('choose-students')
    })
  })

  describe('choose-students step', () => {
    beforeEach(() => {
      setupStep.value = 'choose-students'
    })

    it('renders import and manual options', () => {
      render(<SetupSheet />)
      expect(screen.getByText('Import names from a Google Sheet')).toBeTruthy()
      expect(screen.getByText('Type names manually')).toBeTruthy()
    })

    it('renders back button', () => {
      render(<SetupSheet />)
      expect(screen.getByText(/Back/)).toBeTruthy()
    })

    it('clicking import transitions to import-url', () => {
      render(<SetupSheet />)
      fireEvent.click(screen.getByText('Import names from a Google Sheet'))
      expect(setupStep.value).toBe('import-url')
    })

    it('clicking manual transitions to manual-entry', () => {
      render(<SetupSheet />)
      fireEvent.click(screen.getByText('Type names manually'))
      expect(setupStep.value).toBe('manual-entry')
    })
  })

  describe('import-url step', () => {
    beforeEach(() => {
      setupStep.value = 'import-url'
    })

    it('renders URL input and load button', () => {
      render(<SetupSheet />)
      expect(screen.getByPlaceholderText(/docs.google.com/)).toBeTruthy()
      expect(screen.getByText('Load columns')).toBeTruthy()
    })

    it('load button is disabled when input is empty', () => {
      render(<SetupSheet />)
      const btn = screen.getByText('Load columns') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    it('displays error message', () => {
      setupError.value = 'Please paste a valid Google Sheets URL'
      render(<SetupSheet />)
      expect(screen.getByText('Please paste a valid Google Sheets URL')).toBeTruthy()
    })
  })

  describe('import-columns step', () => {
    beforeEach(() => {
      setupStep.value = 'import-columns'
      importedColumns.value = [
        { index: 0, header: 'Name', preview: ['Alice', 'Bob'] },
        { index: 1, header: 'Class', preview: ['10A', '10B'] },
      ]
    })

    it('renders column options with previews', () => {
      render(<SetupSheet />)
      expect(screen.getByText('Name')).toBeTruthy()
      expect(screen.getByText('Alice, Bob')).toBeTruthy()
      expect(screen.getByText('Class')).toBeTruthy()
    })

    it('columns are keyboard accessible', () => {
      render(<SetupSheet />)
      const nameCol = screen.getByRole('button', { name: 'Select column Name' })
      expect(nameCol.getAttribute('tabindex')).toBe('0')
    })
  })

  describe('import-preview step', () => {
    beforeEach(() => {
      setupStep.value = 'import-preview'
    })

    it('shows all names when 10 or fewer', () => {
      previewNames.value = ['Minh', 'Trang', 'Anh']
      render(<SetupSheet />)
      expect(screen.getByText(/We found 3 names/)).toBeTruthy()
      expect(screen.getByText('Minh')).toBeTruthy()
      expect(screen.getByText('Trang')).toBeTruthy()
      expect(screen.getByText('Anh')).toBeTruthy()
    })

    it('shows first 5 and "more" when over 10', () => {
      previewNames.value = Array.from({ length: 15 }, (_, i) => `Student${i + 1}`)
      render(<SetupSheet />)
      expect(screen.getByText(/We found 15 names/)).toBeTruthy()
      expect(screen.getByText('Student1')).toBeTruthy()
      expect(screen.getByText('Student5')).toBeTruthy()
      expect(screen.getByText('...and 10 more')).toBeTruthy()
    })

    it('shows confirm and cancel buttons', () => {
      previewNames.value = ['Minh']
      render(<SetupSheet />)
      expect(screen.getByText('Confirm')).toBeTruthy()
      expect(screen.getByText('Cancel')).toBeTruthy()
    })
  })

  describe('manual-entry step', () => {
    beforeEach(() => {
      setupStep.value = 'manual-entry'
    })

    it('renders textarea and preview button', () => {
      render(<SetupSheet />)
      expect(screen.getByPlaceholderText(/Enter student names/)).toBeTruthy()
      expect(screen.getByText('Preview names')).toBeTruthy()
    })

    it('preview button is disabled when textarea is empty', () => {
      render(<SetupSheet />)
      const btn = screen.getByText('Preview names') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  describe('creating step', () => {
    it('shows creating message', () => {
      setupStep.value = 'creating'
      render(<SetupSheet />)
      expect(screen.getByText('Creating your Score Sheet...')).toBeTruthy()
    })
  })

  describe('done step', () => {
    it('renders nothing', () => {
      setupStep.value = 'done'
      const { container } = render(<SetupSheet />)
      expect(container.innerHTML).toBe('')
    })
  })
})
