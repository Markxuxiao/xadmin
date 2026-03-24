import { SetMetadata } from '@nestjs/common'

export const DATA_SCOPE_KEY = 'data_scope'

export interface DataScopeOptions {
  /** Resource type this endpoint accesses (e.g., 'user', 'department') */
  resourceType: string
  /** Whether to include full access check (default: true) */
  checkFullAccess?: boolean
}

/**
 * Decorator to mark a route as requiring data scope filtering.
 *
 * Usage:
 * ```ts
 * @Controller('user')
 * @UseGuards(AuthGuard, DataPermissionGuard)
 * @DataScope({ resourceType: 'user' })
 * export class UserController {
 *   @Get()
 *   async findAll() { ... }
 * }
 * ```
 *
 * The DataPermissionGuard will automatically apply row-level filters
 * based on the current user's roles and the resource type.
 */
export const DataScope = (options: DataScopeOptions) =>
  SetMetadata(DATA_SCOPE_KEY, options)
