export const queryKeys = {
  dashboardStats: ['dashboard', 'stats'],
  students: (params) => ['students', params],
  student: (id) => ['student', id],
  deletedStudents: ['students', 'deleted'],
  courses: ['courses'],
  studentCourses: (studentId) => ['studentCourses', studentId],
}
