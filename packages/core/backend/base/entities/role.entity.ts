export interface RoleRow {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToRole(row: RoleRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    permissions: JSON.parse(row.permissions),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
