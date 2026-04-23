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

function _sheetsTruncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

function _sheetsParseUrl(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error('Please paste a valid Google Sheets URL')
  return match[1]
}

function _sheetsSanitize(value: string): string {
  if (/^[=+\-@]/.test(value)) return "'" + value
  return value
}

function _sheetsFormatHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1)
  headerRange.setFontWeight('bold')
  sheet.setFrozenRows(1)
  sheet.setFrozenColumns(1)
  sheet.setColumnWidth(1, 200)
}

function getSheetColumns(sheetUrl: string): ColumnPreview[] {
  const id = _sheetsParseUrl(sheetUrl)
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(id)
  } catch {
    throw new Error("Can't access this Sheet. Make sure you have edit or view access to it.")
  }

  const sheet = spreadsheet.getSheets()[0]
  if (!sheet) throw new Error('This Sheet appears to be empty')

  const lastCol = Math.min(sheet.getLastColumn(), 20)
  if (lastCol === 0) throw new Error('This Sheet appears to be empty')

  const lastRow = Math.min(sheet.getLastRow(), 4)
  if (lastRow === 0) throw new Error('This Sheet appears to be empty')

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues()
  const columns: ColumnPreview[] = []

  for (let col = 0; col < lastCol; col++) {
    const header = data[0][col] != null ? String(data[0][col]).trim() : ''
    const preview: string[] = []

    for (let row = 1; row < data.length; row++) {
      const cellValue = data[row][col] != null ? String(data[row][col]).trim() : ''
      if (cellValue) {
        preview.push(_sheetsTruncate(cellValue, 50))
      }
    }

    if (!header && preview.length === 0) continue

    columns.push({
      index: col,
      header: header || 'Column ' + String.fromCharCode(65 + col),
      preview,
    })
  }

  return columns
}

function extractNamesFromColumn(sheetUrl: string, columnIndex: number): string[] {
  const id = _sheetsParseUrl(sheetUrl)
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(id)
  } catch {
    throw new Error("Can't access this Sheet. Make sure you have edit or view access to it.")
  }

  const sheet = spreadsheet.getSheets()[0]
  const lastCol = sheet.getLastColumn()
  if (columnIndex < 0 || columnIndex >= lastCol) {
    throw new Error('Selected column is out of range')
  }
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return []

  const range = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1)
  const values = range.getValues()
  const names: string[] = []

  for (let i = 0; i < values.length; i++) {
    const val = values[i][0] != null ? String(values[i][0]).trim() : ''
    if (val) {
      names.push(val)
    }
  }

  return names
}

function createScoreSheet(studentNames: string[]): SheetInfo {
  const spreadsheet = SpreadsheetApp.create('IELTS Score Sheet')
  const sheet = spreadsheet.getSheets()[0]

  sheet.getRange(1, 1).setValue('Student Name')

  if (studentNames.length > 0) {
    const nameData = studentNames.map(function(name) { return [_sheetsSanitize(name)] })
    sheet.getRange(2, 1, studentNames.length, 1).setValues(nameData)
  }

  _sheetsFormatHeaders(sheet)

  return {
    id: spreadsheet.getId(),
    name: spreadsheet.getName(),
    url: spreadsheet.getUrl(),
  }
}

function getLinkedSheet(): (SheetInfo & { studentColumn: number }) | null {
  const props = PropertiesService.getUserProperties()
  const id = props.getProperty('LINKED_SHEET_ID')
  if (!id) return null
  const colStr = props.getProperty('LINKED_SHEET_STUDENT_COL')
  return {
    id: id,
    name: props.getProperty('LINKED_SHEET_NAME') || 'Score Sheet',
    url: props.getProperty('LINKED_SHEET_URL') || 'https://docs.google.com/spreadsheets/d/' + id,
    studentColumn: colStr != null && !isNaN(parseInt(colStr, 10)) ? parseInt(colStr, 10) : 0,
  }
}

function linkSheet(sheetId: string, sheetName: string, sheetUrl: string, studentColumn: number): void {
  const props = PropertiesService.getUserProperties()
  props.setProperties({
    'LINKED_SHEET_ID': sheetId,
    'LINKED_SHEET_NAME': sheetName,
    'LINKED_SHEET_URL': sheetUrl,
    'LINKED_SHEET_STUDENT_COL': String(studentColumn),
  })
}

function unlinkSheet(): void {
  const props = PropertiesService.getUserProperties()
  props.deleteProperty('LINKED_SHEET_ID')
  props.deleteProperty('LINKED_SHEET_NAME')
  props.deleteProperty('LINKED_SHEET_URL')
  props.deleteProperty('LINKED_SHEET_STUDENT_COL')
}

function getStudentRoster(): string[] {
  const linked = getLinkedSheet()
  if (!linked) throw new Error('No Score Sheet linked')

  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(linked.id)
  } catch {
    throw new Error('Score Sheet is no longer accessible')
  }

  const sheet = spreadsheet.getSheets()[0]
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return []

  const col = linked.studentColumn + 1  // 0-based → 1-based for getRange
  const range = sheet.getRange(2, col, lastRow - 1, 1)
  const values = range.getValues()
  const names: string[] = []

  for (let i = 0; i < values.length; i++) {
    const val = values[i][0] != null ? String(values[i][0]).trim() : ''
    if (val) {
      names.push(val)
    }
  }

  return names
}

function addStudentToRoster(name: string): string[] {
  if (!name || !name.trim()) throw new Error('Student name is required')
  const trimmed = name.trim()
  if (trimmed.length > 100) throw new Error('Student name must be 100 characters or fewer')

  const linked = getLinkedSheet()
  if (!linked) throw new Error('No Score Sheet linked')

  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(linked.id)
  } catch {
    throw new Error('Score Sheet is no longer accessible. Try relinking your Sheet.')
  }

  const sheet = spreadsheet.getSheets()[0]
  const col = linked.studentColumn + 1  // 1-based for getRange

  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) {
    throw new Error('Sheet is busy, try again in a moment')
  }

  try {
    // Find last occupied row in the SPECIFIC student column (not sheet-wide getLastRow)
    const sheetLastRow = sheet.getLastRow()
    let columnLastRow = 1  // default: only header exists
    if (sheetLastRow > 1) {
      const colValues = sheet.getRange(2, col, sheetLastRow - 1, 1).getValues()
      for (let i = colValues.length - 1; i >= 0; i--) {
        if (colValues[i][0] != null && String(colValues[i][0]).trim() !== '') {
          columnLastRow = i + 2  // +2: skip header row (1-based) + array offset
          break
        }
      }
    }

    // Server-side duplicate check (case-insensitive)
    if (columnLastRow > 1) {
      const existingNames = sheet.getRange(2, col, columnLastRow - 1, 1).getValues()
      for (let i = 0; i < existingNames.length; i++) {
        if (String(existingNames[i][0]).trim().toLowerCase() === trimmed.toLowerCase()) {
          throw new Error('A student with this name already exists in the Sheet')
        }
      }
    }

    const targetRow = columnLastRow + 1
    const targetCell = sheet.getRange(targetRow, col)
    targetCell.setValue(_sheetsSanitize(trimmed))

    // Copy formatting from the row above to match existing sheet structure (AC7)
    if (columnLastRow >= 2) {
      const sourceFormat = sheet.getRange(columnLastRow, col)
      sourceFormat.copyFormatToRange(sheet, col, col, targetRow, targetRow)
    }
  } finally {
    lock.releaseLock()
  }

  // Re-read and return full roster
  return getStudentRoster()
}

function getSheetMeta(sheetUrl: string): { id: string; name: string; url: string } {
  const id = _sheetsParseUrl(sheetUrl)
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(id)
  } catch {
    throw new Error("Can't access this Sheet. It may have been deleted or you lost access.")
  }
  return {
    id: spreadsheet.getId(),
    name: spreadsheet.getName(),
    url: spreadsheet.getUrl(),
  }
}
