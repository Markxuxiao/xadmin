import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'

class LoginDto {
  username!: string
  password!: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.username, dto.password)
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    const { token, expiresAt } = this.authService.generateToken(user)
    return {
      success: true,
      data: {
        token,
        expiresAt,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
          roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles,
        },
      },
    }
  }
}
