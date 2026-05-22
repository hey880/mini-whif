import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Global Prisma client for tests
export const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterEach(async () => {
  // Clean up test data after each test if needed
  // This can be customized per test
});

afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});
