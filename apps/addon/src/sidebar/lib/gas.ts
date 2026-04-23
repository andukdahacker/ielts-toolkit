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
  return callGas<SheetInfo | null>((r) => r.getLinkedSheet())
}

export function linkSheet(sheetId: string, sheetName: string, sheetUrl: string) {
  return callGas<void>((r) => r.linkSheet(sheetId, sheetName, sheetUrl))
}

export function unlinkSheet() {
  return callGas<void>((r) => r.unlinkSheet())
}

export function getStudentRoster() {
  return callGas<string[]>((r) => r.getStudentRoster())
}
