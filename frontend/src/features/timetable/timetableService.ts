import axiosClient from '../../api/axiosClient'
import type { TimetableOwner, TimetableResponse } from './timetableTypes'

export const timetableService = {
  get: (params: { userId?: number; weekStart?: string }) =>
    axiosClient.get<TimetableResponse>('/timetable', { params }).then((res) => res.data),

  people: () => axiosClient.get<TimetableOwner[]>('/timetable/people').then((res) => res.data),
}