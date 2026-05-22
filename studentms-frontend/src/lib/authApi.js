import api from './api'

export async function loginRequest(body) {
  const { data } = await api.post('/auth/login', body)
  return data
}

export async function registerRequest(body, roleName) {
  const { data, status } = await api.post(
    `/auth/register?roleName=${encodeURIComponent(roleName)}`,
    body,
    {
      headers: { Accept: 'text/plain, application/json, */*' },
      validateStatus: (s) => s === 200 || s === 201,
    },
  )
  return { data, status }
}
