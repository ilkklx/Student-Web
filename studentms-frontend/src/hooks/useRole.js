import { useAuth } from '../context/AuthContext'

export function useRole() {
  const { roleName, username } = useAuth()
  const isAdmin = roleName === 'ROLE_ADMIN'
  const isTeacher = roleName === 'ROLE_TEACHER'
  const isStudent = roleName === 'ROLE_STUDENT'
  const canAdminActions = isAdmin

  return {
    roleName,
    username,
    isAdmin,
    isTeacher,
    isStudent,
    canAdminActions,
  }
}
