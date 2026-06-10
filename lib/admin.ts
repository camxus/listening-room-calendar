const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SESSION_COOKIE_NAME = 'admin_session'

export function isAdminAuthenticated(sessionCookie?: string): boolean {
  if (!sessionCookie) return false
  
  try {
    const session = JSON.parse(sessionCookie)
    return session.authenticated === true
  } catch {
    return false
  }
}

export function createAdminSession(): string {
  return JSON.stringify({ authenticated: true })
}

export function verifyAdminCredentials(password: string): boolean {
  return password === ADMIN_PASSWORD && !!ADMIN_PASSWORD
}
