import { Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import RecycleBinPage from './pages/admin/RecycleBinPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CoursesPage from './pages/courses/CoursesPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import EnrollmentsPage from './pages/enrollments/EnrollmentsPage'
import ExportPage from './pages/export/ExportPage'
import NotFoundPage from './pages/NotFoundPage'
import StudentsPage from './pages/students/StudentsPage'
import StudentCoursesPage from './pages/student/StudentCoursesPage'
import StudentHomePage from './pages/student/StudentHomePage'
import StudentProfilePage from './pages/student/StudentProfilePage'
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage'
import TeacherRosterPage from './pages/teacher/TeacherRosterPage'
import GuestRoute from './routes/GuestRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import RootRedirect from './routes/RootRedirect'
import { R } from './lib/roles'
import AccountsPage from './pages/admin/AccountsPage'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />

        <Route
  path="dashboard"
  element={
    <RoleRoute roles={[R.ADMIN]}>
      <DashboardPage />
    </RoleRoute>
  }
/>

        <Route
          path="students"
          element={
            <RoleRoute roles={[R.ADMIN, R.TEACHER]}>
              <StudentsPage />
            </RoleRoute>
          }
        />

        <Route path="courses" element={<CoursesPage />} />
        <Route path="enrollments" element={<RoleRoute roles={[R.ADMIN, R.TEACHER]}><EnrollmentsPage /></RoleRoute>} />
        <Route path="admin/accounts" element={<RoleRoute roles={[R.ADMIN]}><AccountsPage /></RoleRoute>} />

        <Route
          path="admin/recycle"
          element={
            <RoleRoute roles={[R.ADMIN]}>
              <RecycleBinPage />
            </RoleRoute>
          }
        />

        <Route
          path="export"
          element={
            <RoleRoute roles={[R.ADMIN]}>
              <ExportPage />
            </RoleRoute>
          }
        />

        <Route
          path="teacher"
          element={
            <RoleRoute roles={[R.TEACHER]}>
              <TeacherDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="teacher/roster"
          element={
            <RoleRoute roles={[R.TEACHER]}>
              <TeacherRosterPage />
            </RoleRoute>
          }
        />

        <Route
          path="student"
          element={
            <RoleRoute roles={[R.STUDENT]}>
              <StudentHomePage />
            </RoleRoute>
          }
        />
        <Route
          path="student/courses"
          element={
            <RoleRoute roles={[R.STUDENT]}>
              <StudentCoursesPage />
            </RoleRoute>
          }
        />
        <Route
          path="student/profile"
          element={
            <RoleRoute roles={[R.STUDENT]}>
              <StudentProfilePage />
            </RoleRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
