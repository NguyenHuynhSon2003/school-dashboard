const KEY = 'accessToken'

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(KEY)
  },
  set(token: string) {
    localStorage.setItem(KEY, token)
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}