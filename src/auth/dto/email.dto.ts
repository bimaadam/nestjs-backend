// email.dto.ts (jika butuh validasi email saja)
import { IsEmail } from 'class-validator';

export class EmailDto {
  @IsEmail()
  email: string;
}