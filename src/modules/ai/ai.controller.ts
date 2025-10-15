import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
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
}