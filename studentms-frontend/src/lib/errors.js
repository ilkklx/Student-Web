export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return data
  if (typeof data.message === 'string') return data.message
  if (typeof data === 'object') {
    const first = Object.values(data).find((v) => typeof v === 'string')
    if (first) return first
  }
  return fallback
}
