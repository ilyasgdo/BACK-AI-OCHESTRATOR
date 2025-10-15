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
  if (url && url.startsWith('prisma+postgres://')) {
    return url.replace('prisma+postgres://', 'postgresql://');
  }
  return url;
}

async function run() {
  loadEnv();
  const rawUrl = process.env.DATABASE_URL;
  const url = normalizeUrl(rawUrl);
  const client = new Client({ connectionString: url });
  await client.connect();
  const q = (text, params) => client.query(text, params);
  try {
    const users = await q('SELECT COUNT(*)::int AS c FROM "User"');
    const courses = await q('SELECT COUNT(*)::int AS c FROM "Course"');
    const modules = await q('SELECT COUNT(*)::int AS c FROM "Module"');
    const lessons = await q('SELECT COUNT(*)::int AS c FROM "Lesson"');
    const quizzes = await q('SELECT COUNT(*)::int AS c FROM "Quiz"');
    const bp = await q('SELECT COUNT(*)::int AS c FROM "BestPractices"');
    console.log('Counts:', {
      users: users.rows[0].c,
      courses: courses.rows[0].c,
      modules: modules.rows[0].c,
      lessons: lessons.rows[0].c,
      quizzes: quizzes.rows[0].c,
      bestPractices: bp.rows[0].c,
    });
  } catch (e) {
    console.error('Counts error:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();