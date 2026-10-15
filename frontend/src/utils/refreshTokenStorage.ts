const KEY = 'refreshToken'

export const refreshTokenStorage = {
  get(): string | null {
    try { return localStorage.getItem(KEY) } catch { return null }
  },
  set(token: string) {
    try { localStorage.setItem(KEY, token) } catch { /* bỏ qua */ }
  },
  clear() {
    try { localStorage.removeItem(KEY) } catch { /* bỏ qua */ }
  },
}