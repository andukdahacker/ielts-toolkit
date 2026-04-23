function onOpen(e: GoogleAppsScript.Events.DocsOnOpen) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Open sidebar', 'showSidebar')
    .addToUi()
}

function onInstall(e: GoogleAppsScript.Events.DocsOnOpen) {
  onOpen(e)
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('IELTS Toolkit')
    .setWidth(300)
  DocumentApp.getUi().showSidebar(html)
}
