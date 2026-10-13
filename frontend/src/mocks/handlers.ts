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

// ===== Thời khóa biểu (demo) =====
const CLASSES = ['10A1', '10A2']

const TEACHER_SLOTS = [
  { teacherId: 3, subject: 'Toán' },
  { teacherId: 7, subject: 'Ngữ văn' },
  { teacherId: 8, subject: 'Tiếng Anh' },
  { teacherId: 9, subject: 'Vật lý' },
  { teacherId: 10, subject: 'Hóa học' },
  { teacherId: 11, subject: 'Sinh học' },
]

const PERIODS = [
  { start: '07:30', end: '08:15' },
  { start: '08:20', end: '09:05' },
  { start: '09:20', end: '10:05' },
  { start: '10:10', end: '10:55' },
  { start: '11:00', end: '11:45' },
]

interface MockLesson {
  id: number
  dayOfWeek: number
  period: number
  startTime: string
  endTime: string
  subject: string
  className: string
  teacherId: number
  room: string
}

// Hai lớp lệch nhau 3 vị trí trong danh sách giáo viên nên một giáo viên không bao giờ dạy 2 lớp cùng lúc
const lessons: MockLesson[] = CLASSES.flatMap((className, c) =>
  Array.from({ length: 5 }, (_, d) =>
    PERIODS.map((p, i) => {
      const slot = TEACHER_SLOTS[(d * 2 + i + c * 3) % TEACHER_SLOTS.length]
      return {
        id: c * 100 + d * 10 + i + 1,
        dayOfWeek: d + 1,
        period: i + 1,
        startTime: p.start,
        endTime: p.end,
        subject: slot.subject,
        className,
        teacherId: slot.teacherId,
        room: `A10${c + 1}`,
      }
    }),
  ).flat(),
)

// Học sinh id chẵn học lớp 10A1, id lẻ học lớp 10A2
function classOf(u: MockUser) {
  if (u.role !== 'STUDENT') return null
  return u.id % 2 === 0 ? '10A1' : '10A2'
}

function toOwner(u: MockUser) {
  return { id: u.id, fullName: u.fullName, role: u.role, className: classOf(u) }
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

    http.delete('/api/v1/users/:id', async ({ request, params }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('user:delete')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const id = Number(params.id)
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy người dùng')
    if (id === me.id) return errorResponse(403, 'FORBIDDEN', 'Bạn không thể xóa chính mình')

    users.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

    http.post('/api/v1/users', async ({ request }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('user:create')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const body = (await request.json()) as {
      fullName: string
      email: string
      phone?: string
      role: Role
      password: string
      isActive?: boolean
    }

    if (body.role === 'ADMIN' && me.role !== 'ADMIN') {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không thể tạo tài khoản Admin')
    }
    if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json(
        {
          status: 409,
          code: 'CONFLICT',
          message: 'Email đã tồn tại',
          errors: [{ field: 'email', message: 'Email đã tồn tại' }],
        },
        { status: 409 },
      )
    }

    const newUser: MockUser = {
      id: Math.max(...users.map((u) => u.id)) + 1,
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone || null,
      role: body.role,
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      avatarUrl: null,
    }
    users.unshift(newUser) // hiện ở đầu danh sách để dễ thấy khi thử
    return HttpResponse.json(toListItem(newUser), { status: 201 })
  }),

  http.put('/api/v1/users/:id', async ({ request, params }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('user:update')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const target = users.find((u) => u.id === Number(params.id))
    if (!target) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy người dùng')

    const body = (await request.json()) as {
      fullName: string
      phone?: string
      role: Role
      isActive: boolean
    }

    if (me.role !== 'ADMIN' && (target.role === 'ADMIN' || body.role === 'ADMIN')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền với tài khoản Admin')
    }
    if (target.id === me.id && (body.role !== target.role || !body.isActive)) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không thể tự đổi vai trò hoặc khóa chính mình')
    }

    target.fullName = body.fullName
    target.phone = body.phone || null
    target.role = body.role
    target.isActive = body.isActive
    return HttpResponse.json(toListItem(target))
  }),

  http.get('/api/v1/roles', async ({ request }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('role:read')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const rolesData = [
      { id: 1, name: 'ADMIN', description: 'Quản trị viên hệ thống, có toàn quyền quản trị và quản lý người dùng.' },
      { id: 2, name: 'STAFF', description: 'Giáo vụ, quản lý tài khoản người dùng và điều phối thời khóa biểu.' },
      { id: 3, name: 'TEACHER', description: 'Giáo viên bộ môn, theo dõi lịch giảng dạy cá nhân.' },
      { id: 4, name: 'STUDENT', description: 'Học sinh, theo dõi lịch học tập cá nhân.' },
    ]

    const result = rolesData.map((r) => ({
      ...r,
      permissions: PERMISSIONS[r.name as Role],
      userCount: users.filter((u) => u.role === r.name).length,
    }))

    return HttpResponse.json(result)
  }),

    http.get('/api/v1/timetable/people', async ({ request }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
    if (!PERMISSIONS[me.role].includes('timetable:read')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const people = users
      .filter((u) => u.role === 'TEACHER' || u.role === 'STUDENT')
      .map(toOwner)
    return HttpResponse.json(people)
  }),

  http.get('/api/v1/timetable', async ({ request }) => {
    await delay(400)

    const me = getCurrentUser(request)
    if (!me) return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')

    const canReadAll = PERMISSIONS[me.role].includes('timetable:read')
    const canReadOwn = PERMISSIONS[me.role].includes('timetable:read_own')
    if (!canReadAll && !canReadOwn) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const params = new URL(request.url).searchParams
    const userIdParam = params.get('userId')
    const weekStart = params.get('weekStart') ?? '' // demo: lịch lặp lại mỗi tuần

    let target: MockUser | undefined
    if (canReadAll) {
      if (!userIdParam) return errorResponse(422, 'VALIDATION_ERROR', 'Thiếu userId')
      target = users.find((u) => u.id === Number(userIdParam))
      if (!target) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy người dùng')
    } else {
      // Chỉ được xem lịch của mình, hỏi lịch người khác là bị từ chối
      if (userIdParam && Number(userIdParam) !== me.id) {
        return errorResponse(403, 'FORBIDDEN', 'Bạn chỉ được xem thời khóa biểu của chính mình')
      }
      target = me
    }

    const className = classOf(target)
    const items = lessons
      .filter((l) =>
        target.role === 'TEACHER' ? l.teacherId === target.id : className !== null && l.className === className,
      )
      .map(({ teacherId, ...rest }) => ({
        ...rest,
        teacherName: users.find((u) => u.id === teacherId)?.fullName ?? 'Chưa phân công',
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period)

    return HttpResponse.json({ weekStart, owner: toOwner(target), items })
  }),

]