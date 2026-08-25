import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
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
}
