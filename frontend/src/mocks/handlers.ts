import { delay, http, HttpResponse } from 'msw'
import type { Role } from '../features/auth/authSlice'

interface MockRole {
  id: number
  name: string
  description: string
  permissions: string[]
}

const roles: MockRole[] = [
  {
    id: 1,
    name: 'ADMIN',
    description: 'Quản trị viên hệ thống, có toàn quyền quản trị và quản lý người dùng.',
    permissions: [
      'user:read', 'user:create', 'user:update', 'user:delete',
      'role:read', 'role:create', 'role:update', 'role:delete',
      'timetable:read', 'timetable:manage',
    ],
  },
  {
    id: 2,
    name: 'STAFF',
    description: 'Giáo vụ, quản lý tài khoản người dùng và điều phối thời khóa biểu.',
    permissions: ['user:read', 'user:create', 'user:update', 'timetable:read', 'timetable:manage'],
  },
  {
    id: 3,
    name: 'TEACHER',
    description: 'Giáo viên bộ môn, theo dõi lịch giảng dạy cá nhân.',
    permissions: ['timetable:read_own'],
  },
  {
    id: 4,
    name: 'STUDENT',
    description: 'Học sinh, theo dõi lịch học tập cá nhân.',
    permissions: ['timetable:read_own'],
  },
]

// Danh mục quyền (giống bảng permissions ở backend): dùng để vẽ ma trận
const PERMISSION_GROUPS = [
  {
    resource: 'user',
    label: 'Người dùng',
    permissions: [
      { code: 'user:read', action: 'read', label: 'Xem danh sách người dùng' },
      { code: 'user:create', action: 'create', label: 'Thêm người dùng' },
      { code: 'user:update', action: 'update', label: 'Sửa người dùng' },
      { code: 'user:delete', action: 'delete', label: 'Xóa người dùng' },
    ],
  },
  {
    resource: 'role',
    label: 'Vai trò',
    permissions: [
      { code: 'role:read', action: 'read', label: 'Xem vai trò' },
      { code: 'role:create', action: 'create', label: 'Thêm vai trò' },
      { code: 'role:update', action: 'update', label: 'Sửa vai trò và quyền' },
      { code: 'role:delete', action: 'delete', label: 'Xóa vai trò' },
    ],
  },
  {
    resource: 'timetable',
    label: 'Thời khóa biểu',
    permissions: [
      { code: 'timetable:read', action: 'read', label: 'Xem thời khóa biểu của mọi người' },
      { code: 'timetable:read_own', action: 'read_own', label: 'Chỉ xem thời khóa biểu của mình' },
      { code: 'timetable:manage', action: 'manage', label: 'Quản lý thời khóa biểu' },
    ],
  },
]
const ALL_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code))

function permissionsOf(roleName: string) {
  return roles.find((r) => r.name === roleName)?.permissions ?? []
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
  return { ...toListItem(u), permissions: permissionsOf(u.role) }
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ status, code, message }, { status })
}

interface RoleBody {
  name: string
  description?: string
  permissions: string[]
}

function toRoleItem(r: MockRole) {
  return { ...r, userCount: users.filter((u) => u.role === r.name).length }
}

// Gộp bước "đã đăng nhập chưa" và "có quyền chưa" vào một hàm
function guard(request: Request, code: string) {
  const me = getCurrentUser(request)
  if (!me) return { error: unauthorized(request) }
  if (!permissionsOf(me.role).includes(code)) {
    return { error: errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này') }
  }
  return { me }
}

function validateRole(body: RoleBody, selfId?: number) {
  const name = (body.name ?? '').trim().toUpperCase()
  if (!/^[A-Z][A-Z0-9_]{1,29}$/.test(name)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Tên vai trò gồm 2-30 ký tự: chữ in hoa, số hoặc dấu _')
  }
  if (roles.some((r) => r.name === name && r.id !== selfId)) {
    return errorResponse(409, 'CONFLICT', 'Tên vai trò đã tồn tại')
  }
  if (!Array.isArray(body.permissions) || body.permissions.some((p) => !ALL_PERMISSION_CODES.includes(p))) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Danh sách quyền không hợp lệ')
  }
  return null
}

// ===== Token và phiên đăng nhập (mock) =====
const ACCESS_TTL_SECONDS = 900 // dev: 60 giây để thử hết hạn; giống thật thì đổi thành 900 (15 phút)
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày
const REFRESH_KEY = 'mockRefreshSession'

// Token giả có dạng "mock-token-<id>.<thời điểm hết hạn tính bằng ms>"
// Token không có phần hết hạn (ví dụ "mock-token-1") được coi là không bao giờ hết hạn
function makeAccessToken(userId: number) {
  return `mock-token-${userId}.${Date.now() + ACCESS_TTL_SECONDS * 1000}`
}

function parseToken(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const match = /^Bearer mock-token-(\d+)(?:\.(\d+))?$/.exec(auth)
  if (!match) return { user: null, expired: false }

  const user = users.find((u) => u.id === Number(match[1])) ?? null
  const expired = match[2] !== undefined && Date.now() > Number(match[2])
  return { user, expired }
}


// Token giả có dạng "mock-token-<id>"
// function getCurrentUser(request: Request) {
//   const auth = request.headers.get('Authorization') ?? ''
//   const id = Number(auth.replace('Bearer mock-token-', ''))
//   return users.find((u) => u.id === id) ?? null
// }
function getCurrentUser(request: Request) {
  const { user, expired } = parseToken(request)
  return expired ? null : user
}

// Token hết hạn thì trả TOKEN_EXPIRED để frontend biết cần gọi refresh
function unauthorized(request: Request) {
  const { user, expired } = parseToken(request)
  if (user && expired) return errorResponse(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn')
  return errorResponse(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc token không hợp lệ')
}

// Giả lập httpOnly cookie chứa refresh token (backend thật dùng cookie, frontend không đụng tới)
interface RefreshSession {
  userId: number
  expiresAt: number
}

function startRefreshSession(userId: number) {
  const session: RefreshSession = { userId, expiresAt: Date.now() + REFRESH_TTL_MS }
  localStorage.setItem(REFRESH_KEY, JSON.stringify(session))
}

function readRefreshSession(): RefreshSession | null {
  try {
    const raw = localStorage.getItem(REFRESH_KEY)
    return raw ? (JSON.parse(raw) as RefreshSession) : null
  } catch {
    return null
  }
}

function endRefreshSession() {
  localStorage.removeItem(REFRESH_KEY)
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

    startRefreshSession(user.id) // giả lập server set cookie refresh token

    return HttpResponse.json({
      accessToken: makeAccessToken(user.id),
      refreshToken: `mock-refresh-${user.id}`, // giả lập backend thật trả refresh token trong body
      expiresIn: ACCESS_TTL_SECONDS,
      user: toPublicUser(user),
    })
  }),

  http.post('/api/v1/auth/refresh', async () => {
    await delay(200)

    const session = readRefreshSession()
    if (!session || Date.now() > session.expiresAt) {
      endRefreshSession()
      return errorResponse(401, 'UNAUTHENTICATED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    }

    const user = users.find((u) => u.id === session.userId)
    if (!user || !user.isActive) {
      endRefreshSession()
      return errorResponse(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không còn hiệu lực')
    }

    return HttpResponse.json({
      accessToken: makeAccessToken(user.id),
      expiresIn: ACCESS_TTL_SECONDS,
      user: toPublicUser(user),
    })
  }),

  http.post('/api/v1/auth/logout', () => {
    endRefreshSession() // giả lập server thu hồi refresh token và xóa cookie
    return HttpResponse.json({ message: 'Đăng xuất thành công' })
  }),

  http.get('/api/v1/auth/me', ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return unauthorized(request)
    return HttpResponse.json(toPublicUser(user))
  }),

  http.get('/api/v1/users', async ({ request }) => {
    await delay(400)

    const me = getCurrentUser(request)
    if (!me) return unauthorized(request)
    if (!permissionsOf(me.role).includes('user:read')) {
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
    if (!me) return unauthorized(request)
    if (!permissionsOf(me.role).includes('user:delete')) {
      return errorResponse(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    }

    const id = Number(params.id)
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy người dùng')
    if (id === me.id) return errorResponse(403, 'FORBIDDEN', 'Bạn không thể xóa chính mình')

    const removed = users[index]
    users.splice(index, 1)
    return HttpResponse.json({ message: `Đã xóa người dùng ${removed.fullName}` })
  }),

    http.post('/api/v1/users', async ({ request }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return unauthorized(request)
    if (!permissionsOf(me.role).includes('user:create')) {
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
    if (!me) return unauthorized(request)
    if (!permissionsOf(me.role).includes('user:update')) {
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
    const g = guard(request, 'role:read')
    if ('error' in g) return g.error
    return HttpResponse.json(roles.map(toRoleItem))
  }),

  http.get('/api/v1/permissions', async ({ request }) => {
    await delay(200)
    const g = guard(request, 'role:read')
    if ('error' in g) return g.error
    return HttpResponse.json(PERMISSION_GROUPS)
  }),

  http.post('/api/v1/roles', async ({ request }) => {
    await delay(300)
    const g = guard(request, 'role:create')
    if ('error' in g) return g.error

    const body = (await request.json()) as RoleBody
    const invalid = validateRole(body)
    if (invalid) return invalid

    const role: MockRole = {
      id: Math.max(...roles.map((r) => r.id)) + 1,
      name: body.name.trim().toUpperCase(),
      description: body.description?.trim() ?? '',
      permissions: body.permissions,
    }
    roles.push(role)
    return HttpResponse.json(toRoleItem(role), { status: 201 })
  }),

  http.patch('/api/v1/roles/:id', async ({ request, params }) => {
    await delay(300)
    const g = guard(request, 'role:update')
    if ('error' in g) return g.error

    const role = roles.find((r) => r.id === Number(params.id))
    if (!role) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy vai trò')

    const body = (await request.json()) as RoleBody
    const invalid = validateRole(body, role.id)
    if (invalid) return invalid

    const newName = body.name.trim().toUpperCase()
    if (role.name === 'ADMIN') {
      // Chặn tự khóa mình ra khỏi hệ thống
      if (newName !== 'ADMIN') {
        return errorResponse(403, 'FORBIDDEN', 'Không thể đổi tên vai trò ADMIN')
      }
      if (!body.permissions.includes('role:read') || !body.permissions.includes('role:update')) {
        return errorResponse(403, 'FORBIDDEN', 'ADMIN phải luôn giữ quyền xem và sửa vai trò')
      }
    }

    // Người dùng lưu vai trò bằng tên, nên đổi tên vai trò thì cập nhật theo
    users.forEach((u) => {
      if (u.role === role.name) u.role = newName
    })
    role.name = newName
    role.description = body.description?.trim() ?? ''
    role.permissions = body.permissions
    return HttpResponse.json(toRoleItem(role))
  }),

  http.delete('/api/v1/roles/:id', async ({ request, params }) => {
    await delay(300)
    const g = guard(request, 'role:delete')
    if ('error' in g) return g.error

    const index = roles.findIndex((r) => r.id === Number(params.id))
    if (index === -1) return errorResponse(404, 'NOT_FOUND', 'Không tìm thấy vai trò')

    const role = roles[index]
    if (role.name === 'ADMIN') return errorResponse(403, 'FORBIDDEN', 'Không thể xóa vai trò ADMIN')

    const count = users.filter((u) => u.role === role.name).length
    if (count > 0) {
      return errorResponse(409, 'CONFLICT', `Vai trò đang có ${count} người dùng, hãy chuyển họ sang vai trò khác trước`)
    }

    roles.splice(index, 1)
    return HttpResponse.json({ message: `Đã xóa vai trò ${role.name}` })
  }),

    http.get('/api/v1/timetable/people', async ({ request }) => {
    await delay(300)

    const me = getCurrentUser(request)
    if (!me) return unauthorized(request)
    if (!permissionsOf(me.role).includes('timetable:read')) {
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
    if (!me) return unauthorized(request)

    const canReadAll = permissionsOf(me.role).includes('timetable:read')
    const canReadOwn = permissionsOf(me.role).includes('timetable:read_own')
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