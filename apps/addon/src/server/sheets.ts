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

function getLinkedSheet(): SheetInfo | null {
  const props = PropertiesService.getUserProperties()
  const id = props.getProperty('LINKED_SHEET_ID')
  if (!id) return null
  return {
    id: id,
    name: props.getProperty('LINKED_SHEET_NAME') || 'Score Sheet',
    url: props.getProperty('LINKED_SHEET_URL') || 'https://docs.google.com/spreadsheets/d/' + id,
  }
}

function linkSheet(sheetId: string, sheetName: string, sheetUrl: string): void {
  const props = PropertiesService.getUserProperties()
  props.setProperties({
    'LINKED_SHEET_ID': sheetId,
    'LINKED_SHEET_NAME': sheetName,
    'LINKED_SHEET_URL': sheetUrl,
  })
}

function unlinkSheet(): void {
  const props = PropertiesService.getUserProperties()
  props.deleteProperty('LINKED_SHEET_ID')
  props.deleteProperty('LINKED_SHEET_NAME')
  props.deleteProperty('LINKED_SHEET_URL')
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

  const range = sheet.getRange(2, 1, lastRow - 1, 1)
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
