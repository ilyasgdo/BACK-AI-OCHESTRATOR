import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    const user = await this.prisma.user.create({
      data: {
        job: dto.job,
        sector: dto.sector,
        aiLevel: dto.ai_level,
        toolsUsed: dto.tools_used,
        workStyle: dto.work_style,
      },
    });
    return {
      user_id: user.id,
      job: user.job,
      sector: user.sector,
      ai_level: user.aiLevel,
      tools_used: user.toolsUsed,
      work_style: user.workStyle,
    };
  }
}