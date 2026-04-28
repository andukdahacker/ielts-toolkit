type GasRunner = typeof google.script.run

function callGas<T>(fn: (runner: GasRunner) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler((result: T) => resolve(result))
      .withFailureHandler((error: Error) => reject(error))
    fn(runner)
  })
}

export function checkBackendHealth() {
  return callGas<{ data: { status: string } }>((r) => r.checkBackendHealth())
}

export function getSheetColumns(sheetUrl: string) {
  return callGas<ColumnPreview[]>((r) => r.getSheetColumns(sheetUrl))
}

export function extractNamesFromColumn(sheetUrl: string, columnIndex: number) {
  return callGas<string[]>((r) => r.extractNamesFromColumn(sheetUrl, columnIndex))
}

export function createScoreSheet(studentNames: string[]) {
  return callGas<SheetInfo>((r) => r.createScoreSheet(studentNames))
}

export function getLinkedSheet() {
  return callGas<LinkedSheetInfo | null>((r) => r.getLinkedSheet())
}

export function linkSheet(sheetId: string, sheetName: string, sheetUrl: string, studentColumn: number) {
  return callGas<void>((r) => r.linkSheet(sheetId, sheetName, sheetUrl, studentColumn))
}

export function unlinkSheet() {
  return callGas<void>((r) => r.unlinkSheet())
}

export function getStudentRoster() {
  return callGas<string[]>((r) => r.getStudentRoster())
}

export function addStudentToRoster(name: string) {
  return callGas<string[]>((r) => r.addStudentToRoster(name))
}

export function getSheetMeta(sheetUrl: string) {
  return callGas<{ id: string; name: string; url: string }>((r) => r.getSheetMeta(sheetUrl))
}

export function saveScoresToSheet(studentName: string, scores: { overall: number; taskAchievement: number; coherenceAndCohesion: number; lexicalResource: number; grammaticalRangeAndAccuracy: number }, taskType: string) {
  return callGas<void>((r) => r.writeScoresToSheet(studentName, scores, taskType))
}

export function submitGrade(essayText: string, taskType: string, studentName: string, idempotencyKey: string) {
  return callGas<{ data: { jobId: string } }>((r) => r.submitGrade(essayText, taskType, studentName, idempotencyKey))
}

export function pollGradingStatus(jobId: string) {
  return callGas<{ data: import('@ielts-toolkit/shared').JobStatus }>((r) => r.pollGradingStatus(jobId))
}

export function getActiveGradingJob() {
  return callGas<{ data: { jobId: string; status: string; studentName?: string | null; result?: import('@ielts-toolkit/shared').GradeResult; error?: { code: string; message: string } } | null }>((r) => r.getActiveGradingJob())
}

export function getEssayText() {
  return callGas<string>((r) => r.getEssayText())
}

export function logScoreOverrides(jobId: string, overrides: Array<{ criterion: string; before: number; after: number }>) {
  return callGas<void>((r) => r.logScoreOverrides(jobId, overrides))
}
