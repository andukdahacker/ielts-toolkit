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
