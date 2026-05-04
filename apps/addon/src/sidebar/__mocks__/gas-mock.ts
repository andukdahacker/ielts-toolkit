interface MockRunner {
  withSuccessHandler(handler: (result: unknown) => void): MockRunner
  withFailureHandler(handler: (error: Error) => void): MockRunner
  checkBackendHealth(): void
  getSheetColumns(sheetUrl: string): void
  extractNamesFromColumn(sheetUrl: string, columnIndex: number): void
  createScoreSheet(studentNames: string[]): void
  getLinkedSheet(): void
  linkSheet(sheetId: string, sheetName: string, sheetUrl: string, studentColumn: number): void
  unlinkSheet(): void
  getStudentRoster(): void
  addStudentToRoster(name: string): void
  getSheetMeta(sheetUrl: string): void
  writeScoresToSheet(studentName: string, scores: { overall: number; taskAchievement: number; coherenceAndCohesion: number; lexicalResource: number; grammaticalRangeAndAccuracy: number }, taskType: string): void
  insertDocComments(comments: Array<{ text: string; anchorText: string; category: string }>): void
  [key: string]: unknown
}

const mockResponses: Record<string, unknown> = {
  checkBackendHealth: { data: { status: 'ok' } },
  getLinkedSheet: null as null,
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
  addStudentToRoster: ['Minh', 'Trang', 'Anh', 'Huy', 'Linh', 'New Student'],
  getSheetMeta: {
    id: 'mock-linked-id',
    name: 'Linked Sheet',
    url: 'https://docs.google.com/spreadsheets/d/mock-linked-id',
  },
  writeScoresToSheet: undefined,
  submitGrade: { data: { jobId: 'mock-job-id-123' } },
  pollGradingStatus: { data: { status: 'completed', result: { bandScores: { overall: 6.5, taskAchievement: 6.0, coherenceAndCohesion: 6.5, lexicalResource: 7.0, grammaticalRangeAndAccuracy: 6.0 }, comments: [] } } },
  getActiveGradingJob: { data: null },
  getEssayText: 'The growth of international tourism has brought significant benefits to many countries...',
  logScoreOverrides: undefined,
  insertDocComments: { inserted: 5, anchored: 4, general: 1, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3', 'c4', 'c5'] },
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
    linkSheet(_sheetId: string, _sheetName: string, _sheetUrl: string, _studentColumn: number) {
      dispatch('linkSheet')
    },
    unlinkSheet() {
      dispatch('unlinkSheet')
    },
    getStudentRoster() {
      dispatch('getStudentRoster')
    },
    addStudentToRoster(_name: string) {
      dispatch('addStudentToRoster')
    },
    getSheetMeta(_sheetUrl: string) {
      dispatch('getSheetMeta')
    },
    writeScoresToSheet(_studentName: string, _scores: { overall: number; taskAchievement: number; coherenceAndCohesion: number; lexicalResource: number; grammaticalRangeAndAccuracy: number }, _taskType: string) {
      dispatch('writeScoresToSheet')
    },
    submitGrade(_essayText: string, _taskType: string, _studentName: string, _idempotencyKey: string) {
      dispatch('submitGrade')
    },
    pollGradingStatus(_jobId: string) {
      dispatch('pollGradingStatus')
    },
    getActiveGradingJob() {
      dispatch('getActiveGradingJob')
    },
    getEssayText() {
      dispatch('getEssayText')
    },
    logScoreOverrides(_jobId: string, _overrides: Array<{ criterion: string; before: number; after: number }>) {
      dispatch('logScoreOverrides')
    },
    insertDocComments(_comments: Array<{ text: string; anchorText: string; category: string }>) {
      dispatch('insertDocComments')
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
