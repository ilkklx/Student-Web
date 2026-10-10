import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrating, identityError, logout } = useAuth()
  const location = useLocation()

  if (isHydrating) return <p className="p-6">正在核验登录身份…</p>
  if (isAuthenticated && identityError) return <div className="p-6"><p role="alert">身份信息加载失败，请重试。</p><button onClick={() => window.location.reload()}>重试</button><button className="ml-4" onClick={logout}>退出登录</button></div>

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
