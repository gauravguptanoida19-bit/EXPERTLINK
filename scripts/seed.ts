import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { prisma } from '../apps/api/src/lib/prisma';
import { env } from '../apps/api/src/config/env';
import { logger } from '../apps/api/src/lib/logger';

// MongoDB ExpertProfile schema for seeding
const ExpertProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    headline: { type: String, required: true },
    bio: { type: String, required: true },
    industries: [{ type: String, index: true }],
    skills: [{ type: String, index: true }],
    yearsExperience: { type: Number, required: true },
    pastEngagements: [
      {
        topic: String,
        company: String,
        year: Number
      }
    ],
    hourlyRateUsd: { type: Number, required: true },
    availability: [{ type: String }],
    embedding: [{ type: Number }],
    rating: { type: Number, default: 5.0 }
  },
  { timestamps: true }
);

// MongoDB text search index on headline, bio, skills
ExpertProfileSchema.index({ headline: 'text', bio: 'text', skills: 'text' });

const MongoExpertProfile =
  mongoose.models.ExpertProfile || mongoose.model('ExpertProfile', ExpertProfileSchema);

const INDUSTRIES = [
  'Artificial Intelligence',
  'Biotechnology',
  'Renewable Energy',
  'Fintech',
  'Cybersecurity',
  'Semiconductors',
  'Supply Chain & Logistics',
  'Cloud Infrastructure',
  'Healthcare Systems',
  'Electric Vehicles'
];

const SKILLS_MAP: Record<string, string[]> = {
  'Artificial Intelligence': ['Large Language Models', 'Computer Vision', 'PyTorch', 'MLOps', 'Transformers', 'RLHF', 'Fine-tuning'],
  'Biotechnology': ['CRISPR', 'Genomics', 'Bioinformatics', 'Drug Discovery', 'Clinical Trials', 'Immunotherapy'],
  'Renewable Energy': ['Solar Photovoltaics', 'Battery Chemistry', 'Grid Modernization', 'Wind Turbines', 'Hydrogen Storage', 'Carbon Capture'],
  'Fintech': ['Algorithmic Trading', 'Blockchain', 'Payment Rails', 'Open Banking', 'Risk Modeling', 'Credit Scoring'],
  'Cybersecurity': ['Zero Trust', 'Threat Intelligence', 'Penetration Testing', 'SIEM', 'Cloud Security', 'Incident Response'],
  'Semiconductors': ['EUV Lithography', 'ASIC Design', 'Packaging', 'TSMC Process', 'EDA Tools', 'RISC-V Architecture'],
  'Supply Chain & Logistics': ['Warehouse Automation', 'Inventory Optimization', 'Route Planning', 'Port Logistics', 'Procurement'],
  'Cloud Infrastructure': ['Kubernetes', 'Serverless', 'Multi-cloud', 'Terraform', 'eBPF', 'High Availability'],
  'Healthcare Systems': ['EHR Integration', 'Telemedicine', 'Medical Devices', 'FDA Compliance', 'Health Informatics'],
  'Electric Vehicles': ['Powertrain', 'BMS', 'Solid-State Batteries', 'Fast Charging', 'Autonomous Driving', 'Vehicle Dynamics']
};

function generateDeterministicVector(seedString: string, dim = 384): number[] {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 997);
    vec.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

async function runSeed() {
  const isLarge = process.argv.includes('--large');
  logger.info(`Starting ExpertLink seed script (mode: ${isLarge ? 'LARGE (200k queries)' : 'STANDARD'})...`);

  // Connect Mongo
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');
  } catch (err) {
    logger.warn('Could not connect to MongoDB for seed. (Continuing if DB is mocked)');
  }

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Password123!', salt);

  logger.info('Upserting standard demo users (client, expert, admin)...');

  // 1. Demo Admin
  const adminUser = {
    id: 'demo-admin-id-001',
    name: 'Admin User',
    email: 'admin@expertlink.com',
    passwordHash: defaultPasswordHash,
    role: 'ADMIN' as const
  };

  // 2. Demo Client
  const demoClient = {
    id: 'demo-client-id-001',
    name: 'Sarah Connor (Acme Capital)',
    email: 'client@expertlink.com',
    passwordHash: defaultPasswordHash,
    role: 'CLIENT' as const
  };

  // 3. Demo Expert
  const demoExpert = {
    id: 'demo-expert-id-001',
    name: 'Dr. Alan Turing',
    email: 'expert@expertlink.com',
    passwordHash: defaultPasswordHash,
    role: 'EXPERT' as const
  };

  try {
    await prisma.user.upsert({
      where: { email: adminUser.email },
      update: {},
      create: adminUser
    });
    await prisma.user.upsert({
      where: { email: demoClient.email },
      update: {},
      create: demoClient
    });
    await prisma.user.upsert({
      where: { email: demoExpert.email },
      update: {},
      create: demoExpert
    });
    logger.info('Demo users upserted successfully in PostgreSQL');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'PostgreSQL user upsert deferred');
  }

  // Seed demo expert profile in MongoDB
  const demoIndustry = 'Artificial Intelligence';
  const demoSkills = ['Large Language Models', 'Transformers', 'RLHF', 'Fine-tuning'];
  const demoVector = generateDeterministicVector(`${demoExpert.name} ${demoIndustry} ${demoSkills.join(' ')}`);

  try {
    await MongoExpertProfile.findOneAndUpdate(
      { userId: demoExpert.id },
      {
        userId: demoExpert.id,
        name: demoExpert.name,
        email: demoExpert.email,
        headline: 'Principal AI Scientist & LLM Architect',
        bio: 'Over 15 years pioneering deep learning architectures, foundational LLM pretraining, and reinforcement learning alignment at top research labs.',
        industries: [demoIndustry, 'Cloud Infrastructure'],
        skills: demoSkills,
        yearsExperience: 16,
        pastEngagements: [
          { topic: 'LLM Reasoning & Agent Architectures', company: 'Google DeepMind', year: 2024 },
          { topic: 'Large Scale Transformer Training', company: 'OpenAI Advisory', year: 2023 }
        ],
        hourlyRateUsd: 550,
        availability: ['2026-10-12T14:00:00Z', '2026-10-13T16:00:00Z', '2026-10-15T18:00:00Z'],
        embedding: demoVector,
        rating: 4.95
      },
      { upsert: true, new: true }
    );
    logger.info('Demo expert profile upserted in MongoDB');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'MongoDB demo expert profile upsert deferred');
  }

  // 4. Seed 50 Clients
  logger.info('Seeding 50 client accounts...');
  const clientIds: string[] = [demoClient.id];
  for (let i = 1; i <= 49; i++) {
    const clientId = `client-user-seed-${i.toString().padStart(3, '0')}`;
    clientIds.push(clientId);
    try {
      await prisma.user.upsert({
        where: { email: `client${i}@hedgefund-partner.com` },
        update: {},
        create: {
          id: clientId,
          name: `Investment Partner ${i}`,
          email: `client${i}@hedgefund-partner.com`,
          passwordHash: defaultPasswordHash,
          role: 'CLIENT'
        }
      });
    } catch (_) {}
  }

  // 5. Seed 200 Experts
  logger.info('Seeding 200 expert profiles in Postgres and MongoDB...');
  const expertIds: string[] = [demoExpert.id];
  for (let i = 1; i <= 199; i++) {
    const expertId = `expert-user-seed-${i.toString().padStart(3, '0')}`;
    expertIds.push(expertId);
    const ind = INDUSTRIES[i % INDUSTRIES.length];
    const skills = SKILLS_MAP[ind] || ['Consulting', 'Technical Strategy'];
    const chosenSkills = skills.slice(0, 3 + (i % 3));
    const name = `Expert Advisor ${i}`;
    const email = `expert${i}@expertnetwork.org`;
    const headline = `Senior Advisor in ${ind}`;
    const bio = `Experienced practitioner and consultant specializing in ${ind} and ${chosenSkills.join(', ')} with high impact across enterprise transformations.`;
    const embedding = generateDeterministicVector(`${name} ${ind} ${chosenSkills.join(' ')}`);

    try {
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          id: expertId,
          name,
          email,
          passwordHash: defaultPasswordHash,
          role: 'EXPERT'
        }
      });
    } catch (_) {}

    try {
      await MongoExpertProfile.findOneAndUpdate(
        { userId: expertId },
        {
          userId: expertId,
          name,
          email,
          headline,
          bio,
          industries: [ind],
          skills: chosenSkills,
          yearsExperience: 5 + (i % 25),
          pastEngagements: [
            { topic: `Enterprise ${chosenSkills[0]} Evaluation`, company: `Global Firm ${i}`, year: 2023 }
          ],
          hourlyRateUsd: 200 + (i % 12) * 50,
          availability: ['2026-10-14T10:00:00Z', '2026-10-15T14:00:00Z'],
          embedding,
          rating: Number((4.0 + (i % 10) * 0.1).toFixed(2))
        },
        { upsert: true }
      );
    } catch (_) {}
  }

  // 6. Seed Queries (100 in standard mode, 200k in large mode)
  const numQueries = isLarge ? 200000 : 100;
  logger.info(`Seeding ${numQueries} client queries...`);

  const batchSize = 1000;
  let seeded = 0;

  while (seeded < numQueries) {
    const currentBatch = Math.min(batchSize, numQueries - seeded);
    const queriesData = [];

    for (let j = 0; j < currentBatch; j++) {
      const qIndex = seeded + j;
      const cId = clientIds[qIndex % clientIds.length];
      const ind = INDUSTRIES[qIndex % INDUSTRIES.length];
      const skills = SKILLS_MAP[ind];
      const s = skills[qIndex % skills.length];
      queriesData.push({
        id: `query-seed-${qIndex.toString().padStart(6, '0')}`,
        clientId: cId,
        title: `Commercial and Technical Assessment of ${s} in ${ind}`,
        description: `We are conducting due diligence on market adoption, competitive barriers, unit economics, and architectural trade-offs for ${s} implementations in ${ind}.`,
        industry: ind,
        budgetUsd: 1500 + (qIndex % 10) * 500,
        status: (qIndex % 3 === 0 ? 'MATCHED' : qIndex % 3 === 1 ? 'OPEN' : 'CLOSED') as any
      });
    }

    try {
      await prisma.query.createMany({
        data: queriesData,
        skipDuplicates: true
      });
    } catch (_) {}

    seeded += currentBatch;
    if (seeded % 25000 === 0 || seeded === numQueries) {
      logger.info(`Seeded ${seeded} / ${numQueries} queries...`);
    }
  }

  logger.info('🎉 Seed completed successfully!');
  logger.info('--------------------------------------------------');
  logger.info('Demo Logins:');
  logger.info('  CLIENT: client@expertlink.com  / Password123!');
  logger.info('  EXPERT: expert@expertlink.com  / Password123!');
  logger.info('  ADMIN:  admin@expertlink.com   / Password123!');
  logger.info('--------------------------------------------------');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

runSeed().catch((err) => {
  logger.error({ err }, 'Seed execution failed');
  process.exit(1);
});
