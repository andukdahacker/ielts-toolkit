function callApi(method: string, path: string, body?: unknown, requireAuth = true, customHeaders?: Record<string, string>): unknown {
  const baseUrl = PropertiesService.getScriptProperties().getProperty('API_BASE_URL')
  if (!baseUrl) throw new Error('API_BASE_URL not configured in Script Properties')

  const headers: Record<string, string> = {}

  if (requireAuth) {
    const token = ScriptApp.getIdentityToken()
    if (!token) throw new Error('Identity token unavailable — check OAuth scopes')
    headers['Authorization'] = `Bearer ${token}`
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders)
  }

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: method.toLowerCase() as GoogleAppsScript.URL_Fetch.HttpMethod,
    headers,
    muteHttpExceptions: true,
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
    options.payload = JSON.stringify(body)
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const response = UrlFetchApp.fetch(`${normalizedBase}${path}`, options)
  const code = response.getResponseCode()
  const rawText = response.getContentText()

  if (!rawText) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(`API returned non-JSON response (HTTP ${code}): ${rawText.substring(0, 200)}`)
  }

  if (code >= 400) {
    const errorBody = parsed as { error?: { message?: string } }
    throw new Error(errorBody?.error?.message || `API error: ${code}`)
  }
  return parsed
}
