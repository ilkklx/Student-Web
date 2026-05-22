import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ roles, children }) {
  const { roleName } = useAuth()
  if (!roles.includes(roleName)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
