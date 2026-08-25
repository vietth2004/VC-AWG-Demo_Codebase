import { IsDefined, IsString } from 'class-validator';

/** Defines the public payload accepted by the account login endpoint. */
export class LoginDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  password: string;
}
