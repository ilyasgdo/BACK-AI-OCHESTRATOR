import { Body, ConflictException, Controller, NotFoundException, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(6)
  password!: string;
  @IsOptional() @IsString()
  job?: string;
  @IsOptional() @IsString()
  sector?: string;
  @IsOptional() @IsString()
  ai_level?: string;
  @IsOptional()
  tools_used?: any;
  @IsOptional() @IsString()
  work_style?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const exists = await this.service.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email déjà utilisé');
    const user = await this.service.register(dto);
    return { user_id: user.id };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.service.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const ok = await this.service.verifyPassword(user, dto.password);
    if (!ok) throw new ConflictException('Identifiants invalides');
    return { user_id: user.id };
  }
}