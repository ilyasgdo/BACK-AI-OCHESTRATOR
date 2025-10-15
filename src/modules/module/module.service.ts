import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(id: string) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { orderIndex: 'asc' } },
        quizzes: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return {
      module_id: mod.id,
      title: mod.title,
      description: mod.description ?? null,
      objectives: mod.objectives ?? null,
      orderIndex: mod.orderIndex ?? null,
      lessons: mod.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        content: l.content,
        orderIndex: l.orderIndex ?? null,
      })),
      quiz: mod.quizzes.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        answer: q.answer,
        orderIndex: q.orderIndex ?? null,
      })),
      chatbot_context:
        typeof mod.chatbotContext === 'string'
          ? mod.chatbotContext
          : JSON.stringify(mod.chatbotContext ?? ''),
    };
  }
}