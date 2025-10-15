import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      orderIndex: lesson.orderIndex ?? null,
      module: lesson.module
        ? { id: lesson.module.id, title: lesson.module.title }
        : null,
    };
  }
}