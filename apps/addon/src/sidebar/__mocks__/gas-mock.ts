interface MockRunner {
  withSuccessHandler(handler: (result: unknown) => void): MockRunner
  withFailureHandler(handler: (error: Error) => void): MockRunner
  checkBackendHealth(): void
  getSheetColumns(sheetUrl: string): void
  extractNamesFromColumn(sheetUrl: string, columnIndex: number): void
  createScoreSheet(studentNames: string[]): void
  getLinkedSheet(): void
  linkSheet(sheetId: string, sheetName: string, sheetUrl: string): void
  unlinkSheet(): void
  getStudentRoster(): void
  [key: string]: unknown
}

const mockResponses: Record<string, unknown> = {
  checkBackendHealth: { data: { status: 'ok' } },
  getLinkedSheet: null,
  getSheetColumns: [
    { index: 0, header: 'Student Name', preview: ['Minh', 'Trang', 'Anh'] },
    { index: 1, header: 'Class', preview: ['10A', '10A', '10B'] },
    { index: 2, header: 'Email', preview: ['minh@school.vn', 'trang@school.vn', 'anh@school.vn'] },
  ],
  extractNamesFromColumn: ['Minh', 'Trang', 'Anh', 'Huy', 'Linh'],
  createScoreSheet: {
    id: 'mock-id',
    name: 'IELTS Score Sheet',
    url: 'https://docs.google.com/spreadsheets/d/mock-id',
  },
  linkSheet: undefined,
  unlinkSheet: undefined,
  getStudentRoster: ['Minh', 'Trang', 'Anh', 'Huy', 'Linh'],
}

const mockErrors: Record<string, Error> = {
  // Add entries here to simulate failures, e.g.:
  // checkBackendHealth: new Error('Service unavailable'),
}

function createMockRunner(): MockRunner {
  let successHandler: ((result: unknown) => void) | null = null
  let failureHandler: ((error: Error) => void) | null = null

  function dispatch(fnName: string): void {
    const error = mockErrors[fnName]
    const response = mockResponses[fnName]
    setTimeout(() => {
      if (error && failureHandler) {
        failureHandler(error)
      } else if (successHandler) {
        successHandler(response)
      }
    }, 500)
  }

  const runner: MockRunner = {
    withSuccessHandler(handler: (result: unknown) => void) {
      successHandler = handler
      return runner
    },
    withFailureHandler(handler: (error: Error) => void) {
      failureHandler = handler
      return runner
    },
    checkBackendHealth() {
      dispatch('checkBackendHealth')
    },
    getSheetColumns(_sheetUrl: string) {
      dispatch('getSheetColumns')
    },
    extractNamesFromColumn(_sheetUrl: string, _columnIndex: number) {
      dispatch('extractNamesFromColumn')
    },
    createScoreSheet(_studentNames: string[]) {
      dispatch('createScoreSheet')
    },
    getLinkedSheet() {
      dispatch('getLinkedSheet')
    },
    linkSheet(_sheetId: string, _sheetName: string, _sheetUrl: string) {
      dispatch('linkSheet')
    },
    unlinkSheet() {
      dispatch('unlinkSheet')
    },
    getStudentRoster() {
      dispatch('getStudentRoster')
    },
  }

  return runner
}

;(window as any).google = {
  script: {
    run: createMockRunner(),
  },
}

console.log('[gas-mock] google.script.run mocked for local development')
