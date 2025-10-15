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
      lessons: mod.lessons.map((l) => ({ title: l.title, content: l.content })),
      quiz: mod.quizzes.map((q) => ({ question: q.question, options: q.options as string[], answer: q.answer })),
      chatbot_context: mod.chatbotContext ?? '',
    };
  }
}