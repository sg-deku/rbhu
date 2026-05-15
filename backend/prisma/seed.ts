import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rbhu.ai' },
    update: {},
    create: {
      email: 'admin@rbhu.ai',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Also create a literal "admin" email if the user prefers that
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: {},
    create: {
      email: 'admin',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Seeding successful:', { 
    id: admin.id, 
    email: admin.email,
    role: admin.role 
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
