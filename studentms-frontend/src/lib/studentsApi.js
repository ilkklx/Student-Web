import api from './api'

export async function getStudents(params) {
  const { data } = await api.get('/students', { params })
  return data
}

export async function getStudent(id) {
  const { data } = await api.get(`/students/${id}`)
  return data
}

export async function createStudent(body) {
  const { data } = await api.post('/students', body)
  return data
}

export async function updateStudent(id, body) {
  const { data } = await api.put(`/students/${id}`, body)
  return data
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}`)
}

export async function bulkDeleteStudents(ids) {
  await api.delete('/students/bulk', { data: { ids } })
}

export async function getDeletedStudents() {
  const { data } = await api.get('/students/deleted')
  return data
}

export async function restoreStudent(id) {
  await api.patch(`/students/${id}/restore`)
}

export async function exportStudentsCsv() {
  const { data } = await api.get('/students/export/csv', { responseType: 'blob' })
  return data
}

export async function uploadStudentPhoto(id, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/students/${id}/photo`, form)
  return data
}

export async function getStudentCourses(studentId) {
  const { data } = await api.get(`/students/${studentId}/courses`)
  return data
}

export async function enrollStudent(studentId, courseId, grade) {
  const { data } = await api.post(`/students/${studentId}/enroll`, null, {
    params: { courseId, grade },
  })
  return data
}

export async function dropCourse(studentId, courseId) {
  await api.delete(`/students/${studentId}/enroll/${courseId}`)
}
