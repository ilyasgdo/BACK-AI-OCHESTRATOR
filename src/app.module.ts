import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ProfileModule } from './modules/profile/profile.module';
import { CourseModule } from './modules/course/course.module';
import { ModuleModule } from './modules/module/module.module';
import { HealthController } from './health.controller';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { LessonModule } from './modules/lesson/lesson.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }]),
    ProfileModule,
    CourseModule,
    ModuleModule,
    LessonModule,
    AiModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
