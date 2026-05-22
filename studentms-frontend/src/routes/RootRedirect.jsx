import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { R } from '../lib/roles'

export default function RootRedirect() {
  const { roleName } = useAuth()
  if (roleName === R.STUDENT) return <Navigate to="/student" replace />
  if (roleName === R.TEACHER) return <Navigate to="/teacher" replace />
  return <Navigate to="/dashboard" replace />
}
