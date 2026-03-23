import { Injectable, UnauthorizedException } from '@nestjs/common'
import { CanActivate, ExecutionContext } from '@nestjs/common'
import { UserService } from './user.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token')
    }
    const token = authHeader.slice(7)
    const user = this.userService.getCurrentUser(token)
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token')
    }
    request.user = user
    return true
  }
}
