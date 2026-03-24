import { Injectable } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { OnlineUserService } from '../online-user/online-user.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly onlineUserService: OnlineUserService,
  ) {}

  async validateUser(username: string, password: string) {
    return this.userService.authenticate(username, password)
  }

  generateToken(user: any) {
    const result = this.userService.generateToken(user)
    // Register online user after generating token
    this.onlineUserService.register({
      token: result.token,
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles || [],
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || [],
      loginAt: Date.now(),
    })
    return result
  }
}
