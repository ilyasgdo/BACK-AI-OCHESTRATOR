import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ModuleController],
  providers: [ModuleService, PrismaService],
})
export class ModuleModule {}