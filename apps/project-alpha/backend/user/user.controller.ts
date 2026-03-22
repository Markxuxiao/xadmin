import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getCurrentUser(@Req() req: any) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token')
    }
    const token = authHeader.slice(7)
    const user = this.userService.getCurrentUser(token)
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token')
    }
    return { success: true, data: user }
  }
}
