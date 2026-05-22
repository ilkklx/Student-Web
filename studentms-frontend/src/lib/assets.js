export function apiOrigin() {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  return base.replace(/\/?api\/?$/i, '') || 'http://localhost:8080'
}

export function absolutePhotoUrl(photoUrl) {
  if (!photoUrl) return null
  if (photoUrl.startsWith('http')) return photoUrl
  return `${apiOrigin()}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`
}
