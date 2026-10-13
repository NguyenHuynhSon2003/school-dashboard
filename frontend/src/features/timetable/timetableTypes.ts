import type { Role } from '../auth/authSlice'

export interface Lesson {
  id: number
  dayOfWeek: number // 1 = Thứ Hai ... 5 = Thứ Sáu
  period: number // 1 đến 5
  startTime: string
  endTime: string
  subject: string
  className: string
  teacherName: string
  room: string
}

export interface TimetableOwner {
  id: number
  fullName: string
  role: Role
  className: string | null // chỉ học sinh mới có lớp
}

export interface TimetableResponse {
  weekStart: string
  owner: TimetableOwner
  items: Lesson[]
}