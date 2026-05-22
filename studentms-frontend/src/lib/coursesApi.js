import api from './api'

export async function getCourses() {
  const { data } = await api.get('/courses')
  return data
}

export async function createCourse(body) {
  const { data } = await api.post('/courses', body)
  return data
}
