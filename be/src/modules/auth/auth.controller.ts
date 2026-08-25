import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Exposes public account authentication endpoints. */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Registers a visitor and returns an authenticated session. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /** Authenticates a visitor with a normalized email and password. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /** MỌI THỨ DƯỚI ĐÂY LÀ ĐỂ DỄ DÀNG TEST */
  @Get('seed')
  async seedTestUser() {
    try {
      return await this.authService.register({
        fullName: 'Super Tester',
        email: 'supertester99@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    } catch (e) {
      if (e.message.includes('Conflict')) {
        return this.authService.login({
          email: 'supertester99@example.com',
          password: 'Password123!'
        });
      }
      return { success: false, message: e.message };
    }
  }
}
