import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authService = new AuthService(
    {} as Repository<User>,
    {} as JwtService,
    {} as ConfigService,
  );

  it('rejects an email address with a one-character top-level domain', async () => {
    await expect(
      authService.register({
        fullName: 'Jane Doe',
        email: 'jane@a.a',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      }),
    ).rejects.toThrow('Bad Request / Please provide a valid email address.');
  });
});
