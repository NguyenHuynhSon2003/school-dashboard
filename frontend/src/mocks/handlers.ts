import { http, HttpResponse } from 'msw'
import type { Role } from '../features/auth/authSlice'

const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'role:read', 'role:update',
    'timetable:read', 'timetable:manage',
  ],
  STAFF: [
    'user:read', 'user:create', 'user:update',
    'timetable:read', 'timetable:manage',
  ],
  TEACHER: ['timetable:read_own'],
  STUDENT: ['timetable:read_own'],
}

const users = [
  { id: 1, email: 'admin@school.edu', password: 'Admin@123', fullName: 'Nguyễn Văn An', role: 'ADMIN' as Role, isActive: true },
  { id: 2, email: 'staff@school.edu', password: 'Staff@123', fullName: 'Trần Thị Bình', role: 'STAFF' as Role, isActive: true },
  { id: 3, email: 'teacher@school.edu', password: 'Teacher@123', fullName: 'Lê Văn Cường', role: 'TEACHER' as Role, isActive: true },
  { id: 4, email: 'student@school.edu', password: 'Student@123', fullName: 'Phạm Thị Dung', role: 'STUDENT' as Role, isActive: true },
]

function toPublicUser(u: (typeof users)[number]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return { ...rest, permissions: PERMISSIONS[u.role] }
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ status, code, message }, { status })
}

export const handlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const user = users.find((u) => u.email === body.email && u.password === body.password)

    if (!user) return errorResponse(401, 'INVALID_CREDENTIALS', 'Sai email hoặc mật khẩu')
    if (!user.isActive) return errorResponse(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa')

    return HttpResponse.json({
      accessToken: `mock-token-${user.id}`,
      expiresIn: 900,
      user: toPublicUser(user),
    })
  }),

  http.get('/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization') ?? ''
    const id = Number(auth.replace('Bearer mock-token-', ''))
    const user = users.find((u) => u.id === id)

    if (!user) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')

    return HttpResponse.json(toPublicUser(user))
  }),
]