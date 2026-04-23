type ColumnPreview = {
  index: number
  header: string
  preview: string[]
}

type SheetInfo = {
  id: string
  name: string
  url: string
}

declare namespace google {
  namespace script {
    interface RunnerWithHandlers {
      withSuccessHandler<T>(handler: (result: T) => void): RunnerWithHandlers
      withFailureHandler(handler: (error: Error) => void): RunnerWithHandlers
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
    const run: RunnerWithHandlers
  }
}
