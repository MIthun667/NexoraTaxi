import { PrismaClient } from '@prisma/client';

import { DEVELOPMENT_PASSWORD_HASH } from '../../../prisma/seed/catalog';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      passwordHash: DEVELOPMENT_PASSWORD_HASH,
    },
  });

  process.stdout.write(
    `Standardized development password hash for ${result.count} users.\n`,
  );
  process.stdout.write(
    'Development login: admin@northstar-universal.demo / Nexora@123\n',
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
