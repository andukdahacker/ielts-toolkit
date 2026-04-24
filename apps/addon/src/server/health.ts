function checkBackendHealth(): unknown {
  return callApi('GET', '/health', undefined, false)
}
