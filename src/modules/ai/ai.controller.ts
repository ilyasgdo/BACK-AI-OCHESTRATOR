import { Body, Controller, NotFoundException, Post, Param, BadRequestException } from '@nestjs/common';
import { IsDefined, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureJsonResponse as ensureJsonFromText } from '../../common/json';
import { LlmService } from './llm.service';
import { AiOrchestratorService } from './ai-orchestrator.service';

class ToolsPracticesDto {
  @IsString()
  user_id!: string;
}

class GenerateCourseDto {
  @IsString()
  user_id!: string;
  @IsDefined()
  ai_tools!: { name: string; category: string; use_case: string }[];
}

class GenerateModuleDto {
  @IsString()
  course_id!: string;
  @IsDefined()
  module_index_or_id!: number | string;
  @IsDefined()
  module!: { title: string; description: string; objectives: string[] };
}

class GenerateSummaryDto {
  @IsString()
  course_id!: string;
}

class RunPipelineDto {
  @IsString()
  user_id!: string;
}

class ChatModuleDto {
  @IsString()
  message!: string;
}

class GenerateLessonsDto {
  @IsString()
  module_id!: string;
}

class DevelopLessonDto {
  @IsString()
  lesson_id!: string;
}

class ContinueLessonDto {
  @IsString()
  lesson_id!: string;
}

@Controller()
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  @Post('/ai/tools-practices')
  async toolsPractices(@Body() dto: ToolsPracticesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
    if (!user) throw new NotFoundException('User not found');

    const raw = await this.llm.toolsPractices(user);
    const json = ensureJsonFromText(raw);
    return json;
  }

  @Post('/ai/generate-course')
  async generateCourse(@Body() dto: GenerateCourseDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
    if (!user) throw new NotFoundException('User not found');

    const raw = await this.llm.generateCourse(user, dto.ai_tools);
    const courseJson = ensureJsonFromText(raw);

    const course = await this.prisma.course.create({
      data: {
        userId: user.id,
        title: courseJson.title,
        rawAiTools: dto.ai_tools,
        rawBestPractices: [],
      },
    });

    return {
      course_id: course.id,
      title: course.title,
      modules: courseJson.modules,
    };
  }

  @Post('/ai/generate-module')
  async generateModule(@Body() dto: GenerateModuleDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.course_id } });
    if (!course) throw new NotFoundException('Course not found');

    const raw = await this.llm.generateModule(dto.module);
    const modJson = ensureJsonFromText(raw);

    // Determine order index
    let orderIndex = 0;
    if (typeof dto.module_index_or_id === 'number') {
      orderIndex = dto.module_index_or_id;
    } else {
      const count = await this.prisma.module.count({ where: { courseId: course.id } });
      orderIndex = count;
    }

    const module = await this.prisma.module.create({
      data: {
        courseId: course.id,
        title: modJson.title,
        description: dto.module.description,
        objectives: dto.module.objectives,
        chatbotContext:
          typeof modJson.chatbot_context === 'string'
            ? modJson.chatbot_context
            : JSON.stringify(modJson.chatbot_context ?? ''),
        orderIndex,
      },
    });

    // Persist lessons
    let lIndex = 0;
    for (const l of modJson.lessons) {
      await this.prisma.lesson.create({
        data: { moduleId: module.id, title: l.title, content: l.content, orderIndex: lIndex++ },
      });
    }
    // Persist quizzes
    let qIndex = 0;
    for (const q of modJson.quiz) {
      await this.prisma.quiz.create({
        data: { moduleId: module.id, question: q.question, options: q.options, answer: q.answer, orderIndex: qIndex++ },
      });
    }

    return {
      module_id: module.id,
      title: module.title,
      lessons: modJson.lessons,
      quiz: modJson.quiz,
      chatbot_context: modJson.chatbot_context,
    };
  }

  @Post('/ai/generate-summary')
  async generateSummary(@Body() dto: GenerateSummaryDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.course_id }, include: { modules: true } });
    if (!course) throw new NotFoundException('Course not found');

    const raw = await this.llm.generateSummary({ title: course.title, modules: course.modules });
    const sumJson = ensureJsonFromText(raw);

    await this.prisma.course.update({ where: { id: course.id }, data: { summary: sumJson } });

    return sumJson;
  }

  @Post('/ai/run-pipeline')
  async runPipeline(@Body() dto: RunPipelineDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
    if (!user) throw new NotFoundException('User not found');
    const result = await this.orchestrator.runPipelineForUser(dto.user_id);
    return { course_id: result.courseId };
  }

  @Post('/chat/module/:id')
  async chatModule(@Param('id') id: string, @Body() dto: ChatModuleDto) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');

    const context =
      typeof module.chatbotContext === 'string'
        ? module.chatbotContext
        : JSON.stringify(module.chatbotContext ?? '');

    const raw = await this.llm.chatWithContext(context, dto.message);
    const json = ensureJsonFromText(raw);
    return json;
  }

  @Post('/ai/generate-lessons')
  async generateLessons(@Body() dto: GenerateLessonsDto) {
    const module = await this.prisma.module.findUnique({ where: { id: dto.module_id }, include: { lessons: true } });
    if (!module) throw new NotFoundException('Module not found');

    const raw = await this.llm.generateLessons({
      title: module.title,
      description: module.description ?? '',
      objectives: (module.objectives as any) ?? [],
    });
    const json = ensureJsonFromText(raw);

    let orderIndex = module.lessons.length;
    const created: Array<{ id: string; title: string; content: string; orderIndex?: number | null }> = [];
    for (const l of json.lessons ?? []) {
      const rec = await this.prisma.lesson.create({
        data: { moduleId: module.id, title: l.title, content: l.content, orderIndex: orderIndex++ },
      });
      created.push({ id: rec.id, title: rec.title, content: rec.content, orderIndex: rec.orderIndex ?? null });
    }
    return { lessons: created };
  }

  @Post('/ai/develop-lesson')
  async developLesson(@Body() dto: DevelopLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lesson_id },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const raw = await this.llm.developLesson({
      title: lesson.title,
      module_title: lesson.module?.title ?? '',
      description: lesson.module?.description ?? '',
      objectives: (lesson.module?.objectives as any) ?? [],
    });
    const json = ensureJsonFromText(raw);

    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        content: typeof json.content_json !== 'undefined'
          ? (typeof json.content_json === 'string' ? json.content_json : JSON.stringify(json.content_json))
          : String(json.content ?? lesson.content),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      orderIndex: updated.orderIndex ?? null,
    };
  }

  @Post('/ai/continue-lesson')
  async continueLesson(@Body() dto: ContinueLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lesson_id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Parse existing content JSON if any
    let existing: any = null;
    try {
      const obj = JSON.parse(String(lesson.content ?? ''));
      if (obj && typeof obj === 'object' && Array.isArray(obj.sections)) {
        existing = obj;
      }
    } catch (_) {}

    if (!existing) {
      existing = {
        title: lesson.title,
        sections: [
          { type: 'text', heading: 'Contenu initial', text: String(lesson.content ?? '') },
        ],
      };
    }

    const current = typeof existing.meta?.continuations === 'number' ? existing.meta.continuations : 0;
    const max = 10;
    if (current >= max) {
      throw new BadRequestException(`Limite de continuation atteinte (${max})`);
    }

    const raw = await this.llm.developLesson({
      title: lesson.title,
      module_title: lesson.module?.title ?? '',
      description: lesson.module?.description ?? '',
      objectives: (lesson.module?.objectives as any) ?? [],
      course_title: (lesson.module as any)?.course?.title ?? '',
    });
    const json = ensureJsonFromText(raw);

    const generatedSections = Array.isArray(json?.content_json?.sections)
      ? json.content_json.sections
      : Array.isArray(json?.sections)
      ? json.sections
      : [];

    const divider = {
      type: 'callout',
      variant: 'note',
      heading: `Suite ${current + 1}`,
      text: `Continuation basée sur le cours "${(lesson.module as any)?.course?.title ?? ''}"`,
    };

    existing.sections = [
      ...(Array.isArray(existing.sections) ? existing.sections : []),
      divider,
      ...generatedSections,
    ];
    existing.title = existing.title ?? (json?.content_json?.title ?? lesson.title);
    existing.meta = { ...(existing.meta ?? {}), continuations: current + 1, maxContinuations: max };

    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { content: JSON.stringify(existing) },
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      orderIndex: updated.orderIndex ?? null,
    };
  }
}