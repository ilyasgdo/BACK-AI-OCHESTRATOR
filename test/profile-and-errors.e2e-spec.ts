import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Profile & Errors (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /profile should create a user profile', async () => {
    const payload = {
      job: 'Data Analyst',
      sector: 'Finance',
      ai_level: 'intermediate',
      tools_used: ['ChatGPT', 'Copilot'],
      work_style: 'hybrid',
    };

    const res = await request(app.getHttpServer()).post('/profile').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user_id');
    expect(typeof res.body.user_id).toBe('string');
    expect(res.body).toMatchObject({
      job: payload.job,
      sector: payload.sector,
      ai_level: payload.ai_level,
      work_style: payload.work_style,
    });
    expect(Array.isArray(res.body.tools_used)).toBe(true);
    expect(res.body.tools_used).toEqual(payload.tools_used);
  });

  it('GET /module/:id with invalid id should return 404', async () => {
    const invalidId = 'non-existent-id';
    const res = await request(app.getHttpServer()).get(`/module/${invalidId}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
    expect(res.body).toHaveProperty('path', `/module/${invalidId}`);
    // The global exception filter wraps HttpException.getResponse() under `message`
    // which may be a string or an object. We accept both.
    expect(res.body).toHaveProperty('message');
    const msg = res.body.message;
    if (typeof msg === 'string') {
      expect(msg).toContain('Module not found');
    } else if (typeof msg === 'object') {
      expect(msg.message).toContain('Module not found');
    }
  });
});