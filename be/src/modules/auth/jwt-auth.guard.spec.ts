import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard (Flow 4 & EF-1: Unauthorized Request)', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockExecutionContext = (authorizationHeader?: string): { context: ExecutionContext; request: Record<string, any> } => {
    const request: Record<string, any> = {
      headers: authorizationHeader !== undefined ? { authorization: authorizationHeader } : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    userRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    guard = new JwtAuthGuard(jwtService, configService, userRepository);
  });

  describe('Flow 4: Happy path authentication', () => {
    it('validates JWT, resolves User from database, and attaches user identifier (userId) to request', async () => {
      const validUserId = 42;
      const { context, request } = mockExecutionContext('Bearer valid.jwt.token');

      jwtService.verifyAsync.mockResolvedValue({ sub: validUserId });
      userRepository.findOne.mockResolvedValue({ userId: validUserId } as User);

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token', { secret: 'test-secret-key' });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: validUserId },
        select: { userId: true },
      });
      expect(request.user).toEqual({ userId: validUserId });
    });

    it('accepts string representation of valid positive integer userId in JWT sub', async () => {
      const { context, request } = mockExecutionContext('Bearer valid.jwt.token');

      jwtService.verifyAsync.mockResolvedValue({ sub: '10' });
      userRepository.findOne.mockResolvedValue({ userId: 10 } as User);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({ userId: 10 });
    });
  });

  describe('EF-1: Unauthorized requests (4a)', () => {
    it('throws UnauthorizedException when Authorization header is missing', async () => {
      const { context } = mockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized');
    });

    it('throws UnauthorizedException when Authorization header format is not Bearer', async () => {
      const { context } = mockExecutionContext('Basic dXNlcjpwYXNz');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Bearer token is empty', async () => {
      const { context } = mockExecutionContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when JWT_SECRET is not configured in ConfigService', async () => {
      configService.get.mockReturnValue(undefined);
      const { context } = mockExecutionContext('Bearer token.without.secret');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token verification fails (invalid/expired token)', async () => {
      const { context } = mockExecutionContext('Bearer expired.or.invalid.token');
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when sub is missing or not a positive integer (<= 0)', async () => {
      const { context: contextMissingSub } = mockExecutionContext('Bearer valid.token');
      jwtService.verifyAsync.mockResolvedValue({});
      await expect(guard.canActivate(contextMissingSub)).rejects.toThrow(UnauthorizedException);

      const { context: contextZeroSub } = mockExecutionContext('Bearer valid.token');
      jwtService.verifyAsync.mockResolvedValue({ sub: 0 });
      await expect(guard.canActivate(contextZeroSub)).rejects.toThrow(UnauthorizedException);

      const { context: contextNegativeSub } = mockExecutionContext('Bearer valid.token');
      jwtService.verifyAsync.mockResolvedValue({ sub: -5 });
      await expect(guard.canActivate(contextNegativeSub)).rejects.toThrow(UnauthorizedException);

      const { context: contextNanSub } = mockExecutionContext('Bearer valid.token');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'abc' });
      await expect(guard.canActivate(contextNanSub)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user id in token does not exist in database', async () => {
      const { context } = mockExecutionContext('Bearer valid.token');
      jwtService.verifyAsync.mockResolvedValue({ sub: 9999 });
      userRepository.findOne.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
