import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import bcrypt from 'bcryptjs';

type RegisterInput = {
  email: string;
  password: string;
  job?: string;
  sector?: string;
  ai_level?: string;
  tools_used?: any;
  work_style?: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async register(input: RegisterInput) {
    const hash = await bcrypt.hash(input.password, 10);
    // Valeurs par défaut pour satisfaire schéma User existant
    const job = input.job ?? 'N/A';
    const sector = input.sector ?? 'N/A';
    const aiLevel = input.ai_level ?? 'beginner';
    const toolsUsed = input.tools_used ?? [];
    const workStyle = input.work_style ?? 'unspecified';
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hash,
        job,
        sector,
        aiLevel,
        toolsUsed,
        workStyle,
      },
    });
  }

  async verifyPassword(user: any, password: string) {
    const hash = user?.passwordHash as string | null;
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }
}