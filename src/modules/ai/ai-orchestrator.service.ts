import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './llm.service';
import { ensureJsonResponse as ensureJsonFromText } from '../../common/json';

@Injectable()
export class AiOrchestratorService {
  constructor(private readonly llm: LlmService, private readonly prisma: PrismaService) {}

  async runPipelineForUser(userId: string): Promise<{ courseId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // IA #1 — outils + bonnes pratiques
    const tpRaw = await this.llm.toolsPractices(user);
    const tp = ensureJsonFromText(tpRaw);

    // IA #2 — parcours/modules
    const courseRaw = await this.llm.generateCourse(user, tp.ai_tools);
    const courseJson = ensureJsonFromText(courseRaw);

    // Persister course
    const course = await this.prisma.course.create({
      data: {
        userId: user.id,
        title: courseJson.title,
        rawAiTools: tp.ai_tools,
        rawBestPractices: tp.best_practices,
      },
    });

    // IA #3 — pour chaque module
    let orderIndex = 0;
    for (const m of courseJson.modules) {
      const modRaw = await this.llm.generateModule(m);
      const modJson = ensureJsonFromText(modRaw);
      const module = await this.prisma.module.create({
        data: {
          courseId: course.id,
          title: modJson.title,
          description: m.description,
          objectives: m.objectives,
          chatbotContext:
            typeof modJson.chatbot_context === 'string'
              ? modJson.chatbot_context
              : JSON.stringify(modJson.chatbot_context ?? ''),
          orderIndex: orderIndex++,
        },
      });

      // Leçons
      let lIndex = 0;
      for (const l of modJson.lessons) {
        await this.prisma.lesson.create({
          data: { moduleId: module.id, title: l.title, content: l.content, orderIndex: lIndex++ },
        });
      }
      // Quiz
      let qIndex = 0;
      for (const q of modJson.quiz) {
        await this.prisma.quiz.create({
          data: { moduleId: module.id, question: q.question, options: q.options, answer: q.answer, orderIndex: qIndex++ },
        });
      }
    }

    // IA #4 — résumé + certificat
    const summaryRaw = await this.llm.generateSummary({ title: course.title, modules: courseJson.modules });
    const summaryJson = ensureJsonFromText(summaryRaw);

    await this.prisma.course.update({ where: { id: course.id }, data: { summary: summaryJson } });

    // Best Practices table (optionnel)
    await this.prisma.bestPractices.create({ data: { courseId: course.id, items: tp.best_practices } });

    return { courseId: course.id };
  }
}