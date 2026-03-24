import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { DATA_SCOPE_KEY, DataScopeOptions } from './data-scope.decorator'
import { DataPermissionService } from './data-permission.service'

/**
 * Guard that enforces data scope (row-level) permissions.
 *
 * Reads the user's roles from request.user.roles and applies
 * appropriate filters based on @DataScope decorator configuration.
 *
 * The filter is stored in request.dataScopeFilter for use by services.
 */
@Injectable()
export class DataPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataPermissionService: DataPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const dataScopeOptions = this.reflector.getAllAndOverride<DataScopeOptions>(DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @DataScope decorator = skip this guard
    if (!dataScopeOptions) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    const { resourceType, checkFullAccess = true } = dataScopeOptions

    // Get user's role codes
    const roleIds: string[] = user.roles || []
    const userId: string | undefined = user.id

    if (roleIds.length === 0) {
      throw new ForbiddenException('No roles assigned')
    }

    // Generate data scope filter
    const scopeResult = await this.dataPermissionService.generateFilter(
      roleIds,
      resourceType,
      userId,
    )

    // Store filter in request for services to use
    request.dataScopeFilter = scopeResult.filter
    request.dataScopeFullAccess = scopeResult.hasFullAccess

    // If user has full access or no restrictions, allow
    if (scopeResult.hasFullAccess) {
      return true
    }

    // If checkFullAccess is false, allow even without full access
    // (useful for list pages that show partial data with masks)
    if (!checkFullAccess) {
      return true
    }

    // Otherwise deny access to this resource
    throw new ForbiddenException(`No data permission for resource: ${resourceType}`)
  }
}
