import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'

class LoginDto {
  username!: string
  password!: string
}

class RefreshDto {
  refreshToken!: string
}

class LogoutDto {
  refreshToken?: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.authenticate(dto.username, dto.password)
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    const { accessToken, refreshToken, expiresAt } = this.authService.generateToken(user)
    this.authService.registerOnline(accessToken, user)
    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
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

  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken)
    if (!result) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
    return {
      success: true,
      data: result,
    }
  }

  @Post('logout')
  @ApiOperation({ summary: '用户登出' })
  async logout(@Body() dto: LogoutDto) {
    if (dto.refreshToken) {
      this.authService.revokeRefreshToken(dto.refreshToken)
    }
    return { success: true }
  }
}
