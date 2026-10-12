import { delay, http, HttpResponse } from 'msw'
import type { Role } from '../features/auth/authSlice'

const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'role:read',
    'timetable:read', 'timetable:manage',
  ],
  STAFF: [
    'user:read', 'user:create', 'user:update',
    'timetable:read', 'timetable:manage',
  ],
  TEACHER: ['timetable:read_own'],
  STUDENT: ['timetable:read_own'],
}

interface MockUser {
  id: number
  email: string
  password: string
  fullName: string
  phone: string | null
  role: Role
  isActive: boolean
  createdAt: string
  avatarUrl: string | null
}

const seeded: MockUser[] = [
  { id: 1, email: 'admin@school.edu', password: 'Admin@123', fullName: 'Nguyễn Văn An', phone: '0901234567', role: 'ADMIN', isActive: true, createdAt: '2026-10-01T08:00:00.000Z', avatarUrl: null },
  { id: 2, email: 'staff@school.edu', password: 'Staff@123', fullName: 'Trần Thị Bình', phone: '0912345678', role: 'STAFF', isActive: true, createdAt: '2026-10-01T08:00:00.000Z', avatarUrl: null },
  { id: 3, email: 'teacher@school.edu', password: 'Teacher@123', fullName: 'Lê Văn Cường', phone: '0923456789', role: 'TEACHER', isActive: true, createdAt: '2026-10-03T08:00:00.000Z', avatarUrl: null },
  { id: 4, email: 'student@school.edu', password: 'Student@123', fullName: 'Phạm Thị Dung', phone: '0934567890', role: 'STUDENT', isActive: true, createdAt: '2026-10-05T08:00:00.000Z', avatarUrl: null },
]

const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi']
const maleNames = ['Hùng', 'Nam', 'Tuấn', 'Khoa', 'Phúc']
const femaleNames = ['Lan', 'Hoa', 'Mai', 'Linh', 'Trang']

// 21 người dùng sinh tự động: id 5-6 STAFF, 7-11 TEACHER, 12-25 STUDENT
const generated: MockUser[] = Array.from({ length: 21 }, (_, k) => {
  const id = k + 5
  const role: Role = id <= 6 ? 'STAFF' : id <= 11 ? 'TEACHER' : 'STUDENT'
  const isMale = id % 2 === 0
  const first = (isMale ? maleNames : femaleNames)[id % 5]
  return {
    id,
    email: `${role.toLowerCase()}${id}@school.edu`,
    password: 'Temp@1234',
    fullName: `${lastNames[id % 8]} ${isMale ? 'Văn' : 'Thị'} ${first}`,
    phone: `09${String(10000000 + id * 137911)}`,
    role,
    isActive: id % 7 !== 0, // id 7, 14, 21 bị khóa
    createdAt: new Date(Date.UTC(2026, 9, 1 + (id % 10), 8, 0, 0)).toISOString(),
    avatarUrl: null,
  }
})

const users: MockUser[] = [...seeded, ...generated]

function toListItem(u: MockUser) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return rest
}

function toPublicUser(u: MockUser) {
  return { ...toListItem(u), permissions: PERMISSIONS[u.role] }
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ status, code, message }, { status })
}

// Token giả có dạng "mock-token-<id>"
function getCurrentUser(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const id = Number(auth.replace('Bearer mock-token-', ''))
  return users.find((u) => u.id === id) ?? null
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
    const user = getCurrentUser(request)
    if (!user) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    return HttpResponse.json(toPublicUser(user))
  }),

  http.get('/api/v1/users', async ({ request }) => {
    await delay(400)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('user:read')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('pageSize') ?? 10)
    const search = (params.get('search') ?? '').trim().toLowerCase()
    const role = params.get('role')
    const isActive = params.get('isActive')

    const filtered = users.filter((u) => {
      if (role && u.role !== role) return false
      if (isActive === 'true' && !u.isActive) return false
      if (isActive === 'false' && u.isActive) return false
      if (search) {
        const haystack = `${u.fullName} ${u.email} ${u.phone ?? ''}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })

    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(toListItem)

    return HttpResponse.json({ items, page, pageSize, total: filtered.length })
  }),
]