import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

interface JwtPayload {
  sub?: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: { userId: number };
}

/** Validates bearer tokens and attaches the authenticated user identifier. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Rejects missing, invalid, expired, or stale JWTs before protected actions run. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');

      if (!secret) {
        throw new UnauthorizedException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
      const userId = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub);

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new UnauthorizedException('Unauthorized');
      }

      const user = await this.userRepository.findOne({
        where: { userId },
        select: { userId: true },
      });

      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }

      request.user = { userId };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Unauthorized');
    }
  }

  /** Extracts a bearer token without accepting alternate authorization formats. */
  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    return scheme === 'Bearer' && token ? token : undefined;
  }
}
