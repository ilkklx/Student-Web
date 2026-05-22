const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'
const ROLE_KEY = 'roleName'
const LINKED_STUDENT_KEY = 'linkedStudentId'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(patch = {}) {
  const { token, username, roleName, linkedStudentId } = patch

  if (token !== undefined) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  }

  if (username !== undefined) {
    if (username != null) localStorage.setItem(USERNAME_KEY, username)
    else localStorage.removeItem(USERNAME_KEY)
  }

  if (roleName !== undefined) {
    if (roleName != null) localStorage.setItem(ROLE_KEY, roleName)
    else localStorage.removeItem(ROLE_KEY)
  }

  if (linkedStudentId !== undefined) {
    if (linkedStudentId != null) localStorage.setItem(LINKED_STUDENT_KEY, String(linkedStudentId))
    else localStorage.removeItem(LINKED_STUDENT_KEY)
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(LINKED_STUDENT_KEY)
}

export function getStoredUsername() {
  return localStorage.getItem(USERNAME_KEY)
}

export function getStoredRole() {
  return localStorage.getItem(ROLE_KEY)
}

export function getLinkedStudentId() {
  const v = localStorage.getItem(LINKED_STUDENT_KEY)
  return v ? Number(v) : null
}

export function setLinkedStudentId(id) {
  if (id == null) localStorage.removeItem(LINKED_STUDENT_KEY)
  else localStorage.setItem(LINKED_STUDENT_KEY, String(id))
}
