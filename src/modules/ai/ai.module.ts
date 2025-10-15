import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { LlmService } from './llm.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AiController],
  providers: [LlmService, AiOrchestratorService, PrismaService],
})
export class AiModule {}