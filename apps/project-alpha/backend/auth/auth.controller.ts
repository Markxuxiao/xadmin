import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

class LoginDto {
  username!: string
  password!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    const user = this.authService.validateUser(dto.username, dto.password)
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    const { password: _, ...userWithoutPassword } = user
    const token = this.authService.generateToken(userWithoutPassword)
    return {
      success: true,
      data: {
        token,
        expiresAt: Date.now() + 15 * 60 * 1000,
        user: userWithoutPassword,
      },
    }
  }
}
