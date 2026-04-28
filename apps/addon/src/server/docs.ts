function getEssayText(): string {
  const doc = DocumentApp.getActiveDocument()
  if (!doc) throw new Error('No active document found')
  return doc.getBody().getText()
}
