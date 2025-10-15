import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async getAggregate(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: true,
        bestPractices: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    return {
      id: course.id,
      title: course.title,
      rawAiTools: course.rawAiTools,
      rawBestPractices: course.rawBestPractices,
      summary: course.summary,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        objectives: m.objectives,
        orderIndex: m.orderIndex,
      })),
      best_practices: course.bestPractices?.items ?? null,
    };
  }

  async getByUser(userId: string) {
    const courses = await this.prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { modules: true },
    });
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      modulesCount: c.modules.length,
    }));
  }
}