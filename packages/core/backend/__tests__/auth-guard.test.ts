import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthGuard } from '../core/user/auth.guard'
import { UserService } from '../core/user/user.service'

describe('AuthGuard', () => {
  let authGuard: AuthGuard
  let mockUserService: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserService = vi.fn(() => ({
      verifyToken: vi.fn(),
      getCurrentUser: vi.fn(),
    }))()
    authGuard = new AuthGuard(mockUserService as any)
  })

  function createMockExecutionContext(authHeader?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
          user: undefined as any,
        }),
      }),
    }
  }

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no authorization header', () => {
      const context = createMockExecutionContext()

      expect(() => authGuard.canActivate(context as any)).toThrow('Missing token')
    })

    it('should throw UnauthorizedException when header does not start with Bearer', () => {
      const context = createMockExecutionContext('Basic sometoken')

      expect(() => authGuard.canActivate(context as any)).toThrow('Missing token')
    })

    it('should throw UnauthorizedException for invalid token', () => {
      mockUserService.getCurrentUser.mockReturnValue(null)
      const context = createMockExecutionContext('Bearer invalid_token')

      expect(() => authGuard.canActivate(context as any)).toThrow('Invalid or expired token')
    })

    it('should attach user to request and return true for valid token', () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        nickname: '管理员',
        permissions: ['user:list'],
        roles: ['admin'],
      }
      mockUserService.getCurrentUser.mockReturnValue(mockUser)

      const request = { headers: { authorization: 'Bearer valid_token' }, user: undefined }
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      }

      const result = authGuard.canActivate(context as any)

      expect(result).toBe(true)
      expect(request.user).toEqual(mockUser)
      expect(mockUserService.getCurrentUser).toHaveBeenCalledWith('valid_token')
    })
  })
})
