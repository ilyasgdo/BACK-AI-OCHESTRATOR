const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
          v = v.slice(1, -1);
        }
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
    });
  }
}

function normalizeUrl(url) {
  // Convert prisma+postgres:// to postgresql:// for pg client
  if (url && url.startsWith('prisma+postgres://')) {
    return url.replace('prisma+postgres://', 'postgresql://');
  }
  return url;
}

async function run() {
  loadEnv();
  const rawUrl = process.env.DATABASE_URL;
  const url = normalizeUrl(rawUrl);
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  // Simple helper to run parameterized queries
  const q = (text, params) => client.query(text, params);
  const uuid = () => require('crypto').randomUUID();

  try {
    await q('BEGIN');

    const userId = uuid();
    const courseId = uuid();
    const mod1Id = uuid();
    const mod2Id = uuid();
    const lesson1Id = uuid();
    const lesson2Id = uuid();
    const quiz1Id = uuid();
    const bestPracticesId = uuid();

    // User
    await q(
      `INSERT INTO "User" ("id", "job", "sector", "aiLevel", "toolsUsed", "workStyle")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        userId,
        'Product Manager',
        'Retail',
        'Intermediate',
        JSON.stringify(['ChatGPT', 'GitHub Copilot', 'Midjourney']),
        'Hybrid',
      ],
    );

    // Course
    await q(
      `INSERT INTO "Course" ("id", "userId", "title", "rawAiTools", "rawBestPractices", "summary")
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
      [
        courseId,
        userId,
        'AI for Business Efficiency',
        JSON.stringify([
          { name: 'ChatGPT', useCases: ['Customer support', 'Content drafting'] },
          { name: 'Copilot', useCases: ['Code assistance', 'Automation'] },
        ]),
        JSON.stringify([
          'Start with clear problem statements',
          'Measure outcomes and iterate',
          'Ensure privacy and compliance',
        ]),
        JSON.stringify({ goals: ['Reduce operational cost', 'Improve customer satisfaction'], kpis: ['CSAT', 'Resolution Time'] }),
      ],
    );

    // Modules
    await q(
      `INSERT INTO "Module" ("id", "courseId", "title", "description", "objectives", "chatbotContext", "orderIndex")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        mod1Id,
        courseId,
        'Foundations of AI in Business',
        'Understand core AI concepts and business applications.',
        JSON.stringify(['Understand ML vs. rules', 'Identify AI opportunities']),
        'Tutor focuses on business applications and examples.',
        1,
      ],
    );

    await q(
      `INSERT INTO "Module" ("id", "courseId", "title", "description", "objectives", "chatbotContext", "orderIndex")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        mod2Id,
        courseId,
        'Operationalizing AI',
        'From pilot to production and scaling.',
        JSON.stringify(['Define KPI baseline', 'Plan deployment and governance']),
        'Focus on deployment steps and change management.',
        2,
      ],
    );

    // Lessons for module 1
    await q(
      `INSERT INTO "Lesson" ("id", "moduleId", "title", "content", "orderIndex") VALUES ($1, $2, $3, $4, $5)`,
      [
        lesson1Id,
        mod1Id,
        'What is AI?',
        'AI is a set of techniques enabling machines to perform tasks requiring human intelligence.',
        1,
      ],
    );
    await q(
      `INSERT INTO "Lesson" ("id", "moduleId", "title", "content", "orderIndex") VALUES ($1, $2, $3, $4, $5)`,
      [
        lesson2Id,
        mod1Id,
        'Business Use Cases',
        'Common applications: support, forecasting, personalization, automation.',
        2,
      ],
    );

    // Quiz for module 1
    await q(
      `INSERT INTO "Quiz" ("id", "moduleId", "question", "options", "answer", "orderIndex")
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [
        quiz1Id,
        mod1Id,
        'Which is a typical AI use case in retail?',
        JSON.stringify(['Brick layout design', 'Demand forecasting', 'Manual stock taking', 'Paper invoicing']),
        'Demand forecasting',
        1,
      ],
    );

    // BestPractices for course
    await q(
      `INSERT INTO "BestPractices" ("id", "courseId", "items")
       VALUES ($1, $2, $3::jsonb)`,
      [
        bestPracticesId,
        courseId,
        JSON.stringify([
          'Document assumptions and data sources',
          'Use human-in-the-loop for critical flows',
          'Monitor drift and maintain models',
        ]),
      ],
    );

    await q('COMMIT');

    console.log('SQL seed completed.', {
      userId,
      courseId,
      moduleIds: [mod1Id, mod2Id],
    });
  } catch (e) {
    await q('ROLLBACK');
    console.error('SQL seed error:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();