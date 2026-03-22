import { Injectable } from '@nestjs/common'
import { UserService } from '../user/user.service'

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateUser(username: string, password: string) {
    return this.userService.authenticate(username, password)
  }

  generateToken(user: any) {
    return this.userService.generateToken(user)
  }
}
