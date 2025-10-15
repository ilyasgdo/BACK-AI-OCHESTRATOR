import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    const tools = Array.isArray(dto.tools_used) ? dto.tools_used : [];

    if (dto.user_id) {
      const existing = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
      if (!existing) {
        throw new NotFoundException('User not found');
      }
      const updated = await this.prisma.user.update({
        where: { id: dto.user_id },
        data: {
          job: dto.job,
          sector: dto.sector,
          aiLevel: dto.ai_level,
          toolsUsed: tools,
          workStyle: dto.work_style,
        },
      });
      return {
        user_id: updated.id,
        job: updated.job,
        sector: updated.sector,
        ai_level: updated.aiLevel,
        tools_used: updated.toolsUsed,
        work_style: updated.workStyle,
      };
    }

    const created = await this.prisma.user.create({
      data: {
        job: dto.job,
        sector: dto.sector,
        aiLevel: dto.ai_level,
        toolsUsed: tools,
        workStyle: dto.work_style,
      },
    });
    return {
      user_id: created.id,
      job: created.job,
      sector: created.sector,
      ai_level: created.aiLevel,
      tools_used: created.toolsUsed,
      work_style: created.workStyle,
    };
  }
}