import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('Course & Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('/health (GET) should be ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('/course/:id (GET) aggregate should match latest course', async () => {
    const course = await prisma.course.findFirst({ orderBy: { createdAt: 'desc' } });
    expect(course).toBeTruthy();
    if (!course) return;

    const res = await request(app.getHttpServer()).get(`/course/${course.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', course.id);
    expect(typeof res.body.title).toBe('string');
    expect(res.body).toHaveProperty('rawAiTools');
    expect(res.body).toHaveProperty('rawBestPractices');
    expect(res.body).toHaveProperty('modules');
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(res.body).toHaveProperty('best_practices');
  });

  it('/module/:id (GET) should return details for each module', async () => {
    const course = await prisma.course.findFirst({ orderBy: { createdAt: 'desc' } });
    expect(course).toBeTruthy();
    if (!course) return;

    const modules = await prisma.module.findMany({ where: { courseId: course.id }, orderBy: { orderIndex: 'asc' } });
    expect(modules.length).toBeGreaterThan(0);

    for (const m of modules) {
      const res = await request(app.getHttpServer()).get(`/module/${m.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('module_id', m.id);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('lessons');
      expect(Array.isArray(res.body.lessons)).toBe(true);
      expect(res.body).toHaveProperty('quiz');
      expect(Array.isArray(res.body.quiz)).toBe(true);
      expect(res.body).toHaveProperty('chatbot_context');
    }
  });
});