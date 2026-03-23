export interface UserRow {
  id: string
  username: string
  password: string
  nickname: string
  avatar: string | null
  roles: string
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    roles: JSON.parse(row.roles),
    permissions: JSON.parse(row.permissions),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
