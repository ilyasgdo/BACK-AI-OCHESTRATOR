// Minimal .env loader to ensure DATABASE_URL is available for Prisma
try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '..', '.env');
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
} catch (_) {
  // ignore env load errors; Prisma may still have env set externally
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.user.findMany({
      include: { courses: { include: { modules: true, bestPractices: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    const out = users.map((u) => ({
      userId: u.id,
      job: u.job,
      courses: u.courses.map((c) => ({
        courseId: c.id,
        title: c.title,
        modules: c.modules.map((m) => ({ moduleId: m.id, title: m.title })),
      })),
    }));
    const json = JSON.stringify(out, null, 2);
    try {
      const fs = require('fs');
      const path = require('path');
      const outPath = path.join(__dirname, 'seed_ids.json');
      fs.writeFileSync(outPath, json + '\n', 'utf8');
    } catch (_) {}
    console.log(json);
  } catch (e) {
    try {
      const fs = require('fs');
      const path = require('path');
      const errPath = path.join(__dirname, 'seed_error.log');
      fs.writeFileSync(errPath, String(e && e.stack ? e.stack : e), 'utf8');
    } catch (_) {}
    console.error('List error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();