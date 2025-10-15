const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const user = await prisma.user.create({
    data: {
      job: 'Product Manager',
      sector: 'Retail',
      aiLevel: 'Intermediate',
      toolsUsed: ['ChatGPT', 'GitHub Copilot', 'Midjourney'],
      workStyle: 'Hybrid',
      courses: {
        create: {
          title: 'AI for Business Efficiency',
          rawAiTools: [
            { name: 'ChatGPT', useCases: ['Customer support', 'Content drafting'] },
            { name: 'Copilot', useCases: ['Code assistance', 'Automation'] }
          ],
          rawBestPractices: [
            'Start with clear problem statements',
            'Measure outcomes and iterate',
            'Ensure privacy and compliance',
          ],
          summary: {
            goals: ['Reduce operational cost', 'Improve customer satisfaction'],
            kpis: ['CSAT', 'Resolution Time'],
          },
          modules: {
            create: [
              {
                title: 'Foundations of AI in Business',
                description: 'Understand core AI concepts and business applications.',
                objectives: ['Understand ML vs. rules', 'Identify AI opportunities'],
                chatbotContext: 'Tutor focuses on business applications and examples.',
                orderIndex: 1,
                lessons: {
                  create: [
                    {
                      title: 'What is AI?',
                      content: 'AI is a set of techniques enabling machines to perform tasks requiring human intelligence.',
                      orderIndex: 1,
                    },
                    {
                      title: 'Business Use Cases',
                      content: 'Common applications: support, forecasting, personalization, automation.',
                      orderIndex: 2,
                    },
                  ],
                },
                quizzes: {
                  create: [
                    {
                      question: 'Which is a typical AI use case in retail?',
                      options: ['Brick layout design', 'Demand forecasting', 'Manual stock taking', 'Paper invoicing'],
                      answer: 'Demand forecasting',
                      orderIndex: 1,
                    },
                  ],
                },
              },
              {
                title: 'Operationalizing AI',
                description: 'From pilot to production and scaling.',
                objectives: ['Define KPI baseline', 'Plan deployment and governance'],
                chatbotContext: 'Focus on deployment steps and change management.',
                orderIndex: 2,
                lessons: {
                  create: [
                    {
                      title: 'From POC to Production',
                      content: 'Steps: validate, integrate, monitor, iterate.',
                      orderIndex: 1,
                    },
                  ],
                },
                quizzes: {
                  create: [
                    {
                      question: 'What is crucial before scaling an AI pilot?',
                      options: ['Large budget', 'Strong team morale', 'Defined KPI success criteria', 'Executive fashion'],
                      answer: 'Defined KPI success criteria',
                      orderIndex: 1,
                    },
                  ],
                },
              },
            ],
          },
          bestPractices: {
            create: {
              items: [
                'Document assumptions and data sources',
                'Use human-in-the-loop for critical flows',
                'Monitor drift and maintain models',
              ],
            },
          },
        },
      },
    },
    include: {
      courses: {
        include: {
          modules: { include: { lessons: true, quizzes: true } },
          bestPractices: true,
        },
      },
    },
  });

  console.log('Seed completed. Created user and course IDs:', {
    userId: user.id,
    courseIds: user.courses.map((c) => c.id),
  });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });