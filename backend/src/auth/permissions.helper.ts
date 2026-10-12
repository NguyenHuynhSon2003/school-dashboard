export function getPermissionsByRole(roleName: string): string[] {
  switch (roleName?.toUpperCase()) {
    case 'ADMIN':
      return [
        'user:read',
        'user:create',
        'user:update',
        'user:delete',
        'role:read',
        'timetable:read',
        'timetable:manage',
      ];
    case 'STAFF':
      return [
        'user:read',
        'user:create',
        'user:update',
        'timetable:read',
        'timetable:manage',
      ];
    case 'TEACHER':
    case 'STUDENT':
      return ['timetable:read_own'];
    default:
      return [];
  }
}