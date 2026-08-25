import { IsDefined, IsEmail, IsString } from 'class-validator';

/** Defines the public payload accepted by the account registration endpoint. */
export class RegisterDto {
  @IsDefined()
  @IsString()
  fullName: string;

  @IsDefined()
  @IsString()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsString()
  password: string;

  @IsDefined()
  @IsString()
  confirmPassword: string;
}
